import { deviceDefinitions } from './state.js';
import { setDeviceValue, applyScene } from './figma-device-actions.js';

const devices = Object.fromEntries(deviceDefinitions.map(d => [d.id, d]));
const roomDevices = { living: ['floor', 'ceiling', 'ac', 'purifier'], bedroom: ['humidifier', 'fan'], all: ['floor', 'ceiling', 'ac', 'purifier', 'humidifier', 'fan'] };
const colorNames = { warm: 'あたたかい光で、くつろぐ時間。', neutral: '自然な光で、心地よく。', cool: 'すっきりした光で、集中する時間。' };
const iconFile = id => id === 'ac' ? '71000' : ['floor', 'ceiling'].includes(id) ? 'a738a' : '09f9b';

export function mountDeviceScreen(state, commit, notify, live = null) {
  const $ = id => document.getElementById(id);
  let room = 'living', selected = 'floor', scene = 'relax';
  const isLight = id => ['floor', 'ceiling'].includes(id);
  const isLive = id => live && id === 'ceiling';
  const unavailable = id => isLive(id) && !live.ready();
  function detailText(def) {
    const d = state.devices[def.id];
    if (isLive(def.id)) return live.model()?.phase === 'ready' && !live.model()?.group?.mixed ? `SwitchBot / 明るさ ${d.value}%` : live.label();
    if (isLight(def.id)) return `デモ / 明るさ ${d.value}%`;
    if (def.id === 'ac') return 'デモ / 室温 24.6℃';
    if (def.id === 'purifier') return 'デモ / 空気の状態 良好';
    return `デモ / ${def.setting} ${d.value}${def.unit}`;
  }
  function renderCards() {
    const list = $('device-cards'), scrollTop = list.scrollTop;
    list.replaceChildren();
    for (const id of roomDevices[room]) {
      const def = devices[id], d = state.devices[id];
      const card = document.createElement('button');
      card.className = `device-select${d.on ? ' is-on' : ''}`;
      card.dataset.selectDevice = id;
      card.setAttribute('aria-pressed', String(id === selected));
      card.setAttribute('aria-label', `${def.name}を選択`);
      card.setAttribute('aria-controls', 'device-control-panel');
      // Responsive CSS draws the frame for both states; a fixed-size SVG would
      // overlap it when the selected card grows on wider tablets.
      const icon = document.createElement('img');
      icon.src = `/assets/figma-home/${iconFile(id)}.svg`; icon.alt = ''; icon.className = 'card-icon';
      card.append(icon);
      for (const [className, text] of [['card-power', unavailable(id) ? '—' : d.on ? 'ON' : 'OFF'], ['card-name', def.name], ['card-detail', detailText(def)], ['card-action', id === selected ? '選択中' : '詳細を見る　→']]) {
        const span = document.createElement('span'); span.className = className; span.textContent = text; card.append(span);
      }
      card.addEventListener('click', () => {
        selected = id; render();
        document.querySelector(`[data-select-device="${id}"]`)?.focus({ preventScroll: true });
      });
      list.append(card);
    }
    list.scrollTop = scrollTop;
  }
  function renderControl() {
    const def = devices[selected], d = state.devices[selected];
    $('control-title').textContent = def.name;
    $('control-power-badge').textContent = unavailable(selected) ? '—' : d.on ? 'ON' : 'OFF';
    $('control-power-badge').classList.toggle('is-on', d.on);
    $('control-location').textContent = isLive(selected) ? `4灯 / ${live.label()}` : `デモ / ${roomDevices.living.includes(selected) ? 'リビング' : '寝室'}`;
    $('control-setting-label').textContent = isLive(selected) && live.model()?.group?.mixed ? '平均の明るさ' : def.setting;
    $('control-value').textContent = d.value;
    $('control-unit').textContent = def.unit;
    const range = $('control-range');
    const min = isLive(selected) ? 1 : def.min;
    range.min = min; range.max = def.max; range.value = d.value; range.disabled = !d.on || unavailable(selected);
    range.setAttribute('aria-label', `${def.name}の${def.setting}`);
    range.setAttribute('aria-valuetext', `${d.value}${def.unit}`);
    range.style.setProperty('--range-progress', `${(d.value - def.min) / (def.max - def.min) * 100}%`);
    $('control-minus').disabled = !d.on || unavailable(selected) || d.value <= min;
    $('control-plus').disabled = !d.on || unavailable(selected) || d.value >= def.max;
    $('control-minus').setAttribute('aria-label', `${def.setting}を下げる`);
    $('control-plus').setAttribute('aria-label', `${def.setting}を上げる`);
    $('control-colors').hidden = !isLight(selected);
    const temperature = state.colorTemperatures?.[selected] || 'warm';
    document.querySelectorAll('[data-color]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.color === temperature));
      button.disabled = !d.on || unavailable(selected) || (isLive(selected) && live.model()?.busy);
    });
    $('control-description').textContent = !d.on ? '電源をオンにすると、設定を変更できます。' : isLight(selected) ? colorNames[temperature] : `${def.setting}を調整できます。`;
    $('control-power').textContent = d.on ? '電源をオフにする' : '電源をオンにする';
    $('control-power').disabled = unavailable(selected) || (isLive(selected) && live.model()?.busy);
  }
  function render() {
    renderCards(); renderControl();
    $('devices-page-count').textContent = live ? `天井照明4灯 / 状態更新 ↻` : `デモ / 稼働中 ${Object.values(state.devices).filter(d => d.on).length}台`;
    $('devices-page-count').disabled = Boolean(live?.model()?.busy);
    document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === scene)));
  }
  function setValue(value, persist) {
    if (unavailable(selected)) return;
    if (isLive(selected)) { value = Math.max(1, value); live.preview(); }
    if (!setDeviceValue(state, selected, value)) return;
    scene = null;
    render();
    // Home and the detailed panel share state; only committed gestures write storage.
    commit(persist);
    if (persist && isLive(selected)) live.send('brightness', state.devices[selected].value);
  }
  $('control-range').addEventListener('input', () => setValue(Number($('control-range').value), false));
  $('control-range').addEventListener('change', () => { commit(true); if (isLive(selected)) live.send('brightness', state.devices[selected].value); });
  $('control-minus').addEventListener('click', () => setValue(state.devices[selected].value - 1, true));
  $('control-plus').addEventListener('click', () => setValue(state.devices[selected].value + 1, true));
  $('control-power').addEventListener('click', () => { if (unavailable(selected)) return; state.devices[selected].on = !state.devices[selected].on; scene = null; if (isLive(selected)) live.send('power', state.devices[selected].on); commit(true); render(); });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
    if (!state.devices[selected].on || !isLight(selected)) return;
    state.colorTemperatures = { ...state.colorTemperatures, [selected]: button.dataset.color };
    if (isLive(selected)) live.send('temperature', button.dataset.color);
    scene = null; commit(true); render();
  }));
  document.querySelectorAll('[data-room]').forEach(button => button.addEventListener('click', () => {
    room = button.dataset.room;
    if (!roomDevices[room].includes(selected)) selected = roomDevices[room][0];
    document.querySelectorAll('[data-room]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('device-cards').scrollTop = 0; render();
  }));
  document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
    scene = button.dataset.scene;
    if (live) {
      if (!live.ready() || live.model()?.busy) { notify('天井照明の接続状態を確認してください。'); return; }
      live.send('power', scene === 'relax');
      if (scene === 'relax') { live.send('brightness', 20); live.send('temperature', 'warm'); }
      notify('天井照明4灯へシーンを送信します。'); render(); return;
    }
    applyScene(state, scene); commit(true); render();
    notify(`${button.textContent}シーンに切り替えました。`);
  }));
  $('devices-page-count').addEventListener('click', () => { if (live) void live.refresh(); });
  if (live) {
    for (const scene of ['sleep', 'away']) document.querySelector(`[data-scene="${scene}"]`).nextElementSibling.textContent = '天井照明4灯をオフ';
    document.querySelector('[data-scene="relax"]').nextElementSibling.textContent = '天井照明4灯をやさしく';
  }
  render();
  return { render };
}
