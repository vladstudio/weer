import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUp } from '@phosphor-icons/react'
import { getForecast } from '../api'
import { weatherKind } from '../weather'
import { setWeatherFavicon, restoreFavicon } from '../favicon'
import type { Forecast as ForecastData, HourPoint, Location } from '../types'

interface Props {
  location: Location
  onBack: () => void
}

const HOURS = [4, 8, 12, 16, 20]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fill(temp: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.min(1, Math.max(0, (temp - min) / (max - min)))
}

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
      const Icon = weatherKind(data.current.weatherCode).Icon
      queueMicrotask(() => setWeatherFavicon(Icon))
    }
  }, [data])

  if (loading) return <div className="screen"><p className="muted">Loading…</p></div>
  if (error || !data) return <div className="screen"><p className="error">{error}</p></div>

  const { current, hourly, daily } = data

  // Base hour index = first hourly entry at/after current hour.
  const nowMs = new Date(current.time).getTime()
  const hourMs = Math.floor(nowMs / 3600000) * 3600000
  let baseIdx = hourly.findIndex((h) => new Date(h.time).getTime() >= hourMs)
  if (baseIdx < 0) baseIdx = 0
  const hourCards: HourPoint[] = HOURS.map((o) => hourly[baseIdx + o]).filter(Boolean)

  const hourTemps = hourCards.map((h) => h.temperature)
  const hMin = Math.min(...hourTemps)
  const hMax = Math.max(...hourTemps)

  const weekMin = Math.min(...daily.map((d) => d.tempMin))
  const weekMax = Math.max(...daily.map((d) => d.tempMax))
  const weekSpan = weekMax - weekMin || 1

  const nowKind = weatherKind(current.weatherCode)
  const NowIcon = nowKind.Icon
  const nowArrow = current.windDirection + 180

  return (
    <div className="screen forecast">
      <header>
        <button className="back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="loc-name">
          {location.name}
          <small>{[location.admin1, location.country].filter(Boolean).join(', ')}</small>
        </span>
      </header>

      <section className="now">
        <span className="now-temp">{Math.round(current.temperature)}°</span>
        <div className="now-meta">
          <NowIcon size={20} aria-hidden />
          <span>{nowKind.label}</span>
          <span className="sep" aria-hidden>·</span>
          <ArrowUp size={13} weight="bold" style={{ transform: `rotate(${nowArrow}deg)` }} />
          <span>{current.windSpeed.toFixed(0)} m/s</span>
        </div>
      </section>

      <section className="hours">
        <h2 className="kicker">Coming hours</h2>
        <div className="hour-grid">
          {hourCards.map((h) => {
            const kind = weatherKind(h.weatherCode)
            const HIcon = kind.Icon
            const hh = new Date(h.time).getHours()
            return (
              <div className="hour" key={h.time}>
                <span className="hour-time">{String(hh).padStart(2, '0')}:00</span>
                <HIcon size={22} aria-label={kind.label} />
                <span className="hour-temp">{Math.round(h.temperature)}°</span>
                <span
                  className="hour-mark"
                  style={{
                    width: `${20 + fill(h.temperature, hMin, hMax) * 80}%`,
                    background: tempColor(h.temperature),
                  }}
                />
                <span className="hour-wind">
                  <ArrowUp
                    size={11}
                    weight="bold"
                    style={{ transform: `rotate(${h.windDirection + 180}deg)` }}
                  />
                  {h.windSpeed.toFixed(0)}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="days">
        <h2 className="kicker">Next {daily.length} days</h2>
        {daily.map((d, i) => {
          const dt = new Date(d.date + 'T00:00')
          const caption = i === 0 ? 'Today' : WEEKDAYS[dt.getDay()]
          const kind = weatherKind(d.weatherCode)
          const DIcon = kind.Icon
          const left = ((d.tempMin - weekMin) / weekSpan) * 100
          const width = Math.max(4, ((d.tempMax - d.tempMin) / weekSpan) * 100)
          return (
            <div className="day-row" key={d.date}>
              <span className="day-name">{caption}</span>
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
              <span className="day-wind">{d.windSpeedMax.toFixed(0)} m/s</span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
