import { createWeatherClient, numberText, weatherFor } from './weather-client.js';
import { weatherIconFor } from './weather-icons.js';

export function mountWeather() {
  const $ = selector => document.querySelector(selector);
  function render(data) {
    const current = data.weather?.current;
    const daily = data.weather?.daily;
    const air = data.air?.current;
    const description = weatherFor(current?.weather_code);
    const temperature = numberText(current?.temperature_2m, 1);
    $('.header-weather').textContent = data.loading ? '天気取得中…' : current ? `${description.label} ${temperature}℃` : '天気取得失敗';
    $('.weather-current').textContent = data.loading ? '取得中…' : current ? `気温 ${temperature}℃` : '取得できません';
    $('.weather-range').textContent = data.loading ? '—' : `最高 ${numberText(daily?.temperature_2m_max?.[0])}℃ / 最低 ${numberText(daily?.temperature_2m_min?.[0])}℃`;
    $('#current-weather').dataset.condition = description.condition;
    $('#current-weather').dataset.isDay = current?.is_day === 0 ? '0' : current?.is_day === 1 ? '1' : '';
    $('#weather-icon').src = weatherIconFor(description.condition, current?.is_day === 0 ? 0 : 12);
    $('#weather-icon').alt = data.loading ? '天気取得中' : description.label;
    $('#weather-icon').hidden = !current;
    $('#current-weather').title = current?.time ? `モデル推定値・データ日時 ${current.time}（対象地域の現地時刻）` : '';
    $('.pm dd').textContent = numberText(air?.pm2_5, 1);
    $('.aqi dt').textContent = 'AQI (US)';
    $('.aqi dd').textContent = numberText(air?.us_aqi);
    $('.pollen dd').textContent = '未対応';
    $('#outdoor-heading').title = 'モデル推定値（観測センサーではありません）。日本の花粉は提供範囲外です。';
    $('#outdoor-status').textContent = data.loading ? '取得中…' : air ? `更新 ${data.updatedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : '取得失敗・再試行待ち';
    $('.pm').title = $('.aqi').title = air?.time ? `データ日時 ${air.time}（対象地域の現地時刻）` : 'データ未取得';
  }
  render({ loading: true });
  return createWeatherClient({ onChange: render });
}
