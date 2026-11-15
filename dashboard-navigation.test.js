import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual page controller with a minimal DOM. This checks gesture
// state and layout arithmetic, not Safari rendering or device frame rate.
const source = (await readFile(new URL('./figma-exact.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
function page({ width = 1024, height = 768, safeTop = 20, safeBottom = 0 } = {}) {
  const frames = new Map(), animations = [], nodes = new Map();
  let frameId = 0, now = 1000;
  class Element {
    constructor() {
      this.listeners = {}; this.children = []; this.attributes = new Map(); this.dataset = {};
      this.hidden = false; this.inert = false; this.scrollHeight = this.clientHeight = 100; this.scrollTop = 0;
      this.style = { setProperty(key, value) { this[key] = value; }, getPropertyValue(key) { return this[key] || ''; }, removeProperty(key) { delete this[key]; } };
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    emit(type, event) { for (const fn of this.listeners[type] || []) fn(event); }
    append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
    prepend(child) { this.append(child); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(key, value) { this.attributes.set(key, value); }
    removeAttribute(key) { this.attributes.delete(key); }
    closest() { return null; }
    get offsetWidth() { return parseFloat(root.style['--canvas-width']) || 1440; }
    animate(keyframes) {
      let resolve, reject;
      const animation = { keyframes, finished: new Promise((a, b) => { resolve = a; reject = b; }), finish() { resolve(); }, cancel() { reject(new Error('cancelled')); } };
      animations.push(animation); return animation;
    }
  }
  const root = new Element(), body = new Element(), canvas = new Element(), navigation = new Element();
  root.style['--safe-top'] = `${safeTop}px`; root.style['--safe-bottom'] = `${safeBottom}px`;
  const buttons = Array.from({ length: 6 }, (_, index) => { const el = new Element(); el.dataset.screen = String(index); return el; });
  const document = Object.assign(new Element(), {
    body, documentElement: root,
    createElement: () => new Element(),
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    querySelector(selector) { return selector === '.navigation' ? navigation : selector === '.design-canvas' ? canvas : null; },
    querySelectorAll(selector) { return selector === '[data-screen]' ? buttons : []; },
  });
  const window = Object.assign(new Element(), { visualViewport: Object.assign(new Element(), { width, height, scale: 1 }) });
  const location = { search: '?reference=1', hash: '#home' };
  const context = vm.createContext({
    document, window, location, innerWidth: width, innerHeight: height,
    history: { pushState(a, b, hash) { location.hash = hash; } },
    URLSearchParams, performance: { now: () => now },
    getComputedStyle: element => Object.assign({ overflowY: element.overflowY || 'visible' }, element.style),
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    deviceDefinitions: [], dateKey: () => '2026-11-15', validDate: () => true,
    compareCalendarRows: () => 0,
    createCalendarClient: () => ({ events: [], init() {} }),
    mountPages: () => ({ renderCalendar() {} }), mountDeviceScreen: () => ({ render() {} }),
  });
  vm.runInContext(source, context);
  const touch = (x, y = 200) => ({ identifier: 1, clientX: x, clientY: y });
  function send(type, x, y = 200, target = canvas) {
    now += 30;
    const point = touch(x, y);
    const event = { target, touches: type === 'touchend' ? [] : [point], changedTouches: [point], cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
    canvas.emit(type, event); document.emit(type, event);
    for (const [id, fn] of frames) { frames.delete(id); fn(); }
    return event;
  }
  return { root, body, canvas, navigation, window, location, nodes, animations, send, document, Element };
}

test('footer is outside the scaled canvas and content fits iPad viewport including safe areas', () => {
  for (const [width, height] of [[1024,768], [1180,820], [1368,1024]]) {
    const p = page({ width, height, safeTop: 24, safeBottom: 20 });
    assert.equal(p.navigation.parentElement, p.body);
    const scale = Number(p.root.style['--fit']);
    const footer = parseFloat(p.root.style['--footer-height']);
    assert.ok(936 * scale + footer + 44 <= height + 0.01);
    assert.ok(1440 * scale <= width + 0.01);
  }
});

test('responsive columns consume spare iPad width without widening the gaps', async () => {
  const css = await readFile(new URL('./responsive-layout.css', import.meta.url), 'utf8');
  for (const [width, height] of [[1024,768], [1180,820], [1194,834], [1368,1024]]) {
    const p = page({ width, height, safeTop: 24, safeBottom: 20 });
    const spread = parseFloat(p.root.style['--spread']);
    function value(name) {
      const expression = css.match(new RegExp(`--${name}:calc\\(([^;]+)\\);`))[1]
        .replace(/var\(--spread,0px\)/g, String(spread)).replace(/px/g, '');
      return vm.runInNewContext(expression);
    }
    const contentWidth = 1344 + spread;
    assert.ok(Math.abs(contentWidth - value('page-left') - value('page-right') - 31) < 0.01);
    assert.ok(Math.abs(contentWidth - value('music-left') - value('music-right') - 31) < 0.01);
    assert.ok(Math.abs(contentWidth - value('device-left') - value('device-right') - 47) < 0.01);
    assert.ok(Math.abs(contentWidth - 2 * value('home-side') - (612 + spread * .5) - 110) < 0.01);
  }
});

test('drag follows the finger, commits from that offset, and suppresses accidental clicks', () => {
  const p = page();
  p.send('touchstart', 700);
  assert.equal(p.send('touchmove', 500).prevented, true);
  const transform = p.nodes.get('home-screen').style.transform;
  assert.match(transform, /translate3d\(-/);
  assert.equal(p.nodes.get('devices-screen').hidden, false);
  p.send('touchend', 500);
  assert.equal(p.location.hash, '#devices');
  assert.equal(p.animations[0].keyframes[0].transform, transform);
  let prevented = false;
  p.canvas.emit('click', { preventDefault() { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
});

test('short drag and cancellation return to current page without changing navigation', async () => {
  const p = page();
  p.send('touchstart', 700); p.send('touchmove', 680); p.send('touchend', 680);
  assert.equal(p.location.hash, '#home');
  p.animations.forEach(animation => animation.finish());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(p.nodes.get('devices-screen').hidden, true);
  p.send('touchstart', 700); p.send('touchmove', 500);
  p.canvas.emit('touchcancel', {});
  assert.equal(p.nodes.get('home-screen').inert, false);
  assert.equal(p.nodes.get('devices-screen').hidden, true);
});

test('vertical movement blocks page bounce but retains inner list scrolling until its boundary', () => {
  const p = page();
  p.send('touchstart', 500, 200);
  assert.equal(p.send('touchmove', 500, 230).prevented, true);
  const list = new p.Element(); list.overflowY = 'auto'; list.scrollHeight = 400; list.scrollTop = 100; list.parentElement = p.body;
  p.send('touchstart', 500, 200, list);
  assert.equal(p.send('touchmove', 500, 230, list).prevented, false);
  list.scrollTop = 0;
  assert.equal(p.send('touchmove', 500, 250, list).prevented, true);
});
