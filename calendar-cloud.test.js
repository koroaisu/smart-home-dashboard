import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCalendarRequest } from './calendar-cloud.mjs';

const origin = 'https://calendar.example.com';
const env = { CALENDAR_PUBLIC_ORIGIN: origin, GOOGLE_CLIENT_ID: '12345-test.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'fixture-secret', CALENDAR_COOKIE_KEY: Buffer.alloc(32, 7).toString('base64url') };
const scopes = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly';
const request = (path, options = {}) => new Request(origin + path, options);
function response(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
async function login({ expired = false } = {}) {
  const start = await handleCalendarRequest(request('/api/calendar/connect'), env);
  const authUrl = new URL(start.headers.get('Location'));
  const flow = start.headers.getSetCookie()[0].split(';')[0];
  let exchange;
  const callback = await handleCalendarRequest(request('/api/calendar/callback?' + new URLSearchParams({ code: 'fixture-code', state: authUrl.searchParams.get('state') }), { headers: { cookie: flow } }), env, { fetchImpl: async (url, init) => {
    exchange = new URLSearchParams(init.body);
    return response({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: expired ? 0 : 3600, scope: scopes });
  } });
  return { start, authUrl, callback, exchange, session: callback.headers.getSetCookie().find(c => c.startsWith('__Host-sekhmet-calendar=')).split(';')[0] };
}
const input = { rangeStart: '2026-11-01', rangeEnd: '2026-12-01', timeZone: 'Asia/Tokyo' };
const read = (session, body = input, headers = {}) => request('/api/calendar/read', { method: 'POST', headers: { origin, cookie: session, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('an unconfigured installation reports setup without requesting Google', async () => {
  const res = await handleCalendarRequest(request('/api/calendar/status'), {});
  assert.deepEqual(await res.json(), { configured: false, connected: false, mode: 'cloud' });
  assert.equal((await handleCalendarRequest(request('/api/calendar/connect'), {})).status, 503);
});
test('OAuth uses state, PKCE, offline read-only scopes and encrypted HttpOnly cookies', async () => {
  const { start, authUrl, callback, exchange, session } = await login();
  assert.equal(authUrl.origin, 'https://accounts.google.com');
  assert.equal(authUrl.searchParams.get('access_type'), 'offline');
  assert.equal(authUrl.searchParams.get('scope'), scopes);
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(exchange.get('code_verifier')))).toString('base64url');
  assert.equal(digest, authUrl.searchParams.get('code_challenge'));
  assert(start.headers.get('set-cookie').includes('HttpOnly; Secure; SameSite=Lax'));
  assert(!session.includes('fixture-access') && !session.includes('fixture-refresh'));
  assert.equal(callback.headers.get('location'), origin + '/figma.html#calendar');
  const state = await handleCalendarRequest(request('/api/calendar/status', { headers: { cookie: session } }), env);
  assert.equal((await state.json()).connected, true);
});
test('callbacks reject missing state and cannot exchange codes without a matching flow', async () => {
  let called = false;
  const res = await handleCalendarRequest(request('/api/calendar/callback?code=evil&state=evil'), env, { fetchImpl: async () => { called = true; } });
  assert.equal(res.status, 400); assert.equal(called, false);
});
test('cross-origin reads and tampered session cookies are rejected before fetching data', async () => {
  const { session } = await login();
  assert.equal((await handleCalendarRequest(read(session, input, { origin: 'https://untrusted.example' }), env)).status, 403);
  assert.equal((await handleCalendarRequest(read(session.replace(/=./, value => value === '=A' ? '=B' : '=A')), env)).status, 401);
});
test('reads return normalized events and metadata without provider tokens', async () => {
  const { session } = await login();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if(String(url).endsWith('/colors'))return response({event:{2:{background:'#112233',foreground:'#ffffff'}}});
    if(String(url).includes('calendarList'))return response({items:[{id:'primary-id',summary:'テスト用',primary:true,accessRole:'owner',backgroundColor:'#abcdef'}]});
    return response({items:[{id:'event',summary:'テスト予定',colorId:'2',start:{date:'2026-11-10'},end:{date:'2026-11-11'}}]});
  };
  const res = await handleCalendarRequest(read(session), env, { fetchImpl });
  const text = await res.text(), data = JSON.parse(text);
  assert.equal(res.status, 200); assert.equal(data.events[0].title, 'テスト予定');
  assert.equal(data.events[0].date, '2026-11-10'); assert.equal(data.events[0].allDay, true);
  assert(!text.includes('fixture-access') && !text.includes('fixture-refresh'));
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal(data.events[0].color,'#112233');
  assert(calls.some(call=>call.url.includes('singleEvents=true')));
});
test('expired access tokens refresh in the cloud without browser reconnection', async () => {
  const { session } = await login({ expired: true });
  let refreshed = false;
  const fetchImpl = async (url, init) => {
    if (String(url).endsWith('/token')) { const body = new URLSearchParams(init.body); assert.equal(body.get('grant_type'), 'refresh_token'); assert.equal(body.get('refresh_token'), 'fixture-refresh'); refreshed = true; return response({ access_token: 'new-access', expires_in: 3600 }); }
    assert.equal(init.headers.Authorization, 'Bearer new-access');
    return response({ items: String(url).includes('calendarList') ? [{ id: 'primary-id', summary: 'テスト', primary: true, accessRole: 'owner' }] : [] });
  };
  assert.equal((await handleCalendarRequest(read(session), env, { fetchImpl })).status, 200);
  assert(refreshed);
});
test('transient refresh failures preserve the session; revoked grants ask for reconnect', async () => {
  const { session } = await login({ expired: true });
  const temporary = await handleCalendarRequest(read(session), env, { fetchImpl: async () => response({ error: 'server_error' }, 503) });
  assert.equal(temporary.status, 502); assert.equal(temporary.headers.get('set-cookie'), null);
  const revoked = await handleCalendarRequest(read(session), env, { fetchImpl: async () => response({ error: 'invalid_grant' }, 400) });
  assert.equal(revoked.status, 401); assert(revoked.headers.get('set-cookie').includes('Max-Age=0'));
});
test('invalid ranges and bodies do not reach Google', async () => {
  const { session } = await login();
  const fetchImpl = async () => { throw Error('should not run'); };
  for (const body of [null, [], { ...input, rangeEnd: '2027-12-01' }, { ...input, calendarIds: Array(9).fill('id') }, { ...input, timeZone: 'invalid' }]) assert.equal((await handleCalendarRequest(read(session, body), env, { fetchImpl })).status, 400);
});
