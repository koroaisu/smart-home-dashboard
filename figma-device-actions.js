import { deviceDefinitions } from './state.js';

export function setDeviceValue(state, id, value) {
  const def = deviceDefinitions.find(d => d.id === id);
  if (!def || !state.devices[id]?.on || !Number.isFinite(value)) return false;
  state.devices[id].value = Math.max(def.min, Math.min(def.max, Math.round(value)));
  return true;
}

export function applyScene(state, scene) {
  if (scene === 'relax') {
    state.devices.floor.on = state.devices.ceiling.on = true;
    state.devices.floor.value = 35;
    state.devices.ceiling.value = 20;
    state.colorTemperatures = { ...state.colorTemperatures, floor: 'warm', ceiling: 'warm' };
  } else if (scene === 'sleep') {
    state.devices.floor.on = state.devices.ceiling.on = false;
  } else if (scene === 'away') {
    for (const device of Object.values(state.devices)) device.on = false;
  } else return false;
  return true;
}
