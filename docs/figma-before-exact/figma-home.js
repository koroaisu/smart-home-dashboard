import './app.js';

const $ = id => document.getElementById(id);
const asset = file => `/assets/figma-home/${file}.svg`;

// App renderers keep their own handlers and saved state; adapt only their presentation.
function decorateDevices() {
  for (const row of $('device-summary').children) {
    const oldIcon = row.querySelector('svg.pixel-icon');
    if (!oldIcon) continue;
    const img = document.createElement('img');
    img.src = asset(row.dataset.device === 'ac' ? '71000' : ['floor', 'ceiling'].includes(row.dataset.device) ? 'a738a' : '09f9b');
    img.alt = '';
    img.className = 'figma-device-icon';
    oldIcon.replaceWith(img);
  }
  const count = $('device-summary').querySelectorAll('.device-on').length;
  $('figma-device-count').textContent = `${count}台が稼働中`;
}
function decorateAgenda() {
  const empty = $('task-list').querySelector('.empty');
  if (empty && !empty.querySelector('small')) {
    empty.textContent = '今日は予定がありません';
    const sub = document.createElement('small');
    sub.textContent = 'ゆっくり過ごしましょう';
    empty.append(sub);
  }
}
function updateHeader() {
  const now = new Date();
  $('figma-header-time').textContent = $('clock').textContent;
  $('figma-header-date').textContent = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(now);
}
decorateDevices();
decorateAgenda();
updateHeader();
new MutationObserver(decorateDevices).observe($('device-summary'), { childList: true });
new MutationObserver(decorateAgenda).observe($('task-list'), { childList: true });
new MutationObserver(updateHeader).observe($('clock'), { childList: true });

// Keep one visible page in the focus order, including after swipe navigation.
const pages = [...document.querySelectorAll('#pages > .page')];
function syncPageAccess() {
  const current = Number(document.querySelector('[data-page][aria-current="page"]')?.dataset.page || 0);
  pages.forEach((page, index) => { page.inert = index !== current; });
}
syncPageAccess();
new MutationObserver(syncPageAccess).observe(document.querySelector('.figma-tabs'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });

// The design has a permanent speech slot. Display the next normal phrase between timed utterances.
const fallback = document.createElement('p');
fallback.className = 'figma-speech-fallback';
fallback.textContent = '今日は、お部屋を整える日にしませんか？';
$('pet-speech').append(fallback);
