import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { weatherIconFor } from './weather-icons.js';

test('clear sky switches to moon at night without replacing rainy weather', () => {
  assert.match(weatherIconFor('sunny', 6), /weather_sunny/);
  assert.match(weatherIconFor('sunny', 17), /weather_sunny/);
  assert.match(weatherIconFor('sunny', 18), /moon_yellow/);
  assert.match(weatherIconFor('sunny', 5), /moon_yellow/);
  assert.match(weatherIconFor('rain', 23), /umbrella_light/);
  assert.match(weatherIconFor('thunderstorm', 23), /thunderstorm/);
  assert.match(weatherIconFor('unknown', 12), /cloudy/);
});

test('every mapped weather image exists in the shipped asset directory', async () => {
  for (const condition of ['sunny', 'cloudy', 'drizzle', 'rain', 'heavy-rain', 'thunderstorm']) {
    for (const hour of [12, 22]) await access(new URL('.' + weatherIconFor(condition, hour), import.meta.url));
  }
});
