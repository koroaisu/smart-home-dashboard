import test from 'node:test';
import assert from 'node:assert/strict';
import { createCalendarClient, calendarWindows } from './calendar-client.js';

const reply = (body, status = 200) => new Response(JSON.stringify(body), { status });
const event = { id: 'g:1', source: 'google', date: '2026-11-14', time: '10:00', title: 'サンプル', calendarName: 'テスト' };
const payload = { calendars: [{ id: 'calendar', name: 'テスト', primary: true }], selectedIds: ['calendar'], events: [event], updatedAt: '2026-11-14T01:00:00Z' };
test('month windows are Monday-first, include six weeks and keep upcoming separate', () => {
  const windows = calendarWindows(2026, 10, new Date(2026, 10, 14, 12));
  assert.deepEqual(windows, [{ rangeStart: '2026-10-26', rangeEnd: '2026-12-07' }, { rangeStart: '2026-11-14', rangeEnd: '2026-12-15' }]);
});
test('client merges overlapping windows once and retains explicitly stale data on failure', async () => {
  let fail = false;
  const client = createCalendarClient({ fetchImpl: async url => url.endsWith('/status') ? reply({ configured: true, connected: true }) : fail ? reply({ error: '通信に失敗しました。' }, 502) : reply(payload) });
  await client.init(); assert.equal(client.events.length, 1); assert.equal(client.status, 'ready');
  fail = true; await client.refresh();
  assert.equal(client.status, 'stale'); assert.equal(client.events[0].title, 'サンプル'); assert.equal(client.message, '通信に失敗しました。');
});
test('revoked authorization changes connection state without treating old data as current', async () => {
  let revoked = false;
  const client = createCalendarClient({ fetchImpl: async url => url.endsWith('/status') ? reply({ configured: true, connected: true }) : revoked ? reply({ error: '再接続してください。', code: 'connect_required' }, 401) : reply(payload) });
  await client.init(); revoked = true; await client.refresh();
  assert.equal(client.connected, false); assert.equal(client.status, 'stale');
});
test('newer refresh results win when an older request ignores cancellation', async () => {
  let delay = false;
  const pending = [];
  const client = createCalendarClient({ fetchImpl: async url => {
    if (url.endsWith('/status')) return reply({ configured: true, connected: true });
    if (!delay) return reply(payload);
    return new Promise(resolve => pending.push(resolve));
  } });
  await client.init(); delay = true;
  const old = client.refresh(); const recent = client.refresh();
  pending[2](reply({ ...payload, events: [{ ...event, title: '新しい結果' }] }));
  pending[3](reply({ ...payload, events: [{ ...event, title: '新しい結果' }] }));
  await recent;
  pending[0](reply(payload)); pending[1](reply(payload)); await old;
  assert.equal(client.events[0].title, '新しい結果');
});
test('disconnect clears imported data while leaving the local task store outside the client', async () => {
  const client = createCalendarClient({ fetchImpl: async url => url.endsWith('/status') ? reply({ configured: true, connected: true }) : url.endsWith('/disconnect') ? reply({ disconnected: true, revoked: true }) : reply(payload) });
  await client.init(); await client.disconnect();
  assert.equal(client.events.length, 0); assert.equal(client.connected, false); assert.equal(client.status, 'disconnected');
});
test('reference previews never request Google status or data', async () => {
  let requests = 0;
  const client = createCalendarClient({ disabled: true, fetchImpl: async () => { requests++; throw Error(); } });
  await client.init(); await client.refresh(); assert.equal(requests, 0);
});
