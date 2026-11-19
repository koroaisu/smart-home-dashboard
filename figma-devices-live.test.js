import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDeviceScreen } from './figma-devices.js';
import { initialState } from './state.js';

test('ceiling gestures send real operations only on commit while demo controls remain local', () => {
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.listeners = {}; this.children = []; this.style = { setProperty() {} }; this.classList = { toggle() {} }; this.scrollTop = 0; this.nextElementSibling = {}; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    emit(type) { this.listeners[type]?.(); }
    append(...children) { this.children.push(...children); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    focus() {}
  }
  const nodes = new Map();
  const byId = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const colors = ['warm', 'neutral', 'cool'].map(color => new Element({ color }));
  const rooms = ['living', 'bedroom', 'all'].map(room => new Element({ room }));
  const scenes = ['relax', 'sleep', 'away'].map(scene => new Element({ scene }));
  const previous = globalThis.document;
  globalThis.document = {
    getElementById: byId, createElement: () => new Element(),
    querySelectorAll: selector => selector === '[data-color]' ? colors : selector === '[data-room]' ? rooms : scenes,
    querySelector: selector => selector.startsWith('[data-scene=') ? scenes.find(node => selector.includes(`"${node.dataset.scene}"`)) : new Element(),
  };
  const state = { ...initialState(), colorTemperatures: { ceiling: 'warm', floor: 'warm' } };
  const sent = [];
  try {
    mountDeviceScreen(state, () => {}, () => {}, {
      ready: () => true, label: () => 'SwitchBot', model: () => ({ phase: 'ready', group: { count: 4 } }),
      send: (action, value) => sent.push({ action, value }), preview() {}, refresh() {},
    });
    byId('control-power').emit('click'); // Default selection is the unconnected demo floor lamp.
    assert.equal(sent.length, 0);
    byId('device-cards').children.find(node => node.dataset.selectDevice === 'ceiling').emit('click');
    assert.equal(byId('control-range').min, 1);
    byId('control-range').value = '43';
    byId('control-range').emit('input');
    assert.equal(sent.length, 0, 'drag previews must not send physical operations');
    byId('control-range').emit('change');
    assert.deepEqual(sent.pop(), { action: 'brightness', value: 43 });
    colors[2].emit('click');
    assert.deepEqual(sent.pop(), { action: 'temperature', value: 'cool' });
    scenes[2].emit('click');
    assert.deepEqual(sent, [{ action: 'power', value: false }]);
  } finally { globalThis.document = previous; }
});
