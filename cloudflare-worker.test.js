import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { createAccessVerifier } from './cloudflare-access.mjs';
import { createCloudflareWorker } from './cloudflare-worker.mjs';

const issuer = 'https://sekhmet-test.cloudflareaccess.com';
const audience = 'test-application-audience-1234567890';
const env = { CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: audience, CALENDAR_OWNER_EMAIL: 'owner@example.com' };
const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'fixture-key', alg: 'RS256' };
const verify = createAccessVerifier({ jwksFactory(url) {
  assert.equal(url.href, `${issuer}/cdn-cgi/access/certs`);
  return createLocalJWKSet({ keys: [jwk] });
} });
async function token({ email = env.CALENDAR_OWNER_EMAIL, aud = audience, iss = issuer, exp = '1h', type = 'app' } = {}) {
  return new SignJWT({ email, type }).setProtectedHeader({ alg: 'RS256', kid: 'fixture-key' })
    .setIssuedAt().setExpirationTime(exp).setSubject('fixture-owner').setIssuer(iss).setAudience(aud).sign(privateKey);
}
const request = (path = '/', jwt) => new Request('https://dashboard.example.com' + path, { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });

test('Cloudflare entry fails closed before Access is configured, including assets and Google APIs', async () => {
  let assets = 0, calendars = 0;
  const worker = createCloudflareWorker({ calendar: async () => { calendars++; } });
  for (const path of ['/', '/assets/fonts/DotGothic16-Regular.ttf', '/api/calendar/status']) {
    const response = await worker.fetch(request(path), { ASSETS: { fetch() { assets++; } } });
    assert.equal(response.status, 503);
  }
  assert.equal(assets, 0); assert.equal(calendars, 0);
});
test('a verified owner identity can read assets without altering their bytes', async () => {
  const jwt = await token();
  const worker = createCloudflareWorker({ verify });
  const bytes = new Uint8Array([0, 127, 128, 255]);
  const response = await worker.fetch(request('/assets/fonts/test.ttf', jwt), {
    ...env, ASSETS: { fetch: async () => new Response(bytes, { headers: { 'Content-Type': 'font/ttf' } }) },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('cache-control'), 'private, no-cache');
});
test('forged email headers and unsigned assertions cannot grant access', async () => {
  const fake = new Request('https://dashboard.example.com', { headers: { 'Cf-Access-Authenticated-User-Email': env.CALENDAR_OWNER_EMAIL, 'Cf-Access-Jwt-Assertion': 'eyJhbGciOiJub25lIn0.e30.' } });
  assert.equal((await verify(fake, env)).ok, false);
  assert.equal((await verify(request(), env)).status, 401);
});
test('the root resolves to the native dashboard index without an HTML redirect', async () => {
  const worker = createCloudflareWorker({ verify });
  const response = await worker.fetch(request('/', await token()), {
    ...env, ASSETS: { fetch: async assetRequest => {
      assert.equal(new URL(assetRequest.url).pathname, '/index.html');
      return new Response('<h1>カレンダー</h1>', { headers: { 'Content-Type': 'text/html' } });
    } },
  });
  assert.equal(await response.text(), '<h1>カレンダー</h1>');
});
test('signature, expiration, issuer, audience, token type and owner are enforced', async () => {
  for (const options of [{ email: 'other@example.com' }, { aud: 'other-audience' }, { iss: 'https://other.cloudflareaccess.com' }, { exp: '0s' }, { type: 'org' }]) {
    assert.equal((await verify(request('/', await token(options)), env)).ok, false);
  }
  const jwt = await token();
  const [header, payload, signature] = jwt.split('.');
  const tampered = `${header}.${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  assert.equal((await verify(request('/', tampered), env)).ok, false);
});
test('Access-protected API routes reach calendar handler, unknown APIs do not become HTML', async () => {
  const worker = createCloudflareWorker({ verify });
  const jwt = await token();
  const status = await worker.fetch(request('/api/calendar/status', jwt), env);
  assert.equal(status.status, 200); assert.equal((await status.json()).configured, false);
  const missing = await worker.fetch(request('/api/unknown', jwt), env);
  assert.equal(missing.status, 404);
});
