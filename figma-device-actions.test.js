import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from './state.js';
import { setDeviceValue, applyScene } from './figma-device-actions.js';

test('device adjustments respect bounds and do not change powered-off settings', () => {
  const state = initialState();
  setDeviceValue(state, 'floor', 110);
  assert.equal(state.devices.floor.value, 100);
  setDeviceValue(state, 'ac', 0);
  assert.equal(state.devices.ac.value, 16);
  state.devices.floor.on = false;
  assert.equal(setDeviceValue(state, 'floor', 25), false);
  assert.equal(state.devices.floor.value, 100);
  assert.equal(setDeviceValue(state, 'unknown', 25), false);
  assert.equal(setDeviceValue(state, 'ac', NaN), false);
});

test('sleep scene switches lights off without changing unrelated devices or saved values', () => {
  const state = initialState();
  const ac = { ...state.devices.ac };
  assert.equal(applyScene(state, 'sleep'), true);
  assert.equal(state.devices.floor.on, false);
  assert.equal(state.devices.ceiling.on, false);
  assert.equal(state.devices.floor.value, 70);
  assert.deepEqual(state.devices.ac, ac);
});

test('relax applies warm dimmed lights, away switches every device off, unknown scenes do nothing', () => {
  const state = initialState();
  applyScene(state, 'relax');
  assert.deepEqual(state.devices.floor, { on: true, value: 35 });
  assert.deepEqual(state.devices.ceiling, { on: true, value: 20 });
  assert.equal(state.colorTemperatures.ceiling, 'warm');
  applyScene(state, 'away');
  assert.ok(Object.values(state.devices).every(d => !d.on));
  const before = structuredClone(state);
  assert.equal(applyScene(state, 'other'), false);
  assert.deepEqual(state, before);
});
