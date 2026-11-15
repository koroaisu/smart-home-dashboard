const icons = {
  sunny: 'weather_sunny.png',
  cloudy: 'weather_cloudy_white.png',
  drizzle: 'weather_rain_cloud_light.png',
  rain: 'weather_rain_umbrella_light.png',
  'heavy-rain': 'weather_rain_umbrella_heavy.png',
  thunderstorm: 'weather_thunderstorm.png',
};

// The current weather is demo data. This mapping can also be used by a future
// weather provider; the clock only changes the clear-sky illustration at night.
export function weatherIconFor(condition, hour) {
  const night = Number.isFinite(hour) && (hour < 6 || hour >= 18);
  const file = condition === 'sunny' && night ? 'moon_yellow.png' : icons[condition] || icons.cloudy;
  return `/assets/weather/${file}`;
}
