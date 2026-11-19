import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { switchBotHeaders, handleSwitchBotRequest, aggregateBulbs, bulbCommand } from './switchbot-cloud.mjs';
import { createCloudflareWorker } from './cloudflare-worker.mjs';

const env = { SWITCHBOT_TOKEN: 'fixture-token', SWITCHBOT_SECRET: 'fixture-secret' };
const request = (path = 'devices', options) => new Request('https://dashboard.example.com/api/switchbot/' + path, options);

test('SwitchBot v1.1 signs token + timestamp + nonce as Base64 HMAC SHA256', async () => {
  const headers = await switchBotHeaders(env.SWITCHBOT_TOKEN, env.SWITCHBOT_SECRET, { timestamp: 1700000000000, nonce: 'fixture-nonce' });
  assert.equal(headers.sign, createHmac('sha256', env.SWITCHBOT_SECRET).update('fixture-token1700000000000fixture-nonce').digest('base64'));
  assert.equal(headers.Authorization, env.SWITCHBOT_TOKEN);
});
test('unconfigured, cross-origin and command requests never contact SwitchBot', async () => {
  const fetchImpl = () => { throw Error('Unexpected upstream request'); };
  assert.equal((await handleSwitchBotRequest(request(), {}, { fetchImpl })).status, 503);
  assert.equal((await handleSwitchBotRequest(request('devices', { headers: { Origin: 'https://other.example' } }), env, { fetchImpl })).status, 403);
  assert.equal((await handleSwitchBotRequest(request('devices', { method: 'POST' }), env, { fetchImpl })).status, 405);
  assert.deepEqual(await (await handleSwitchBotRequest(request('status'), env, { fetchImpl })).json(), { configured: true, bindings: {} });
});

const mapped = { ...env, SWITCHBOT_DEVICE_MAP: JSON.stringify({ ceiling: ['001122334455', '001122334466', '001122334477', '001122334488'] }) };
const commandRequest = body => request('commands', { method: 'POST', headers: { Origin: 'https://dashboard.example.com', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('bulb commands reject out-of-range values, arbitrary ids, and non JSON/same origin writes', async () => {
  const fetchImpl = () => { throw Error('Unexpected command'); };
  for (const body of [{ device: 'floor', action: 'power', value: true }, { device: '__proto__', action: 'power', value: true }, { device: 'ceiling', action: 'brightness', value: 0 }, { device: 'ceiling', action: 'brightness', value: 101 }, { device: 'ceiling', action: 'temperature', value: 'invalid' }]) {
    assert.equal((await handleSwitchBotRequest(commandRequest(body), mapped, { fetchImpl })).status, 400);
  }
  assert.equal((await handleSwitchBotRequest(request('commands', { method: 'POST', body: '{}' }), mapped, { fetchImpl })).status, 403);
  assert.equal((await handleSwitchBotRequest(commandRequest({ padding: 'x'.repeat(2048) }), mapped, { fetchImpl })).status, 400);
  assert.equal(bulbCommand('power', 'false'), null);
  assert.equal(bulbCommand('brightness', 2.5), null);
});

test('one ceiling operation addresses exactly four mapped bulbs and reports partial failure without retries', async () => {
  const calls = [];
  const response = await handleSwitchBotRequest(commandRequest({ device: 'ceiling', action: 'brightness', value: 42 }), mapped, { fetchImpl: async (url, options) => {
    calls.push(url);
    assert.deepEqual(JSON.parse(options.body), { command: 'setBrightness', parameter: '42', commandType: 'command' });
    return Response.json({ statusCode: url.includes('001122334488') ? 161 : 100, body: {} });
  } });
  assert.equal(calls.length, 4);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { accepted: 3, total: 4, complete: false, error: '1個の操作結果を確認できません。状態を更新してください。' });
});

test('group state distinguishes mixed values, zero brightness, and unavailable bulbs', async () => {
  const response = await handleSwitchBotRequest(request('state'), mapped, { fetchImpl: async url => {
    if (url.includes('001122334488')) throw Error('Offline');
    return Response.json({ statusCode: 100, body: { deviceType: 'Color Bulb', power: url.includes('001122334455') ? 'off' : 'on', brightness: 60, colorTemperature: 2700 } });
  } });
  const data = await response.json();
  assert.deepEqual(data.devices.ceiling, { count: 4, available: 3, on: true, brightness: 60, colorTemperature: 2700, mixed: true });
  assert.equal(aggregateBulbs([{ on: null }]).on, null);
  assert.equal(aggregateBulbs([{ on: true, brightness: null }]).brightness, null);
});
test('inventory returns physical and infrared devices without copying unrelated fields', async () => {
  const response = await handleSwitchBotRequest(request(), env, { fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.switch-bot.com/v1.1/devices');
    assert.equal(options.redirect, 'manual');
    return Response.json({ statusCode: 100, secret: 'do-not-forward', body: {
      deviceList: [{ deviceId: 'device-1', deviceName: '照明', deviceType: 'Color Bulb', enableCloudService: true }],
      infraredRemoteList: [{ deviceId: 'remote-1', deviceName: 'エアコン', remoteType: 'Air Conditioner' }],
    } });
  } });
  const data = await response.json();
  assert.equal(data.devices.length, 2);
  assert.equal(data.devices[1].kind, 'infrared');
  assert.doesNotMatch(JSON.stringify(data), /fixture-token|fixture-secret|do-not-forward/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
});
test('provider errors are sanitized and Access is checked before device discovery', async () => {
  const response = await handleSwitchBotRequest(request(), env, { fetchImpl: async () => Response.json({ statusCode: 190, message: 'fixture-token fixture-secret' }) });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /fixture-token|fixture-secret/);
  let called = false;
  const worker = createCloudflareWorker({ verify: async () => ({ ok: false, status: 403, error: 'Denied' }), switchbot: async () => { called = true; } });
  assert.equal((await worker.fetch(request(), env)).status, 403);
  assert.equal(called, false);
});

test('upstream redirects are rejected without forwarding credentials to their destination', async () => {
  let calls = 0;
  const response = await handleSwitchBotRequest(request(), env, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.switch-bot.com/v1.1/devices');
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://other.example.com' } });
  } });
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
});
