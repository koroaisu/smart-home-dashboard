import { dateKey } from './state.js';
import { compareCalendarRows } from './calendar-data.js';

export function calendarWindows(year, month, today = new Date()) {
  const first = new Date(year, month, 1, 12);
  first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  const end = new Date(first); end.setDate(end.getDate() + 42);
  const upcomingEnd = new Date(today); upcomingEnd.setDate(upcomingEnd.getDate() + 31);
  return [{ rangeStart: dateKey(first), rangeEnd: dateKey(end) }, { rangeStart: dateKey(today), rangeEnd: dateKey(upcomingEnd) }];
}

/** The browser receives only calendar data; OAuth tokens stay in server-managed cookies. */
export function createCalendarClient({ onChange = () => {}, fetchImpl = fetch, disabled = false } = {}) {
  let events = [], calendars = [], connected = false, configured = false, status = 'disconnected', message = '', updatedAt;
  let year = new Date().getFullYear(), month = new Date().getMonth(), requestId = 0, controller;
  let selectedIds;
  if (!disabled) try { const saved = JSON.parse(localStorage.getItem('sekhmet-calendar-selection-v1')); if (Array.isArray(saved) && saved.length <= 8 && saved.every(id => typeof id === 'string')) selectedIds = saved; } catch {}
  const publish = () => onChange();
  async function refresh() {
    if (!connected || disabled) return;
    controller?.abort(); controller = new AbortController();
    const current = ++requestId;
    status = 'loading'; message = ''; publish();
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
      const results = await Promise.all(calendarWindows(year, month).map(async range => {
        const response = await fetchImpl('/api/calendar/read', { method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: controller.signal,
          body: JSON.stringify({ ...range, timeZone, ...(selectedIds === undefined ? {} : { calendarIds: selectedIds }) }),
        });
        const data = await response.json().catch(() => { throw Error('接続を確認できませんでした。ページを再読み込みしてください。'); });
        if (!response.ok) { const error = new Error(data.error || '予定を取得できませんでした。'); error.code = data.code; error.calendars = data.calendars; throw error; }
        if (!Array.isArray(data.events) || !Array.isArray(data.calendars)) throw Error('予定を取得できませんでした。');
        return data;
      }));
      if (current !== requestId) return;
      events = [...new Map(results.flatMap(result => result.events).map(event => [event.id, event])).values()].sort(compareCalendarRows);
      calendars = results[0].calendars; selectedIds = results[0].selectedIds;
      status = 'ready'; updatedAt = results[0].updatedAt;
    } catch (error) {
      if (current !== requestId || error.name === 'AbortError') return;
      if (error.code === 'connect_required') connected = false;
      if (error.calendars) calendars = error.calendars;
      status = events.length ? 'stale' : 'error'; message = error.message;
    }
    publish();
  }
  const api = {
    get events() { return events; }, get calendars() { return calendars; }, get connected() { return connected; },
    get configured() { return configured; }, get status() { return status; }, get message() { return message; },
    get updatedAt() { return updatedAt; }, get selectedIds() { return selectedIds || []; },
    refresh,
    setMonth(nextYear, nextMonth) { if (year === nextYear && month === nextMonth) return; year = nextYear; month = nextMonth; refresh(); },
    async select(ids) {
      if (ids.length > 8 || ids.some(id => !calendars.some(c => c.id === id))) throw Error('カレンダーは8個まで選択できます。');
      selectedIds = [...new Set(ids)];
      try { localStorage.setItem('sekhmet-calendar-selection-v1', JSON.stringify(selectedIds)); } catch {}
      await refresh();
    },
    connect() { location.assign('/api/calendar/connect'); },
    async disconnect() {
      const response = await fetchImpl('/api/calendar/disconnect', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await response.json();
      if (!response.ok || !data.disconnected) throw Error('接続を解除できませんでした。');
      controller?.abort(); requestId++; events = []; calendars = []; selectedIds = undefined; connected = false; updatedAt = undefined; status = 'disconnected'; message = '';
      try { localStorage.removeItem('sekhmet-calendar-selection-v1'); } catch {}
      publish();
      return data;
    },
    async init() {
      if (disabled) return;
      try {
        const response = await fetchImpl('/api/calendar/status', { credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok) throw Error();
        const data = await response.json(); configured = data.configured === true; connected = data.connected === true;
        status = configured ? 'disconnected' : 'setup'; publish();
        if (connected) await refresh();
      } catch { status = 'error'; message = '接続状態を確認できませんでした。'; publish(); }
    },
  };
  if (!disabled && typeof document !== 'undefined') {
    setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }
  return api;
}
