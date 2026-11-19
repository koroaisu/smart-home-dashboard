const encoder = new TextEncoder();
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function switchBotHeaders(token, secret, { timestamp = Date.now(), nonce = crypto.randomUUID() } = {}) {
  const t = String(timestamp);
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(token + t + nonce)));
  return { Authorization: token, t, nonce, sign: btoa(String.fromCharCode(...signature)), 'Content-Type': 'application/json' };
}

export const colorTemperatures = { warm: 2700, neutral: 5000, cool: 6500 };

function bindings(env) {
  try {
    const ids = JSON.parse(env.SWITCHBOT_DEVICE_MAP || '{}').ceiling;
    if (!Array.isArray(ids) || !ids.length || ids.length > 8 || ids.some(id => typeof id !== 'string' || !/^[A-Fa-f0-9]{12}$/.test(id))) return {};
    return { ceiling: [...new Set(ids)] };
  } catch { return {}; }
}

export function bulbCommand(action, value) {
  if (action === 'power' && typeof value === 'boolean') return { command: value ? 'turnOn' : 'turnOff', parameter: 'default', commandType: 'command' };
  if (action === 'brightness' && Number.isInteger(value) && value >= 1 && value <= 100) return { command: 'setBrightness', parameter: String(value), commandType: 'command' };
  if (action === 'temperature' && typeof value === 'string' && Object.hasOwn(colorTemperatures, value)) return { command: 'setColorTemperature', parameter: String(colorTemperatures[value]), commandType: 'command' };
  return null;
}

async function callSwitchBot(path, env, fetchImpl, command) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const headers = await switchBotHeaders(env.SWITCHBOT_TOKEN.trim(), env.SWITCHBOT_SECRET.trim());
    const response = await fetchImpl('https://api.switch-bot.com/v1.1' + path, {
      // Workers supports only follow/manual. Reject non-2xx below without
      // following redirects, so credentials never reach another destination.
      headers, signal: controller.signal, redirect: 'manual',
      ...(command ? { method: 'POST', body: JSON.stringify(command) } : {}),
    });
    if (!response.ok) throw Error('upstream_error');
    const data = await response.json();
    if (data.statusCode !== 100) throw Error('upstream_error');
    return data.body;
  } finally { clearTimeout(timeout); }
}

export function aggregateBulbs(bulbs) {
  const available = bulbs.filter(b => typeof b.on === 'boolean');
  const values = available.map(b => b.brightness).filter(Number.isFinite);
  const temperatures = available.map(b => b.colorTemperature).filter(Number.isFinite);
  return {
    count: bulbs.length, available: available.length,
    on: available.length ? available.some(b => b.on) : null,
    brightness: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    colorTemperature: temperatures.length && temperatures.every(value => value === temperatures[0]) ? temperatures[0] : null,
    mixed: available.length > 1 && available.some(b => b.on !== available[0].on || b.brightness !== available[0].brightness || b.colorTemperature !== available[0].colorTemperature),
  };
}

async function readCommandBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('empty');
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1024) { await reader.cancel(); throw Error('too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Called only after the Worker verifies Cloudflare Access, or on the loopback dev server. */
export async function handleSwitchBotRequest(request, env, { fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/switchbot/')) return null;
  const origin = request.headers.get('Origin');
  if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: '同じサイトから接続してください。' }, 403);
  const commandRoute = url.pathname === '/api/switchbot/commands';
  if (request.method !== (commandRoute ? 'POST' : 'GET')) return json({ error: 'Method not allowed' }, 405);
  if (commandRoute && (origin !== url.origin || request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')) return json({ error: '操作の送信元を確認できませんでした。' }, 403);
  const configured = Boolean(env.SWITCHBOT_TOKEN?.trim() && env.SWITCHBOT_SECRET?.trim());
  const groups = bindings(env);
  if (url.pathname === '/api/switchbot/status') return json({ configured, bindings: Object.fromEntries(Object.entries(groups).map(([id, ids]) => [id, { count: ids.length }])) });
  if (!['/api/switchbot/devices', '/api/switchbot/state', '/api/switchbot/commands'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
  if (!configured) return json({ error: 'SwitchBotの認証設定が必要です。', code: 'not_configured' }, 503);
  if (commandRoute) {
    let body;
    try { body = await readCommandBody(request); } catch { return json({ error: '操作内容を確認してください。' }, 400); }
    const ids = typeof body?.device === 'string' && Object.hasOwn(groups, body.device) ? groups[body.device] : null;
    const command = bulbCommand(body?.action, body?.value);
    if (!ids || !command) return json({ error: '未接続の機器または未対応の操作です。' }, 400);
    // Each lamp may fail independently. Do not retry physical actions automatically.
    const results = await Promise.allSettled(ids.map(id => callSwitchBot(`/devices/${id}/commands`, env, fetchImpl, command)));
    const accepted = results.filter(result => result.status === 'fulfilled').length;
    return json({ accepted, total: ids.length, complete: accepted === ids.length,
      ...(accepted < ids.length ? { error: `${ids.length - accepted}個の操作結果を確認できません。状態を更新してください。` } : {}),
    }, accepted === ids.length ? 200 : 502);
  }
  try {
    if (url.pathname === '/api/switchbot/state') {
      const devices = {};
      for (const [group, ids] of Object.entries(groups)) {
        const bulbs = await Promise.all(ids.map(async id => {
          try {
            const state = await callSwitchBot(`/devices/${id}/status`, env, fetchImpl);
            if (state?.deviceType !== 'Color Bulb' || !['on', 'off'].includes(state.power?.toLowerCase())) throw Error('invalid_status');
            return { on: state.power.toLowerCase() === 'on', brightness: Number.isInteger(state.brightness) && state.brightness >= 1 && state.brightness <= 100 ? state.brightness : null,
              colorTemperature: Number.isInteger(state.colorTemperature) && state.colorTemperature >= 2700 && state.colorTemperature <= 6500 ? state.colorTemperature : null };
          } catch { return { on: null }; }
        }));
        devices[group] = aggregateBulbs(bulbs);
      }
      return json({ devices, checkedAt: new Date().toISOString() });
    }
    const data = await callSwitchBot('/devices', env, fetchImpl);
    if (!Array.isArray(data?.deviceList) || !Array.isArray(data?.infraredRemoteList)) throw Error('invalid_inventory');
    // Whitelist the inventory fields: never forward upstream errors, headers, or credentials.
    const devices = [
      ...data.deviceList.map(device => ({ id: device.deviceId, name: device.deviceName, type: device.deviceType, kind: 'physical', cloudEnabled: device.enableCloudService === true })),
      ...data.infraredRemoteList.map(device => ({ id: device.deviceId, name: device.deviceName, type: device.remoteType, kind: 'infrared' })),
    ];
    return json({ devices });
  } catch { return json({ error: 'SwitchBotに接続できませんでした。時間をおいて再度お試しください。', code: 'connection_failed' }, 502); }
}
