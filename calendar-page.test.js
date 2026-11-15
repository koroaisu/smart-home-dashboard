import test from 'node:test';
import assert from 'node:assert/strict';
import { mountPages } from './figma-pages.js';
import { dateKey } from './state.js';

// Check live calendar rendering and handlers without requiring a browser.
// This cannot validate CSS geometry or iPad rendering.
test('calendar keeps one add action, shows only the selected day, and marks today separately', t => {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag; this.children = []; this.attributes = {}; this.style = { setProperty(key,value) { this[key]=value; } };
      const classes = new Set();
      this.classList = { toggle(name, active) { active ? classes.add(name) : classes.delete(name); }, contains(name) { return classes.has(name); } };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener() {}
    querySelectorAll() { return []; }
    querySelector() { return new Element('button'); }
    showModal() { this.open = true; }
  }
  const nodes = new Map();
  const removed = new Set(['calendar-add', 'calendar-upcoming']);
  const get = id => {
    assert.equal(removed.has(id), false, `controller references removed element ${id}`);
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  const originalDocument = globalThis.document;
  t.after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
  globalThis.document = {
    body: new Element(), getElementById: get, createElement: tag => new Element(tag),
    querySelectorAll: () => [], querySelector: () => new Element(), addEventListener() {},
  };
  const today = dateKey();
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);
  const state = { tasks: [
    { id: 'local', date: today, time: '09:00', title: '今日の手動予定', done: false },
    { id: 'future', date: tomorrow, time: '10:00', title: '別の日の予定', done: false },
  ] };
  const google = {
    events: [{ id: 'google', source: 'google', date: today, time: '11:00', title: '今日のGoogle予定', calendarName: '個人', color:'#112233' }],
    status: 'ready', connected: true, configured: true, updatedAt: new Date().toISOString(),
    setMonth() {}, calendars: [], selectedIds: [],
  };
  get('task-form').elements = { date: {}, title: { focus() {} } };
  const pages=mountPages(state, () => {}, () => {}, () => {}, false, google);
  assert.equal(typeof get('calendar-connection').onclick, 'function');
  get('calendar-add-day').onclick();
  assert.equal(get('task-form').elements.date.value, today);
  assert.equal(get('calendar-agenda').children.length, 2);
  const dayButtons = () => get('calendar-days').children.filter(el => el.tagName === 'button');
  const todayCell = dayButtons().find(el => el.attributes['aria-current'] === 'date');
  assert.ok(todayCell);
  assert.equal(todayCell.children[0].className, 'calendar-day-number');
  assert.equal(todayCell.children[0].textContent, String(new Date().getDate()));
  assert.equal(todayCell.children[1].className,'calendar-events');
  assert.equal(todayCell.children[1].children.length,2);
  assert.equal(todayCell.children[1].children[1].style['--event-color'],'#112233');
  google.events.push({...google.events[0],id:'third',time:'12:00',title:'追加予定'});
  pages.renderCalendar();
  const busyDay=dayButtons().find(el=>el.attributes['aria-current']==='date');
  assert.equal(busyDay.children[1].children.length,3);
  assert.equal(busyDay.children[1].children[2].textContent,'追加予定');
  assert.equal(get('calendar-agenda').children.length,3);
  google.events.push({...google.events[0],id:'fourth',time:'13:00',title:'4件目の予定'});
  pages.renderCalendar();
  const crowdedDay=dayButtons().find(el=>el.attributes['aria-current']==='date');
  assert.equal(crowdedDay.children[1].children.length,3);
  assert.equal(crowdedDay.children[2].className,'calendar-event-overflow');
  assert.equal(crowdedDay.children[2].textContent,'+1');
  assert.equal(get('calendar-agenda').children.length,4);
  const other = dayButtons().find(el => !el.attributes['aria-current'] && !el.classList.contains('outside'));
  other.onclick();
  assert.equal(dayButtons().filter(el => el.attributes['aria-current'] === 'date').length, 1);
  assert.equal(dayButtons().filter(el => el.attributes['aria-pressed'] === 'true').length, 1);
  assert.notEqual(dayButtons().find(el => el.attributes['aria-pressed'] === 'true').attributes['aria-current'], 'date');
});
