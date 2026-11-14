import { deviceDefinitions } from './state.js';
import { setDeviceValue, applyScene } from './figma-device-actions.js';

const devices = Object.fromEntries(deviceDefinitions.map(d => [d.id, d]));
const roomDevices = { living: ['floor', 'ceiling', 'ac', 'purifier'], bedroom: ['humidifier', 'fan'], all: ['floor', 'ceiling', 'ac', 'purifier', 'humidifier', 'fan'] };
const colorNames = { warm: 'あたたかい光で、くつろぐ時間。', neutral: '自然な光で、心地よく。', cool: 'すっきりした光で、集中する時間。' };
const iconFile = id => id === 'ac' ? '71000' : ['floor', 'ceiling'].includes(id) ? 'a738a' : '09f9b';

export function mountDeviceScreen(state, commit, notify) {
  const $ = id => document.getElementById(id);
  let room = 'living', selected = 'floor', scene = 'relax';
  const isLight = id => ['floor', 'ceiling'].includes(id);
  function detailText(def) {
    const d = state.devices[def.id];
    if (isLight(def.id)) return `明るさ ${d.value}%`;
    if (def.id === 'ac') return '室温 24.6℃';
    if (def.id === 'purifier') return '空気の状態 良好';
    return `${def.setting} ${d.value}${def.unit}`;
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
      for (const [file, className] of [['device-card', 'device-card-art'], ['device-card-selected', 'device-card-art selected-card-art'], [iconFile(id), 'card-icon']]) {
        const img = document.createElement('img');
        img.src = `/assets/figma-home/${file}.svg`; img.alt = ''; img.className = className;
        card.append(img);
      }
      for (const [className, text] of [['card-power', d.on ? 'ON' : 'OFF'], ['card-name', def.name], ['card-detail', detailText(def)], ['card-action', id === selected ? '選択中' : '詳細を見る　→']]) {
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
    $('control-power-badge').textContent = d.on ? 'ON' : 'OFF';
    $('control-power-badge').classList.toggle('is-on', d.on);
    $('control-location').textContent = selected === 'floor' ? 'リビング / ソファの横' : `${roomDevices.living.includes(selected) ? 'リビング' : '寝室'} / ${def.name}`;
    $('control-setting-label').textContent = def.setting;
    $('control-value').textContent = d.value;
    $('control-unit').textContent = def.unit;
    const range = $('control-range');
    range.min = def.min; range.max = def.max; range.value = d.value; range.disabled = !d.on;
    range.setAttribute('aria-label', `${def.name}の${def.setting}`);
    range.setAttribute('aria-valuetext', `${d.value}${def.unit}`);
    range.style.setProperty('--range-progress', `${(d.value - def.min) / (def.max - def.min) * 100}%`);
    $('control-minus').disabled = !d.on || d.value <= def.min;
    $('control-plus').disabled = !d.on || d.value >= def.max;
    $('control-minus').setAttribute('aria-label', `${def.setting}を下げる`);
    $('control-plus').setAttribute('aria-label', `${def.setting}を上げる`);
    $('control-colors').hidden = !isLight(selected);
    const temperature = state.colorTemperatures?.[selected] || 'warm';
    document.querySelectorAll('[data-color]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.color === temperature));
      button.disabled = !d.on;
    });
    $('control-description').textContent = !d.on ? '電源をオンにすると、設定を変更できます。' : isLight(selected) ? colorNames[temperature] : `${def.setting}を調整できます。`;
    $('control-power').textContent = d.on ? '電源をオフにする' : '電源をオンにする';
  }
  function render() {
    renderCards(); renderControl();
    $('devices-page-count').textContent = `接続中 7台　/　稼働中 ${Object.values(state.devices).filter(d => d.on).length}台`;
    document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === scene)));
  }
  function setValue(value, persist) {
    if (!setDeviceValue(state, selected, value)) return;
    scene = null;
    render();
    // Home and the detailed panel share state; only committed gestures write storage.
    commit(persist);
  }
  $('control-range').addEventListener('input', () => setValue(Number($('control-range').value), false));
  $('control-range').addEventListener('change', () => commit(true));
  $('control-minus').addEventListener('click', () => setValue(state.devices[selected].value - 1, true));
  $('control-plus').addEventListener('click', () => setValue(state.devices[selected].value + 1, true));
  $('control-power').addEventListener('click', () => { state.devices[selected].on = !state.devices[selected].on; scene = null; commit(true); render(); });
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => {
    if (!state.devices[selected].on || !isLight(selected)) return;
    state.colorTemperatures = { ...state.colorTemperatures, [selected]: button.dataset.color };
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
    applyScene(state, scene); commit(true); render();
    notify(`${button.textContent}シーンに切り替えました。`);
  }));
  render();
  return { render };
}
