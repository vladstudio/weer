import { useEffect, useState } from 'react'
import type { Location } from '../types'

interface Props {
  location: Location
}

interface CountryShape {
  rings: [number, number][][] // [lon, lat] rings of the country border
  capital: { latitude: number; longitude: number } | null
}

// Free static data: countries-list (ISO2 -> capital name, ISO2 -> ISO3)
// and world.geo.json (low-res country borders, keyed by ISO3).
const COUNTRIES_URL = 'https://cdn.jsdelivr.net/npm/countries-list@3/countries.min.json'
const ISO3_URL = 'https://cdn.jsdelivr.net/npm/countries-list@3/minimal/countries.2to3.min.json'
const BORDER_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries'
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${url}`)
  return res.json()
}

let countryData: Promise<[any, any]> | null = null
const shapeCache = new Map<string, Promise<CountryShape>>()

async function loadShape(code: string | undefined, country: string | undefined) {
  countryData ??= Promise.all([fetchJson(COUNTRIES_URL), fetchJson(ISO3_URL)])
  const [countries, iso3map] = await countryData
  // Old recents predate countryCode; fall back to matching the country name.
  const iso2 =
    code?.toUpperCase() ?? Object.keys(countries).find((k) => countries[k].name === country)
  const iso3 = iso2 && iso3map[iso2]
  if (!iso3) throw new Error('Unknown country')

  const geo = await fetchJson(`${BORDER_URL}/${iso3}.geo.json`)
  const rings: [number, number][][] = []
  for (const f of geo.features) {
    if (f.geometry.type === 'Polygon') rings.push(...f.geometry.coordinates)
    else if (f.geometry.type === 'MultiPolygon')
      for (const poly of f.geometry.coordinates) rings.push(...poly)
  }

  // Capital coordinates via Open-Meteo geocoding (PPLC = capital of a country).
  let capital: CountryShape['capital'] = null
  const capName = countries[iso2!]?.capital
  if (capName) {
    try {
      const gc = await fetchJson(
        `${GEO_URL}?name=${encodeURIComponent(capName)}&count=10&language=en&format=json`,
      )
      const results: any[] = gc.results ?? []
      const hit =
        results.find((r) => r.country_code === iso2 && r.feature_code === 'PPLC') ??
        results.find((r) => r.country_code === iso2)
      if (hit) capital = { latitude: hit.latitude, longitude: hit.longitude }
    } catch {
      // Border without a capital dot is still useful.
    }
  }
  return { rings, capital }
}

function getCountryShape(loc: Location): Promise<CountryShape> | null {
  const key = loc.countryCode ?? loc.country
  if (!key) return null
  let p = shapeCache.get(key)
  if (!p) {
    p = loadShape(loc.countryCode, loc.country)
    p.catch(() => shapeCache.delete(key))
    shapeCache.set(key, p)
  }
  return p
}

const MAX_W = 200
const MAX_H = 150
const PAD = 6 // keeps the dots inside the viewBox

export default function CountryMap({ location }: Props) {
  const [shape, setShape] = useState<CountryShape | null>(null)

  useEffect(() => {
    let alive = true
    setShape(null)
    getCountryShape(location)
      ?.then((s) => alive && setShape(s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [location])

  if (!shape || shape.rings.length === 0) return null

  // Bounds in lon/lat. If the country crosses the antimeridian (bbox wider
  // than 180°), shift negative longitudes by +360 to keep it contiguous.
  const border = shape.rings.flat()
  const lons = border.map(([lon]) => lon)
  const wrap = Math.max(...lons) - Math.min(...lons) > 180
  const adj = (lon: number) => (wrap && lon < 0 ? lon + 360 : lon)

  const points: [number, number][] = [
    [location.longitude, location.latitude],
    ...(shape.capital
      ? [[shape.capital.longitude, shape.capital.latitude] as [number, number]]
      : []),
    ...border,
  ]
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lon, lat] of points) {
    const l = adj(lon)
    minLon = Math.min(minLon, l)
    maxLon = Math.max(maxLon, l)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  // Equirectangular projection, longitude scaled by cos(mid-latitude).
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  const bw = (maxLon - minLon) * kx || 1e-6
  const bh = maxLat - minLat || 1e-6
  const scale = Math.min((MAX_W - 2 * PAD) / bw, (MAX_H - 2 * PAD) / bh)
  const w = Math.round(bw * scale + 2 * PAD)
  const h = Math.round(bh * scale + 2 * PAD)
  const px = (lon: number) => Math.round((PAD + (adj(lon) * kx - minLon * kx) * scale) * 10) / 10
  const py = (lat: number) => Math.round((PAD + (maxLat - lat) * scale) * 10) / 10

  const d = shape.rings
    .map((ring) => `M${ring.map(([lon, lat]) => `${px(lon)},${py(lat)}`).join('L')}Z`)
    .join('')

  return (
    <svg className="country-map" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={d} fill="none" stroke="var(--hair)" strokeWidth={1} strokeLinejoin="round" />
      {shape.capital && (
        <circle
          cx={px(shape.capital.longitude)}
          cy={py(shape.capital.latitude)}
          r={4}
          fill="var(--hair)"
        />
      )}
      <circle cx={px(location.longitude)} cy={py(location.latitude)} r={4} fill="var(--ink)" />
    </svg>
  )
}
