// Verified town coordinates: https://www.town.fukui-mihama.lg.jp/soshiki/5/439.html
export const mihamaLocation = { latitude: 35.601389, longitude: 135.940556 };
export const numberText = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '—';

export function weatherFor(code) {
  if (code === 0) return { label: '晴れ', condition: 'sunny' };
  if ([1, 2, 3].includes(code)) return { label: code === 3 ? '曇り' : '晴れ時々曇り', condition: 'cloudy' };
  if ([45, 48].includes(code)) return { label: '霧', condition: 'cloudy' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '霧雨', condition: 'drizzle' };
  if ([65, 67, 82].includes(code)) return { label: '強い雨', condition: 'heavy-rain' };
  if ([61, 63, 66, 80, 81].includes(code)) return { label: '雨', condition: 'rain' };
  // No snow illustration is supplied; use the neutral cloudy image with honest alt text.
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '雪', condition: 'cloudy' };
  if ([95, 96, 99].includes(code)) return { label: '雷雨', condition: 'thunderstorm' };
  return { label: '天気不明', condition: 'unknown' };
}

async function requestJson(url, fetcher, signal) {
  const response = await fetcher(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw Error('データを取得できませんでした。');
  return response.json();
}

export async function resolveLocation(name, fetcher = fetch) {
  if (['福井県美浜町', '美浜町', '福井県三方郡美浜町'].includes(name)) return { ...mihamaLocation };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const query = new URLSearchParams({ name, count: '1', language: 'ja', countryCode: 'JP' });
    const data = await requestJson(`https://geocoding-api.open-meteo.com/v1/search?${query}`, fetcher, controller.signal);
    const place = data.results?.[0];
    if (!Number.isFinite(place?.latitude) || !Number.isFinite(place?.longitude)) throw Error('地域が見つかりません。市区町村名を確認してください。');
    return place;
  } finally { clearTimeout(timeout); }
}

export function createWeatherClient({ onChange, fetcher = fetch, documentRef = document, interval = 15 * 60 * 1000 }) {
  let controller;
  let coordinates;
  let timer;
  let version = 0;
  async function refresh() {
    if (!coordinates || documentRef.hidden) return;
    controller?.abort();
    const activeController = controller = new AbortController();
    const currentVersion = ++version;
    onChange({ loading: true });
    const timeout = setTimeout(() => activeController.abort(), 15000);
    const query = new URLSearchParams({ latitude: coordinates.latitude, longitude: coordinates.longitude, timezone: 'auto', forecast_days: '1' });
    try {
      const results = await Promise.allSettled([
        requestJson(`https://api.open-meteo.com/v1/forecast?${query}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min`, fetcher, activeController.signal),
        requestJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${query}&current=pm2_5,us_aqi`, fetcher, activeController.signal),
      ]);
      if (currentVersion !== version) return;
      onChange({
        weather: results[0].status === 'fulfilled' ? results[0].value : null,
        air: results[1].status === 'fulfilled' ? results[1].value : null,
        updatedAt: new Date(),
      });
    } finally { clearTimeout(timeout); }
  }
  const resume = () => { if (!documentRef.hidden) void refresh(); };
  documentRef.addEventListener('visibilitychange', resume);
  return {
    setLocation(value) {
      coordinates = value;
      clearInterval(timer);
      void refresh();
      timer = setInterval(() => { void refresh(); }, interval);
    },
    dispose() { ++version; controller?.abort(); clearInterval(timer); documentRef.removeEventListener('visibilitychange', resume); },
  };
}
