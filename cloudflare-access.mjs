import { createRemoteJWKSet, jwtVerify } from 'jose';

function settings(env) {
  try {
    const domain = new URL(env.CF_ACCESS_TEAM_DOMAIN);
    if (domain.protocol !== 'https:' || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain.hostname) ||
        domain.port || domain.pathname !== '/' || domain.search || domain.hash || domain.username || domain.password ||
        !/^[a-zA-Z0-9_-]{16,128}$/.test(env.CF_ACCESS_AUD || '') ||
        typeof env.CALENDAR_OWNER_EMAIL !== 'string' || !env.CALENDAR_OWNER_EMAIL.includes('@')) return null;
    return { issuer: domain.origin, audience: env.CF_ACCESS_AUD, owner: env.CALENDAR_OWNER_EMAIL.trim().toLowerCase() };
  } catch { return null; }
}

/** Validate signatures as well as claims; a caller-supplied email header is not identity. */
export function createAccessVerifier({ jwksFactory = url => createRemoteJWKSet(url) } = {}) {
  const keys = new Map();
  return async (request, env) => {
    const config = settings(env);
    if (!config) return { ok: false, status: 503, error: 'アクセス設定が未完了です。' };
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token || token.length > 16_384) return { ok: false, status: 401, error: 'Cloudflare Accessでログインしてください。' };
    try {
      if (!keys.has(config.issuer)) {
        if (keys.size >= 4) keys.delete(keys.keys().next().value);
        keys.set(config.issuer, jwksFactory(new URL(`${config.issuer}/cdn-cgi/access/certs`)));
      }
      const { payload } = await jwtVerify(token, keys.get(config.issuer), {
        issuer: config.issuer, audience: config.audience, algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'sub', 'email'],
      });
      if (payload.type !== 'app' || typeof payload.email !== 'string' || payload.email.toLowerCase() !== config.owner) {
        return { ok: false, status: 403, error: 'このアカウントでは閲覧できません。' };
      }
      return { ok: true };
    } catch { return { ok: false, status: 401, error: 'Cloudflare Accessへ再ログインしてください。' }; }
  };
}

export const verifyCloudflareAccess = createAccessVerifier();
