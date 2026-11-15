import { validDate } from './state.js';
import { googleEventRows, compareCalendarRows, readGooglePages, readGoogleEventColors } from './calendar-data.js';

const SESSION = '__Host-sekhmet-calendar';
const FLOW = '__Host-sekhmet-calendar-flow';
const SCOPES = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly';
const encoder = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unb64 = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const cookie = (name, value, age) => `${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
const cookies = request => Object.fromEntries((request.headers.get('cookie') || '').split(';').map(v => v.trim().split('=')));

function config(env) {
  try {
    const origin = new URL(env.CALENDAR_PUBLIC_ORIGIN);
    if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) return null;
    if (!/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID || '') || !env.GOOGLE_CLIENT_SECRET || unb64(env.CALENDAR_COOKIE_KEY || '').length !== 32) return null;
    return { origin: origin.origin, callback: `${origin.origin}/api/calendar/callback` };
  } catch { return null; }
}
async function key(env) {
  return crypto.subtle.importKey('raw', unb64(env.CALENDAR_COOKIE_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(data, env, purpose) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) }, await key(env), encoder.encode(JSON.stringify(data)));
  return `${b64(iv)}.${b64(new Uint8Array(encrypted))}`;
}
async function unseal(value, env, purpose) {
  try {
    const [iv, payload] = value.split('.');
    const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: encoder.encode(purpose) }, await key(env), unb64(payload));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return Number.isFinite(data.expires) && data.expires > Date.now() ? data : null;
  } catch { return null; }
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
function redirect(location, setCookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  for (const value of setCookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}
async function tokenRequest(body, env, fetchImpl) {
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ ...body, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const expired = data.error === 'invalid_grant';
    const error = new Error(expired ? 'Googleへの再接続が必要です。' : 'Googleの認証を更新できませんでした。');
    error.status = expired ? 401 : 502; throw error;
  }
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !Number.isFinite(Number(data.expires_in))) throw new Error('認証結果を確認できませんでした。');
  return data;
}
async function getAccess(session, env, fetchImpl) {
  if (session.accessExpires > Date.now() + 60_000) return session;
  const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: session.refresh }, env, fetchImpl);
  return { ...session, access: data.access_token, accessExpires: Date.now() + Number(data.expires_in) * 1000, refresh: data.refresh_token || session.refresh };
}

/** Portable Cloudflare Worker / Node handler. Only Google Calendar reads are exposed. */
export async function handleCalendarRequest(request, env, { fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/calendar/')) return null;
  const settings = config(env);
  if (url.pathname === '/api/calendar/status' && request.method === 'GET') {
    const session = settings && url.origin === settings.origin ? await unseal(cookies(request)[SESSION], env, SESSION) : null;
    return json({ configured: Boolean(settings), connected: Boolean(session), mode: 'cloud' });
  }
  if (!settings) return json({ error: 'Googleカレンダーの接続設定がまだ完了していません。', code: 'not_configured' }, 503);
  if (url.origin !== settings.origin) return json({ error: '接続先のURLを確認してください。' }, 403);

  if (url.pathname === '/api/calendar/connect' && request.method === 'GET') {
    const state = random(), verifier = random();
    const challenge = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: settings.callback,
      response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent',
      state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
    return redirect(auth.href, [cookie(FLOW, await seal({ state, verifier, expires: Date.now() + 600_000 }, env, FLOW), 600)]);
  }
  if (url.pathname === '/api/calendar/callback' && request.method === 'GET') {
    const flow = await unseal(cookies(request)[FLOW], env, FLOW);
    const clearFlow = cookie(FLOW, '', 0);
    if (!flow || flow.state !== url.searchParams.get('state')) return json({ error: '接続の確認に失敗しました。もう一度接続してください。' }, 400, { 'Set-Cookie': clearFlow });
    if (url.searchParams.has('error')) return redirect(`${settings.origin}/figma.html?calendar=denied#calendar`, [clearFlow]);
    const code = url.searchParams.get('code');
    if (!code || code.length > 4096) return json({ error: '認証コードを確認できませんでした。' }, 400, { 'Set-Cookie': clearFlow });
    try {
      const data = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: settings.callback, code_verifier: flow.verifier }, env, fetchImpl);
      const granted = new Set((data.scope || '').split(' '));
      if (!SCOPES.split(' ').every(scope => granted.has(scope)) || typeof data.refresh_token !== 'string') return redirect(`${settings.origin}/figma.html?calendar=permission#calendar`, [clearFlow]);
      const session = { access: data.access_token, refresh: data.refresh_token, accessExpires: Date.now() + Number(data.expires_in) * 1000, expires: Date.now() + 30 * 86_400_000 };
      return redirect(`${settings.origin}/figma.html#calendar`, [clearFlow, cookie(SESSION, await seal(session, env, SESSION), 30 * 86_400)]);
    } catch { return redirect(`${settings.origin}/figma.html?calendar=failed#calendar`, [clearFlow]); }
  }

  if (!['/api/calendar/read', '/api/calendar/disconnect'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  if (request.headers.get('origin') !== settings.origin || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'この画面から操作してください。' }, 403);
  let session = await unseal(cookies(request)[SESSION], env, SESSION);
  if (url.pathname === '/api/calendar/disconnect') {
    let revoked = true;
    if (session) try { const response = await fetchImpl('https://oauth2.googleapis.com/revoke', { method: 'POST', body: new URLSearchParams({ token: session.refresh }), signal: AbortSignal.timeout(15_000) }); revoked = response.ok; } catch { revoked = false; }
    return json({ disconnected: true, revoked }, 200, { 'Set-Cookie': cookie(SESSION, '', 0) });
  }
  if (!session) return json({ error: 'Googleカレンダーに接続してください。', code: 'connect_required' }, 401);
  let input;
  try { const text = await request.text(); if (text.length > 16_384) throw Error(); input = JSON.parse(text); } catch { return json({ error: '取得条件を確認してください。' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: '取得条件を確認してください。' }, 400);
  const { rangeStart, rangeEnd, timeZone = 'Asia/Tokyo' } = input;
  const days = (Date.parse(rangeEnd) - Date.parse(rangeStart)) / 86_400_000;
  if (!validDate(rangeStart) || !validDate(rangeEnd) || days <= 0 || days > 62 || typeof timeZone !== 'string' || timeZone.length > 64 ||
      input.calendarIds !== undefined && (!Array.isArray(input.calendarIds) || input.calendarIds.length > 8 || input.calendarIds.some(id => typeof id !== 'string' || id.length > 1024))) return json({ error: '取得期間またはカレンダーの指定を確認してください。' }, 400);
  try { new Intl.DateTimeFormat('ja-JP', { timeZone }); } catch { return json({ error: 'タイムゾーンを確認してください。' }, 400); }
  try {
    session = await getAccess(session, env, fetchImpl);
    const shared = { accessToken: session.access, fetchImpl, signal: AbortSignal.timeout(20_000) };
    const calendars = (await readGooglePages('users/me/calendarList', { ...shared, params: { maxResults: 250 } }))
      .filter(c => ['owner', 'writer', 'reader'].includes(c.accessRole))
      .map(c => ({ id: c.id, name: c.summaryOverride || c.summary || 'カレンダー', primary: Boolean(c.primary), color: /^#[0-9a-f]{6}$/i.test(c.backgroundColor) ? c.backgroundColor : '#99804e' }));
    const ids = input.calendarIds ?? calendars.filter(c => c.primary).map(c => c.id);
    if (ids.some(id => !calendars.some(c => c.id === id))) return json({ error: '選択したカレンダーを読み取れません。選択し直してください。', code: 'calendar_unavailable', calendars }, 400);
    const calendarRows = await Promise.all([...new Set(ids)].map(async calendarId => {
      const events = await readGooglePages(`calendars/${encodeURIComponent(calendarId)}/events`, { ...shared, params: {
        timeMin: new Date(Date.parse(`${rangeStart}T00:00:00Z`) - 2 * 86_400_000).toISOString(),
        timeMax: new Date(Date.parse(`${rangeEnd}T00:00:00Z`) + 2 * 86_400_000).toISOString(),
        timeZone, singleEvents: true, orderBy: 'startTime', maxResults: 2500, showDeleted: false,
      } });
      return { calendar: calendars.find(c => c.id === calendarId), events };
    }));
    const eventColors = calendarRows.some(({ events }) => events.some(event => event.colorId))
      ? await readGoogleEventColors({ ...shared, signal: AbortSignal.timeout(5_000) }) : {};
    const rows = calendarRows.flatMap(({ calendar, events }) => events.flatMap(event => googleEventRows(event, {
      calendarId: calendar.id, calendarName: calendar.name, calendarColor: calendar.color, eventColors, rangeStart, rangeEnd, timeZone,
    }))).sort(compareCalendarRows);
    session = { ...session, expires: Date.now() + 30 * 86_400_000 };
    return json({ calendars, selectedIds: ids, events: rows, updatedAt: new Date().toISOString() }, 200, { 'Set-Cookie': cookie(SESSION, await seal(session, env, SESSION), Math.max(1, Math.floor((session.expires - Date.now()) / 1000))) });
  } catch (error) {
    const expired = error.status === 401;
    return json({ error: expired ? 'Googleへの再接続が必要です。' : '予定を取得できませんでした。少し待って更新してください。', code: expired ? 'connect_required' : 'fetch_failed' }, expired ? 401 : 502, expired ? { 'Set-Cookie': cookie(SESSION, '', 0) } : {});
  }
}
