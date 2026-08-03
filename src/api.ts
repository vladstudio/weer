import type { Forecast, Location } from './types'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function searchLocations(query: string): Promise<Location[]> {
  if (query.trim().length < 2) return []
  const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Geocoding failed')
  const data = await res.json()
  if (!data.results) return []
  return data.results.map((r: any) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }))
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location> {
  // Open-Meteo has no reverse geocoding; use BigDataCloud free endpoint.
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Reverse geocoding failed')
  const d = await res.json()
  const name = d.city || d.locality || d.principalSubdivision || d.countryName || 'My location'
  return {
    id: Math.round(Math.abs(lat * 1000 + lon * 1000)),
    name,
    latitude: lat,
    longitude: lon,
    country: d.countryName,
    admin1: d.principalSubdivision,
  }
}

export async function getForecast(loc: Location): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '10',
    wind_speed_unit: 'ms',
  })
  const res = await fetch(`${FORECAST_URL}?${params}`)
  if (!res.ok) throw new Error('Forecast failed')
  const d = await res.json()
  return {
    timezone: d.timezone,
    current: {
      time: d.current.time,
      temperature: d.current.temperature_2m,
      weatherCode: d.current.weather_code,
      windSpeed: d.current.wind_speed_10m,
      windDirection: d.current.wind_direction_10m,
    },
    hourly: d.hourly.time.map((t: string, i: number) => ({
      time: t,
      temperature: d.hourly.temperature_2m[i],
      weatherCode: d.hourly.weather_code[i],
      windSpeed: d.hourly.wind_speed_10m[i],
      windDirection: d.hourly.wind_direction_10m[i],
    })),
    daily: d.daily.time.map((t: string, i: number) => ({
      date: t,
      weatherCode: d.daily.weather_code[i],
      tempMax: d.daily.temperature_2m_max[i],
      tempMin: d.daily.temperature_2m_min[i],
      windSpeedMax: d.daily.wind_speed_10m_max[i],
    })),
  }
}