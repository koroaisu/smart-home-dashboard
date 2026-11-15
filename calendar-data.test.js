import test from 'node:test';
import assert from 'node:assert/strict';
import { googleEventRows, compareCalendarRows, readGooglePages, readGoogleEventColors, calendarEventColors } from './calendar-data.js';

const options = { calendarId: 'example', calendarName: 'テスト', rangeStart: '2026-11-01', rangeEnd: '2026-12-01', timeZone: 'Asia/Tokyo' };

test('Google event colors take priority over calendar color and reject malformed CSS values', () => {
  const event={id:'color',colorId:'3',start:{date:'2026-11-10'},end:{date:'2026-11-11'}};
  const config={...options,calendarColor:'#123456',eventColors:{3:{background:'#abcdef'}}};
  assert.equal(googleEventRows(event,config)[0].color,'#abcdef');
  assert.equal(googleEventRows({...event,colorId:undefined},config)[0].color,'#123456');
  assert.equal(googleEventRows(event,{...config,eventColors:{3:{background:'url(https://invalid.example)'}}})[0].color,'#123456');
  assert.equal(calendarEventColors('#ffffff').foreground,'#000000');
  assert.equal(calendarEventColors('#000000').foreground,'#ffffff');
  assert.equal(calendarEventColors('invalid').background,'#e6c16f');
});

test('palette fetch uses existing read authorization and can fail without hiding events', async () => {
  const colors=await readGoogleEventColors({accessToken:'fixture-token',fetchImpl:async(url,init)=>{
    assert.equal(url,'https://www.googleapis.com/calendar/v3/colors');
    assert.equal(init.headers.Authorization,'Bearer fixture-token');
    return {ok:true,json:async()=>({event:{1:{background:'#abcdef'}}})};
  }});
  assert.equal(colors[1].background,'#abcdef');
  assert.deepEqual(await readGoogleEventColors({fetchImpl:async()=>({ok:false,status:503})}),{});
  assert.deepEqual(await readGoogleEventColors({fetchImpl:async()=>{throw Error('offline');}}),{});
});
test('all-day events use exclusive ends and stay inside the requested range', () => {
  const event = { id: 'holiday', summary: '連休', start: { date: '2026-10-30' }, end: { date: '2026-11-03' } };
  const rows = googleEventRows(event, options);
  assert.deepEqual(rows.map(row => row.date), ['2026-11-01', '2026-11-02']);
  assert(rows.every(row => row.allDay && row.time === '終日' && row.source === 'google'));
  assert.notEqual(rows[0].id, rows[1].id);
});
test('timed events use display timezone and do not add a day at midnight', () => {
  const event = { id: 'night', start: { dateTime: '2026-11-10T14:00:00Z' }, end: { dateTime: '2026-11-10T15:00:00Z' } };
  const rows = googleEventRows(event, options);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, '2026-11-10');
  assert.equal(rows[0].time, '23:00');
  assert.equal(rows[0].title, '（タイトルなし）');
});
test('overnight events have continuation rows and occurrence IDs stay distinct', () => {
  const event = { id: 'trip_1', summary: '旅行', start: { dateTime: '2026-11-10T20:00:00+09:00' }, end: { dateTime: '2026-11-12T10:00:00+09:00' } };
  assert.deepEqual(googleEventRows(event, options).map(row => row.time), ['20:00', '継続', '継続']);
  assert.notEqual(googleEventRows(event, options)[0].id, googleEventRows({ ...event, id: 'trip_2' }, options)[0].id);
  assert.deepEqual(googleEventRows({ ...event, status: 'cancelled' }, options), []);
  assert.deepEqual(googleEventRows({ id: 'broken' }, options), []);
});
test('all-day rows sort before appointments while local tasks are preserved', () => {
  const local = { id: 'local', date: '2026-11-10', time: '08:00', title: '用事' };
  const allDay = { ...local, id: 'google', allDay: true, time: '終日' };
  assert.deepEqual([local, allDay].sort(compareCalendarRows).map(row => row.id), ['google', 'local']);
});
test('DST transitions use the selected timezone rather than fixed offsets', () => {
  const event = { id: 'dst', start: { dateTime: '2026-11-01T05:30:00Z' }, end: { dateTime: '2026-11-01T07:30:00Z' } };
  const rows = googleEventRows(event, { ...options, timeZone: 'America/New_York' });
  assert.equal(rows.length, 1); assert.equal(rows[0].time, '01:30'); assert.equal(rows[0].endTime, '02:30');
});
test('pagination keeps credentials in headers and retrieves every page', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => calls.length === 1 ? { items: [{ id: 'a' }], nextPageToken: 'next' } : { items: [{ id: 'b' }] } }; };
  const rows = await readGooglePages('calendars/primary/events', { accessToken: 'test-token', fetchImpl, params: { singleEvents: true } });
  assert.deepEqual(rows.map(row => row.id), ['a', 'b']);
  assert.equal(calls[1].url.searchParams.get('pageToken'), 'next');
  assert(!calls[0].url.href.includes('test-token'));
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
});
test('failed pages and auth expiry do not return incomplete or empty success', async () => {
  let count = 0;
  const fetchImpl = async () => ++count === 1 ? { ok: true, json: async () => ({ items: [{ id: 'a' }], nextPageToken: 'next' }) } : { ok: false, status: 401 };
  await assert.rejects(readGooglePages('calendars/primary/events', { accessToken: 'test-token', fetchImpl }), error => error.status === 401);
  await assert.rejects(readGooglePages('users/me/calendarList', { accessToken: 'test-token', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }));
});
