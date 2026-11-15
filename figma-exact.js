import { createCalendarClient } from './calendar-client.js';
import { compareCalendarRows, calendarEventColors } from './calendar-data.js';
import { mountPages } from './figma-pages.js';
import { deviceDefinitions, dateKey, validDate } from './state.js';
import { mountDeviceScreen } from './figma-devices.js';
import { weatherIconFor } from './weather-icons.js';
import { resolveLocation, mihamaLocation } from './weather-client.js';
import { mountWeather } from './weather-display.js';

const $ = id => document.getElementById(id);
// Keep navigation outside the transformed canvas so it anchors to the viewport.
document.body.append(document.querySelector('.navigation'));
// Isolated storage keeps this design prototype from changing the existing dashboard.
const storageKey = 'sekhmet-figma-exact-v1';
const referenceMode = new URLSearchParams(location.search).get('reference') === '1';
const defaultState = () => ({ location: '福井県美浜町', weatherLocationVersion: 1, tasks: [], colorTemperatures: { floor: 'warm', ceiling: 'warm' }, devices: Object.fromEntries(deviceDefinitions.map(d => [d.id, { on: ['floor', 'ceiling'].includes(d.id), value: d.value }])) });
let state = defaultState();
if (!referenceMode) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.weatherLocationVersion === 1 && typeof saved?.location === 'string') state.location = saved.location.slice(0, 40);
    for (const id of ['floor', 'ceiling']) if (['warm', 'neutral', 'cool'].includes(saved?.colorTemperatures?.[id])) state.colorTemperatures[id] = saved.colorTemperatures[id];
    for (const def of deviceDefinitions) {
      const d = saved?.devices?.[def.id];
      if (typeof d?.on === 'boolean') state.devices[def.id].on = d.on;
      if (Number.isFinite(d?.value)) state.devices[def.id].value = Math.max(def.min, Math.min(def.max, Math.round(d.value)));
    }
    if (Array.isArray(saved?.tasks)) state.tasks = saved.tasks.filter(t => typeof t?.title === 'string' && validDate(t.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)).slice(0, 100).map(t => ({ ...t, title: t.title.slice(0, 80), done: t.done === true }));
  } catch { /* A blocked or corrupt browser store should not prevent the design from loading. */ }
}
let feedbackTimer;
function notify(message) {
  $('feedback').textContent = message;
  $('feedback').hidden = false;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => { $('feedback').hidden = true; }, 5000);
}
function save() {
  if (referenceMode) return;
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { notify('変更を保存できませんでした。'); }
}
function fitDesign() {
  const viewport = window.visualViewport;
  if (viewport && viewport.scale !== 1) return;
  const width = viewport?.width || innerWidth;
  const height = viewport?.height || innerHeight;
  // Keep panel interiors at their design size; distribute only the extra width.
  const rootStyle = getComputedStyle(document.documentElement);
  const safeTop = parseFloat(rootStyle.getPropertyValue('--safe-top')) || 0;
  const safeBottom = parseFloat(rootStyle.getPropertyValue('--safe-bottom')) || 0;
  const scale = Math.min(width / 1440, Math.max(1, height - safeTop - safeBottom) / 1024);
  const canvasWidth = Math.min(1840, width / scale);
  document.documentElement.style.setProperty('--fit', scale);
  document.documentElement.style.setProperty('--canvas-width', `${canvasWidth}px`);
  document.documentElement.style.setProperty('--spread', `${canvasWidth - 1440}px`);
  document.documentElement.style.setProperty('--viewport-height', `${height}px`);
  document.documentElement.style.setProperty('--footer-height', `${88 * scale}px`);
}
fitDesign();
window.addEventListener('resize', fitDesign);
window.visualViewport?.addEventListener('resize', fitDesign);

function tick() {
  if (referenceMode) return;
  const now = new Date();
  const day = $('current-weather').dataset.isDay;
  const icon = weatherIconFor($('current-weather').dataset.condition, day === '0' ? 0 : day === '1' ? 12 : now.getHours());
  if ($('weather-icon').getAttribute('src') !== icon) $('weather-icon').setAttribute('src', icon);
  const time = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  $('clock').textContent = $('header-clock').textContent = time;
  $('date').textContent = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);
  $('header-date').textContent = `${now.getMonth()+1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;
  if (lastDay !== dateKey(now)) { lastDay = dateKey(now); renderTasks(); }
}
let lastDay = dateKey();
function colorHomeTask(row,task) {
  const colors=calendarEventColors(task.color || googleCalendar.calendars.find(c=>c.id===task.calendarId)?.color);
  row.style.setProperty('--event-color',colors.background);
  row.style.setProperty('--event-ink',colors.foreground);
  return row;
}
function renderTasks() {
  const list = $('task-list');
  list.replaceChildren();
  const tasks = [...state.tasks, ...googleCalendar.events].filter(t => t.date === dateKey()).sort(compareCalendarRows);
  if (!tasks.length) {
    const title = document.createElement('p'); title.textContent = '今日は予定がありません';
    const sub = document.createElement('small'); sub.textContent = 'ゆっくり過ごしましょう';
    list.append(title, sub);
  }
  if (googleCalendar.status === 'stale' && tasks.some(t => t.source === 'google')) {
    const warning = document.createElement('small');warning.className = 'google-source-warning';warning.textContent = 'Googleの予定は更新待ちです';list.append(warning);
  }
  for (const task of tasks) {
    if (task.source === 'google') {
      const row = colorHomeTask(document.createElement('p'),task); row.className = 'google-home-task';
      row.textContent = task.time + ' ' + task.title;
      row.title = task.calendarName + (googleCalendar.status === 'stale' ? '（更新待ち）' : '');
      list.append(row); continue;
    }
    const label = colorHomeTask(document.createElement('label'),task); label.className = `task-item${task.done ? ' is-done' : ''}`;
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done;
    const text = document.createElement('span'); text.textContent = `${task.time} ${task.title}`;
    check.addEventListener('change', () => { task.done = check.checked; save(); renderTasks(); });
    label.append(check, text); list.append(label);
  }
}
let selectedDevice = null;
function deviceStatus(def) {
  const d = state.devices[def.id];
  return !d.on ? 'オフ' : `${d.value}${def.unit}`;
}
function renderDevices() {
  const list = $('device-summary'); list.replaceChildren();
  deviceDefinitions.forEach((def, i) => {
    const row = document.createElement('button'); row.className = `device-row${state.devices[def.id].on ? ' is-on' : ''}`;
    row.style.top = `${[123,220,317,414,510,607][i]}px`; row.dataset.device = def.id;
    row.setAttribute('aria-label', `${def.name}の詳細操作`); row.setAttribute('aria-haspopup','dialog');
    const icon = document.createElement('img'); icon.className='device-icon'; icon.alt='';
    icon.src=`/assets/figma-home/${def.id === 'ac' ? '71000' : ['floor','ceiling'].includes(def.id) ? 'a738a' : '09f9b'}.svg`;
    const name=document.createElement('span');name.className='device-name';name.textContent=def.name;
    const status=document.createElement('span');status.className='device-status';status.textContent=deviceStatus(def);
    const power=document.createElement('span');power.className='power-badge';power.textContent=state.devices[def.id].on?'ON':'OFF';
    row.append(icon,name,status,power);row.addEventListener('click',()=>openDevice(def));list.append(row);
  });
  const vacuum=document.createElement('button');vacuum.className='device-row';vacuum.style.top='704px';vacuum.setAttribute('aria-label','掃除機の状態');
  const icon=document.createElement('img');icon.src='/assets/figma-home/09f9b.svg';icon.alt='';icon.className='device-icon';
  for (const [className,text] of [['device-name','掃除機'],['device-status','待機'],['power-badge','待機']]) { const span=document.createElement('span');span.className=className;span.textContent=text;vacuum.append(span); }
  vacuum.prepend(icon);vacuum.addEventListener('click',()=>notify('掃除機は待機中です。'));list.append(vacuum);
  $('device-count').textContent=`${Object.values(state.devices).filter(d=>d.on).length}台が稼働中`;
}
function refreshDeviceDialog() {
  const d=state.devices[selectedDevice.id];
  $('device-title').textContent=selectedDevice.name;
  $('device-power').textContent=d.on?'電源をオフにする':'電源をオンにする';
  $('device-setting-label').textContent=selectedDevice.setting;
  $('device-range').min=selectedDevice.min;$('device-range').max=selectedDevice.max;
  $('device-range').value=d.value;$('device-range').disabled=!d.on;
  $('device-range').setAttribute('aria-label',selectedDevice.setting);
  $('device-value').textContent=`${d.value}${selectedDevice.unit}`;
}
function openDevice(def) { selectedDevice=def;refreshDeviceDialog();$('device-dialog').showModal(); }
$('device-power').addEventListener('click',()=>{const d=state.devices[selectedDevice.id];d.on=!d.on;save();refreshDeviceDialog();renderDevices();deviceScreen.render();});
$('device-range').addEventListener('input',()=>{state.devices[selectedDevice.id].value=Number($('device-range').value);refreshDeviceDialog();renderDevices();deviceScreen.render();});
$('device-range').addEventListener('change',save);
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('device-dialog').addEventListener('close',()=>document.querySelector(`[data-device="${selectedDevice?.id}"]`)?.focus());
$('task-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;const title=form.elements.title.value.trim();if(!title)return;state.tasks.push({id:crypto.randomUUID(),title,date:form.elements.date.value,time:form.elements.time.value,done:false});save();renderTasks();$('task-dialog').close();form.reset();notify('予定を追加しました。');});
$('location-label').textContent=state.location;
$('location-button').addEventListener('click',()=>{$('location-form').elements.location.value=state.location;$('location-dialog').showModal();});
$('location-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form = event.currentTarget;
  const label = form.elements.location.value.trim();
  if (!label) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const place = await resolveLocation(label);
    state.location = label; $('location-label').textContent = label; save();
    weatherClient?.setLocation(place);
    $('location-dialog').close();
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
const weatherClient = referenceMode ? null : mountWeather();
if (weatherClient) {
  const initialLocation = state.location;
  if (initialLocation === '福井県美浜町') weatherClient.setLocation(mihamaLocation);
  else resolveLocation(initialLocation).then(place => {
    if (state.location === initialLocation) weatherClient.setLocation(place);
  }).catch(() => {
    if (state.location !== initialLocation) return;
    state.location = '福井県美浜町'; $('location-label').textContent = state.location; save();
    weatherClient.setLocation(mihamaLocation);
    notify('保存地域を取得できないため、福井県美浜町に戻しました。');
  });
}
const phrases=['今日は、お部屋を整える日にしませんか？','お部屋は快適な状態です。','少しひと息つきませんか？'];let phraseIndex=0;
$('pet-speak').addEventListener('click',()=>{$('speech-text').textContent=phrases[++phraseIndex%phrases.length];});
const deviceScreen = mountDeviceScreen(state, persist => { if (persist) save(); renderDevices(); }, notify);
let pages;
const googleCalendar = createCalendarClient({ disabled: referenceMode, onChange() { renderTasks(); pages?.renderCalendar(); } });
pages = mountPages(state, save, renderTasks, notify, referenceMode, googleCalendar);
const screens = [
  { id: 'home', label: 'ホーム' },
  { id: 'devices', label: 'デバイス' },
  { id: 'music', label: '音楽' },
  { id: 'topics', label: 'トピック' },
  { id: 'calendar', label: 'カレンダー' },
  { id: 'notifications', label: '通知' },
];
let activeScreen = null;
let slideAnimations = [];
function selectScreen(index, { offset = 0 } = {}) {
  const selected = screens[Number(index)] || screens[0];
  if (selected === activeScreen) return;
  const previous = activeScreen;
  const direction = previous && screens.indexOf(selected) < screens.indexOf(previous) ? -1 : 1;
  slideAnimations.forEach(animation => animation.cancel());
  slideAnimations = [];
  activeScreen = selected;
  for (const screen of screens) {
    const element = $(screen.id + '-screen');
    element.hidden = screen !== selected;
    element.inert = screen !== selected;
    element.removeAttribute('aria-hidden');
    element.classList.remove('screen-sliding');
    element.style.removeProperty('transform');
  }
  if (previous && !matchMedia('(prefers-reduced-motion: reduce)').matches && $('home-screen').animate) {
    const outgoing = $(previous.id + '-screen'), incoming = $(selected.id + '-screen');
    outgoing.hidden = false;
    outgoing.inert = true;
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.classList.add('screen-sliding'); incoming.classList.add('screen-sliding');
    const options = { duration: offset ? 200 : 260, easing: 'cubic-bezier(.22,.61,.36,1)' };
    const distance = document.querySelector('.design-canvas').offsetWidth;
    const exit = outgoing.animate([{ transform: `translate3d(${offset}px,0,0)` }, { transform: `translate3d(${-direction * distance}px,0,0)` }], options);
    const enter = incoming.animate([{ transform: `translate3d(${direction * distance + offset}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], options);
    slideAnimations = [exit, enter];
    Promise.all(slideAnimations.map(animation => animation.finished)).then(() => {
      if (activeScreen !== selected) return;
      outgoing.hidden = true;outgoing.removeAttribute('aria-hidden');
      outgoing.classList.remove('screen-sliding');incoming.classList.remove('screen-sliding');
      slideAnimations = [];
    }).catch(() => { /* A newer navigation cancels the previous slide. */ });
  }
  document.querySelectorAll('[data-screen]').forEach(button => {
    if (screens[Number(button.dataset.screen)] === selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.title = selected.label + ' — セクメト';
  if (selected.id === 'devices') deviceScreen.render();
  if (selected.id === 'calendar') pages.renderCalendar();
}
function selectFromHash() {
  const index = screens.findIndex(screen => '#' + screen.id === location.hash);
  selectScreen(index < 0 ? 0 : index);
}
document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => {
  const screen = screens[Number(button.dataset.screen)];
  if (!screen) return;
  if (location.hash === '#' + screen.id) selectScreen(button.dataset.screen);
  else location.hash = screen.id;
}));
// Use viewport coordinates: the design canvas is scaled on iPad.
const swipeSurface = document.querySelector('.design-canvas');
let swipe = null;
let ignoreClickUntil = 0;
let swipeFrame = 0;
function resetSwipePreview() {
  cancelAnimationFrame(swipeFrame);
  swipeFrame = 0;
  for (const screen of screens) {
    const element = $(screen.id + '-screen');
    element.style.removeProperty('transform');
    element.classList.remove('screen-sliding');
    element.hidden = screen !== activeScreen;
    element.inert = screen !== activeScreen;
    element.removeAttribute('aria-hidden');
  }
}
function drawSwipe() {
  swipeFrame = 0;
  if (!swipe?.horizontal) return;
  const currentIndex = screens.indexOf(activeScreen);
  const direction = swipe.dx < 0 ? 1 : -1;
  const neighbor = screens[currentIndex + direction];
  const distance = swipe.distance;
  const scale = swipe.scale;
  const offset = swipe.dx / scale * (neighbor ? 1 : 0.2);
  swipe.offset = offset;
  swipe.neighbor = neighbor;
  for (const screen of screens) {
    const element = $(screen.id + '-screen');
    const visible = screen === activeScreen || screen === neighbor;
    element.hidden = !visible;
    element.inert = screen !== activeScreen;
    if (screen === activeScreen) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', 'true');
    element.classList.toggle('screen-sliding', visible);
    if (visible) element.style.transform = `translate3d(${offset + (screen === neighbor ? direction * distance : 0)}px,0,0)`;
  }
}
function cancelSwipe() {
  swipe = null;
  resetSwipePreview();
}
swipeSurface.addEventListener('touchstart', event => {
  if (swipe) cancelSwipe();
  if (event.touches.length !== 1 || document.querySelector('dialog[open]')) return;
  if (slideAnimations.length) return;
  if (event.target.closest('input, select, textarea, a, label')) return;
  const touch = event.touches[0];
  // Leave the screen edges available for Safari's back/forward gestures.
  if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
  swipe = {
    id: touch.identifier, x: touch.clientX, y: touch.clientY, dx: 0,
    started: performance.now(), horizontal: false, distance: swipeSurface.offsetWidth,
    scale: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fit')) || 1,
  };
}, { passive: true });
swipeSurface.addEventListener('touchmove', event => {
  if (!swipe) return;
  if (event.touches.length !== 1) { cancelSwipe(); return; }
  const touch = event.touches[0];
  if (touch.identifier !== swipe.id) { cancelSwipe(); return; }
  const dx = Math.abs(touch.clientX - swipe.x), dy = Math.abs(touch.clientY - swipe.y);
  if (!swipe.horizontal && dy > 8 && dy > dx) { cancelSwipe(); return; }
  if (dx > 8 && dx > dy * 1.25) swipe.horizontal = true;
  if (swipe.horizontal) {
    if (event.cancelable) event.preventDefault();
    swipe.dx = touch.clientX - swipe.x;
    ignoreClickUntil = performance.now() + 400;
    if (!swipeFrame) swipeFrame = requestAnimationFrame(drawSwipe);
  }
}, { passive: false });
swipeSurface.addEventListener('touchend', event => {
  const gesture = swipe;
  if (!gesture?.horizontal) { swipe = null; return; }
  if (event.touches.length) { cancelSwipe(); return; }
  const touch = Array.from(event.changedTouches).find(t => t.identifier === gesture.id);
  if (!touch) { cancelSwipe(); return; }
  gesture.dx = touch.clientX - gesture.x;
  cancelAnimationFrame(swipeFrame);
  drawSwipe();
  swipe = null;
  const elapsed = performance.now() - gesture.started;
  const commit = gesture.neighbor && (Math.abs(gesture.dx) > Math.min(160, innerWidth * 0.18) || (Math.abs(gesture.dx) > 40 && Math.abs(gesture.dx) / elapsed > 0.45));
  ignoreClickUntil = performance.now() + 400;
  if (commit) {
    const nextIndex = screens.indexOf(gesture.neighbor);
    history.pushState(null, '', '#' + gesture.neighbor.id);
    selectScreen(nextIndex, { offset: gesture.offset });
  } else {
    const element = $(activeScreen.id + '-screen');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !element.animate) { resetSwipePreview(); return; }
    const direction = gesture.dx < 0 ? 1 : -1;
    const distance = swipeSurface.offsetWidth;
    const visible = [activeScreen, gesture.neighbor].filter(Boolean);
    slideAnimations = visible.map(screen => {
      const target = $(screen.id + '-screen');
      const end = screen === activeScreen ? 0 : direction * distance;
      return target.animate([{ transform: target.style.transform }, { transform: `translate3d(${end}px,0,0)` }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
    });
    Promise.all(slideAnimations.map(animation => animation.finished)).then(() => {
      slideAnimations.forEach(animation => animation.cancel());
      slideAnimations = [];
      resetSwipePreview();
    }).catch(() => {});
  }
}, { passive: true });
swipeSurface.addEventListener('touchcancel', cancelSwipe, { passive: true });
window.addEventListener('resize', cancelSwipe);
// Older iPadOS can rubber-band even with overflow:hidden. Allow only an inner
// scroller that still has room in the requested direction, including dialogs.
let lastTouchY = 0;
document.addEventListener('touchstart', event => { if (event.touches.length === 1) lastTouchY = event.touches[0].clientY; }, { passive: true });
document.addEventListener('touchmove', event => {
  if (event.touches.length !== 1 || !event.cancelable) return;
  const y = event.touches[0].clientY;
  const dy = y - lastTouchY;
  lastTouchY = y;
  if (event.target.closest('input[type="range"]')) return;
  for (let node = event.target; node && node !== document.body; node = node.parentElement) {
    if (node.scrollHeight <= node.clientHeight + 1) continue;
    if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
    if ((dy > 0 && node.scrollTop > 0) || (dy < 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return;
  }
  event.preventDefault();
}, { passive: false });
swipeSurface.addEventListener('click', event => {
  if (performance.now() < ignoreClickUntil) { event.preventDefault(); event.stopPropagation(); }
}, true);
window.addEventListener('hashchange', selectFromHash);
selectFromHash();
renderDevices();renderTasks();tick();setInterval(tick,1000);
googleCalendar.init();
