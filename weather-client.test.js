import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeatherClient, numberText, resolveLocation, weatherFor, mihamaLocation } from './weather-client.js';

const settle = () => new Promise(resolve => setTimeout(resolve, 20));
test('weather categories use supplied illustrations and retain honest snow labels', () => {
  assert.equal(weatherFor(0).condition, 'sunny');
  assert.equal(weatherFor(65).condition, 'heavy-rain');
  assert.equal(weatherFor(95).condition, 'thunderstorm');
  assert.equal(weatherFor(75).label, '雪');
  assert.equal(weatherFor(null).label, '天気不明');
  assert.equal(numberText(null), '—');
  assert.equal(numberText(0, 1), '0.0');
});
test('Fukui Mihama bypasses ambiguous city search, unknown locations are rejected', async () => {
  assert.deepEqual(await resolveLocation('福井県美浜町', () => { throw Error('Unexpected search'); }), mihamaLocation);
  await assert.rejects(resolveLocation('不存在', async () => Response.json({ results: [] })), /地域が見つかりません/);
});
test('weather survives an air failure and refreshes only on visible resume', async () => {
  const documentRef = new EventTarget();
  const changes = [];
  let calls = 0;
  const client = createWeatherClient({ documentRef, onChange: value => changes.push(value), fetcher: async url => {
    calls++;
    if (url.includes('air-quality')) return new Response('', { status: 503 });
    return Response.json({ current: { temperature_2m: 0, weather_code: 0 } });
  } });
  try {
    client.setLocation(mihamaLocation);
    await settle();
    assert.equal(changes.at(-1).weather.current.temperature_2m, 0);
    assert.equal(changes.at(-1).air, null);
    documentRef.hidden = true;
    documentRef.dispatchEvent(new Event('visibilitychange'));
    assert.equal(calls, 2);
    documentRef.hidden = false;
    documentRef.dispatchEvent(new Event('visibilitychange'));
    await settle();
    assert.equal(calls, 4);
  } finally { client.dispose(); }
});
test('late requests cannot replace a newly selected location', async () => {
  const documentRef = new EventTarget();
  const pending = [];
  const changes = [];
  const client = createWeatherClient({ documentRef, onChange: value => changes.push(value), fetcher: url => new Promise(resolve => pending.push({ url, resolve })) });
  try {
    client.setLocation({ latitude: 1, longitude: 1 });
    client.setLocation({ latitude: 2, longitude: 2 });
    for (const request of pending.slice(2)) request.resolve(Response.json({ current: { temperature_2m: 2 } }));
    await settle();
    for (const request of pending.slice(0, 2)) request.resolve(Response.json({ current: { temperature_2m: 1 } }));
    await settle();
    assert.equal(changes.filter(change => change.weather).length, 1);
    assert.equal(changes.at(-1).weather.current.temperature_2m, 2);
  } finally { client.dispose(); }
});
