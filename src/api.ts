import type { Forecast, Location } from './types'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const GEO_ID_URL = 'https://geocoding-api.open-meteo.com/v1/get'
const FORECAST_URL = 'https://api.pirateweather.net/forecast'
const PW_KEY = import.meta.env.VITE_PW_KEY

// Pirate Weather uses Dark Sky-style string icons; the rest of the app speaks
// WMO weather codes. Map the strings back to WMO codes so weather.ts is reused.
const ICON_TO_WMO: Record<string, number> = {
  'clear-day': 0,
  'clear-night': 0,
  wind: 0,
  'partly-cloudy-day': 2,
  'partly-cloudy-night': 2,
  cloudy: 3,
  fog: 45,
  rain: 63,
  sleet: 66,
  snow: 73,
  hail: 67,
  thunderstorm: 95,
  tornado: 95,
}

function wmo(icon: string): number {
  return ICON_TO_WMO[icon] ?? 3
}

function isDayFromIcon(icon: string): number {
  return icon.endsWith('-night') ? 0 : 1
}

// Pirate Weather returns unix seconds (UTC). Format as a naive wall-clock
// string in the location's timezone so new Date(...).getHours() etc. reflect
// local time at the place, not the browser's timezone.
function localISO(unixSec: number, tz: string): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(f.formatToParts(new Date(unixSec * 1000)).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
}

function localDate(unixSec: number, tz: string): string {
  return localISO(unixSec, tz).slice(0, 10)
}

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
    countryCode: r.country_code,
    admin1: r.admin1,
  }))
}

export async function getLocationById(id: number): Promise<Location> {
  const res = await fetch(`${GEO_ID_URL}?id=${id}`)
  if (!res.ok) throw new Error('Location not found')
  const d = await res.json()
  if (typeof d?.id !== 'number') throw new Error('Location not found')
  return {
    id: d.id,
    name: d.name,
    latitude: d.latitude,
    longitude: d.longitude,
    country: d.country,
    countryCode: d.country_code,
    admin1: d.admin1,
  }
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
    countryCode: d.countryCode,
    admin1: d.principalSubdivision,
  }
}

export async function getForecast(loc: Location): Promise<Forecast> {
  if (!PW_KEY) throw new Error('VITE_PW_KEY is not set')
  const url = `${FORECAST_URL}/${PW_KEY}/${loc.latitude},${loc.longitude}?units=si&extend=hourly`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Forecast failed')
  const d = await res.json()
  const tz: string = d.timezone

  // Sunrise/sunset windows (unix sec) for deriving isDay at each hour.
  const windows: [number, number][] = (d.daily?.data ?? []).map((x: any) => [x.sunriseTime, x.sunsetTime])
  const hourIsDay = (t: number) => (windows.some(([sr, ss]) => t >= sr && t < ss) ? 1 : 0)

  return {
    timezone: tz,
    current: {
      time: localISO(d.currently.time, tz),
      temperature: d.currently.temperature,
      weatherCode: wmo(d.currently.icon),
      windSpeed: d.currently.windSpeed,
      windDirection: d.currently.windBearing,
      precipitation: d.currently.precipIntensity,
      uvIndex: d.currently.uvIndex,
      isDay: isDayFromIcon(d.currently.icon),
    },
    hourly: (d.hourly?.data ?? []).map((h: any) => ({
      time: localISO(h.time, tz),
      temperature: h.temperature,
      weatherCode: wmo(h.icon),
      windSpeed: h.windSpeed,
      windDirection: h.windBearing,
      precipitation: h.precipIntensity,
      uvIndex: h.uvIndex,
      isDay: hourIsDay(h.time),
    })),
    daily: (d.daily?.data ?? []).map((x: any) => ({
      date: localDate(x.time, tz),
      weatherCode: wmo(x.icon),
      tempMax: x.temperatureMax,
      tempMin: x.temperatureMin,
      windSpeedMax: x.windSpeed,
      precipitationSum: (x.precipIntensity ?? 0) * 24,
      uvIndexMax: x.uvIndex,
    })),
  }
}
