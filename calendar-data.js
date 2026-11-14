import { validDate } from './state.js';

const DAY = 86_400_000;
const utcDay = key => Date.parse(`${key}T00:00:00Z`);
const keyAt = value => new Date(value).toISOString().slice(0, 10);

// Formatters contain no account data; reuse them to fit the Free CPU budget.
const formatters = new Map();
const collator = new Intl.Collator('ja');
function dateTimeParts(value, timeZone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (!formatters.has(timeZone)) {
    if (formatters.size >= 4) formatters.delete(formatters.keys().next().value);
    formatters.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  const parts = Object.fromEntries(formatters.get(timeZone).formatToParts(date).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Expand a Google occurrence into visible day rows. The provider's end is exclusive. */
export function googleEventRows(event, { calendarId, calendarName, rangeStart, rangeEnd, timeZone = 'Asia/Tokyo' }) {
  if (!event?.id || event.status === 'cancelled' || !validDate(rangeStart) || !validDate(rangeEnd)) return [];
  const allDay = Boolean(event.start?.date);
  let first, last, startTime = '', endTime = '';
  if (allDay) {
    if (!validDate(event.start.date) || !validDate(event.end?.date) || event.end.date <= event.start.date) return [];
    first = event.start.date;
    last = keyAt(utcDay(event.end.date) - DAY);
  } else {
    const start = Date.parse(event.start?.dateTime), end = Date.parse(event.end?.dateTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    const from = dateTimeParts(start, timeZone), until = dateTimeParts(end, timeZone);
    first = from.date;
    last = dateTimeParts(end - 1, timeZone).date;
    startTime = from.time;
    endTime = until.time;
  }
  const start = Math.max(utcDay(first), utcDay(rangeStart));
  const end = Math.min(utcDay(last), utcDay(rangeEnd) - DAY);
  const rows = [];
  // Bound expansion even if a provider returns an unexpectedly long event.
  for (let day = start; day <= end && rows.length < 400; day += DAY) {
    const date = keyAt(day);
    rows.push({
      id: `google:${calendarId}:${event.id}:${date}`, eventId: event.id,
      source: 'google', calendarId, calendarName, date, allDay,
      title: typeof event.summary === 'string' && event.summary.trim() ? event.summary.slice(0, 200) : '（タイトルなし）',
      time: allDay ? '終日' : date === first ? startTime : '継続',
      startDate: first, endDate: last, startTime, endTime,
    });
  }
  return rows;
}

export function compareCalendarRows(a, b) {
  return a.date.localeCompare(b.date) || Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) ||
    (a.time === '継続' ? '00:00' : a.time).localeCompare(b.time === '継続' ? '00:00' : b.time) ||
    collator.compare(a.title, b.title);
}

/** Fetch every page before returning, so partial failures cannot appear complete. */
export async function readGooglePages(path, { accessToken, fetchImpl = fetch, signal, params = {}, maxPages = 50 }) {
  const items = [];
  let pageToken;
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, String(value));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal,
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? 'Googleへの再接続が必要です。' :
        response.status === 403 ? 'カレンダーを読み取る権限を確認してください。' :
        response.status === 429 ? '取得が混み合っています。少し待って更新してください。' : '予定を取得できませんでした。');
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.items)) throw new Error('カレンダーから正しいデータを取得できませんでした。');
    items.push(...data.items);
    pageToken = data.nextPageToken;
    if (!pageToken) return items;
  }
  throw new Error('予定が多いため取得を完了できませんでした。表示するカレンダーを減らしてください。');
}
