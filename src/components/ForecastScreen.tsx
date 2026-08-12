import { useEffect, useState } from 'react'
import { ArrowLeft, Wind, Radioactive } from '@phosphor-icons/react'
import { getForecast } from '../api'
import { weatherKind, precipIcon } from '../weather'
import { setWeatherFavicon, restoreFavicon } from '../favicon'
import CountryMap from './CountryMap'
import type { Forecast as ForecastData, HourPoint, Location } from '../types'

interface Props {
  location: Location
  onBack: () => void
}

const HOURS = [4, 8, 12, 16, 20, 24]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Functional color: cool blue -> warm orange across -10..35 °C.
// Curated RGB stops (lerped) to avoid muddy greens of a naive hue sweep.
const TEMP_STOPS: [number, number, number][] = [
  [74, 123, 208], // -10° blue
  [122, 158, 187], //  5° blue-gray
  [224, 166, 58], //  20° amber
  [224, 106, 56], //  35° orange
]

function tempColor(t: number): string {
  const x = Math.min(1, Math.max(0, (t + 10) / 45)) * (TEMP_STOPS.length - 1)
  const i = Math.min(TEMP_STOPS.length - 2, Math.floor(x))
  const f = x - i
  const [a, b] = [TEMP_STOPS[i], TEMP_STOPS[i + 1]]
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}

// Compact mm string: "0.3mm", "5mm", "12mm".
function mm(v: number): string {
  return `${v < 1 ? v.toFixed(1) : Math.round(v)}mm`
}

// UV Index is an absolute WHO scale — color signals the category:
// 0-2 low (green), 3-5 moderate (amber), 6-7 high (orange),
// 8-10 very high (red), 11+ extreme (purple).
function uvColor(uv: number): string {
  if (uv < 3) return '#3fa34d'
  if (uv < 6) return '#e0a32e'
  if (uv < 8) return '#e07a1e'
  if (uv < 11) return '#d4453b'
  return '#7b2cf0'
}

// More precipitation shifts from warm blue-gray to saturated warm blue.
function precipColor(mm: number): string {
  const x = Math.min(1, Math.max(0, mm / 15))
  const [r1, g1, b1] = [155, 183, 194]
  const [r2, g2, b2] = [36, 103, 169]
  return `rgb(${Math.round(r1 + (r2 - r1) * x)} ${Math.round(g1 + (g2 - g1) * x)} ${Math.round(b1 + (b2 - b1) * x)})`
}

export default function ForecastScreen({ location, onBack }: Props) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getForecast(location)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
      restoreFavicon()
    }
  }, [location])

  useEffect(() => {
    if (data) {
      const Icon = weatherKind(data.current.weatherCode, data.current.isDay).Icon
      queueMicrotask(() => setWeatherFavicon(Icon))
    }
  }, [data])

  if (loading)
    return (
      <div className="screen">
        <p className="muted">Loading…</p>
      </div>
    )
  if (error || !data)
    return (
      <div className="screen">
        <p className="error">{error}</p>
      </div>
    )

  const { current, hourly, daily } = data

  // Base hour index = first hourly entry at/after current hour.
  const nowMs = new Date(current.time).getTime()
  const hourMs = Math.floor(nowMs / 3600000) * 3600000
  let baseIdx = hourly.findIndex((h) => new Date(h.time).getTime() >= hourMs)
  if (baseIdx < 0) baseIdx = 0
  const hourCards: HourPoint[] = HOURS.map((o) => hourly[baseIdx + o]).filter(Boolean)

  const weekMin = Math.min(...daily.map((d) => d.tempMin))
  const weekMax = Math.max(...daily.map((d) => d.tempMax))
  const weekSpan = weekMax - weekMin || 1

  const nowKind = weatherKind(current.weatherCode, current.isDay)
  const NowIcon = nowKind.Icon
  const NowPrecip = precipIcon(current.weatherCode)

  return (
    <div className="screen forecast">
      <div className="now-row">
        <div className="loc-col">
          <header>
            <button className="back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={20} />
            </button>
            <span className="loc-name">
              {location.name}
              <small>{[location.admin1, location.country].filter(Boolean).join(', ')}</small>
            </span>
          </header>
          <CountryMap location={location} />
        </div>

        <section className="now">
          <span className="now-temp">{Math.round(current.temperature)}°</span>
          <div className="now-meta">
            <NowIcon size={20} aria-hidden />
            <span>{nowKind.label}</span>
            <span className="sep" aria-hidden>
              ·
            </span>
            <Wind size={16} aria-hidden />
            <span>{current.windSpeed.toFixed(0)} m/s</span>
            {current.precipitation > 0 && (
              <>
                <span className="sep" aria-hidden>
                  ·
                </span>
                <span style={{ color: precipColor(current.precipitation) }}>
                  <NowPrecip size={16} aria-hidden />
                  {mm(current.precipitation)}
                </span>
              </>
            )}
            <span className="sep" aria-hidden>
              ·
            </span>
            <Radioactive size={16} aria-hidden />
            <span style={{ color: uvColor(current.uvIndex) }}>{current.uvIndex.toFixed(1)}</span>
          </div>
        </section>
      </div>

      <section className="hours">
        <div className="hour-grid">
          {hourCards.map((h) => {
            const kind = weatherKind(h.weatherCode, h.isDay)
            const HIcon = kind.Icon
            const PIcon = precipIcon(h.weatherCode)
            const hh = new Date(h.time).getHours()
            return (
              <div className="hour" key={h.time}>
                <span className="hour-time">{String(hh).padStart(2, '0')}:00</span>
                <HIcon size={22} aria-label={kind.label} />
                <span className="hour-temp">{Math.round(h.temperature)}°</span>
                <span className="hour-wind">
                  <Wind size={11} aria-hidden />
                  {h.windSpeed.toFixed(0)} m/s
                </span>
                {h.precipitation > 0 && (
                  <span className="hour-precip" style={{ color: precipColor(h.precipitation) }}>
                    <PIcon size={11} aria-hidden />
                    {mm(h.precipitation)}
                  </span>
                )}
                {h.uvIndex > 0 && (
                  <span className="hour-uv" style={{ color: uvColor(h.uvIndex) }}>
                    <Radioactive size={11} aria-hidden />
                    {h.uvIndex.toFixed(1)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="days">
        {daily.map((d, i) => {
          const dt = new Date(d.date + 'T00:00')
          const weekday = i === 0 ? 'Today' : WEEKDAYS[dt.getDay()]
          const monthday = `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
          const kind = weatherKind(d.weatherCode)
          const DIcon = kind.Icon
          const DPre = precipIcon(d.weatherCode)
          const left = ((d.tempMin - weekMin) / weekSpan) * 100
          const width = Math.max(4, ((d.tempMax - d.tempMin) / weekSpan) * 100)
          return (
            <div className="day-row" key={d.date}>
              <span className="day-name">
                <span className="day-date">{monthday}</span>
                <span className="day-wk">{weekday}</span>
              </span>
              <DIcon size={20} aria-label={kind.label} />
              <span className="day-min">{Math.round(d.tempMin)}°</span>
              <span className="range">
                <span
                  className="range-fill"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${tempColor(d.tempMin)}, ${tempColor(d.tempMax)})`,
                  }}
                />
              </span>
              <span className="day-max">{Math.round(d.tempMax)}°</span>
              <span
                className="day-precip"
                style={
                  d.precipitationSum > 0 ? { color: precipColor(d.precipitationSum) } : undefined
                }
              >
                {d.precipitationSum > 0 && (
                  <>
                    <DPre size={12} aria-hidden />
                    {mm(d.precipitationSum)}
                  </>
                )}
              </span>
              <span className="day-uv" style={{ color: uvColor(d.uvIndexMax) }}>
                <Radioactive size={12} aria-hidden />
                {d.uvIndexMax.toFixed(1)}
              </span>
              <span className="day-wind">
                <Wind size={12} aria-hidden />
                {d.windSpeedMax.toFixed(0)} m/s
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
