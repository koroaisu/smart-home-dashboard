import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwitchBotClient } from './switchbot-client.js';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const group = { count: 4, available: 4, on: true, brightness: 75, colorTemperature: 2700, mixed: false };
function fixture(fetchCommands = async () => Response.json({ accepted: 4, total: 4, complete: true })) {
  const calls = [], notices = [];
  const client = createSwitchBotClient({ documentRef: new EventTarget(), onChange() {}, notify: text => notices.push(text), fetcher: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/status')) return Response.json({ configured: true, bindings: { ceiling: { count: 4 } } });
    if (url.endsWith('/state')) return Response.json({ devices: { ceiling: { ...group } } });
    return fetchCommands(options);
  } });
  return { client, calls, notices };
}

test('initial state read never sends an operation, rapid brightness changes send only the final value', async () => {
  const { client, calls } = fixture();
  try {
    await client.refresh();
    assert.equal(client.model.phase, 'ready');
    assert.ok(calls.every(call => call.options.method === 'GET'));
    client.send('brightness', 30); client.send('brightness', 40); client.send('brightness', 50);
    await sleep(450);
    const commands = calls.filter(call => call.options.method === 'POST');
    assert.equal(commands.length, 1);
    assert.equal(JSON.parse(commands[0].options.body).value, 50);
    assert.equal(client.model.phase, 'sent', 'acceptance remains unconfirmed until a state read');
  } finally { client.dispose(); }
});

test('commands run serially while preserving the latest setting queued during a request', async () => {
  let release;
  const { client, calls } = fixture(() => new Promise(resolve => { release = () => resolve(Response.json({ complete: true })); }));
  try {
    await client.refresh();
    client.send('power', true);
    await sleep(10);
    client.send('brightness', 35); client.send('brightness', 45);
    release(); await sleep(10);
    const commands = calls.filter(call => call.options.method === 'POST');
    assert.equal(commands.length, 2);
    assert.equal(JSON.parse(commands[1].options.body).value, 45);
    release(); await sleep(10);
    assert.equal(client.model.busy, false);
  } finally { client.dispose(); }
});

test('failed operations do not automatically retry or report success', async () => {
  const { client, calls, notices } = fixture(async () => Response.json({ error: '1個の状態を確認してください。' }, { status: 502 }));
  try {
    await client.refresh(); client.send('power', false); await sleep(20);
    assert.equal(client.model.phase, 'error');
    assert.equal(notices.length, 1);
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
  } finally { client.dispose(); }
});

test('reference mode neither fetches nor sends commands', async () => {
  let calls = 0;
  const client = createSwitchBotClient({ disabled: true, documentRef: new EventTarget(), onChange() {}, notify() {}, fetcher: () => { calls++; } });
  try { client.start(); await client.refresh(); client.send('power', true); await sleep(5); assert.equal(calls, 0); }
  finally { client.dispose(); }
});
