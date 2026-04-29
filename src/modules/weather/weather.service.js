'use strict';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL =
  process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';
const OPENWEATHER_DEFAULT_UNITS = process.env.OPENWEATHER_DEFAULT_UNITS || 'metric';
const OPENWEATHER_DEFAULT_LANG = process.env.OPENWEATHER_DEFAULT_LANG || 'en';

/**
 * Fetch current weather from OpenWeather API.
 * @param {{ lat: number, lon: number }} param0
 */
async function getWeather({ lat, lon }) {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY is not configured on the server.');
  }

  const url =
    `${OPENWEATHER_BASE_URL}/weather` +
    `?lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}` +
    `&appid=${OPENWEATHER_API_KEY}` +
    `&units=${OPENWEATHER_DEFAULT_UNITS}` +
    `&lang=${OPENWEATHER_DEFAULT_LANG}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenWeather API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const weatherEntry = (data.weather ?? [])[0] ?? {};

  return {
    temperature: Math.round(data.main?.temp ?? 0),
    feelsLike: Math.round(data.main?.feels_like ?? 0),
    description: weatherEntry.description ?? '',
    icon: weatherEntry.icon ?? '01d',
    iconUrl: `https://openweathermap.org/img/wn/${weatherEntry.icon ?? '01d'}@2x.png`,
    humidity: data.main?.humidity ?? 0,
    windSpeed: data.wind?.speed ?? 0,
    cityName: data.name ?? '',
    country: data.sys?.country ?? '',
  };
}

module.exports = { getWeather };
