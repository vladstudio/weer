import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUp } from '@phosphor-icons/react'
import { getForecast } from '../api'
import { weatherKind } from '../weather'
import type { Forecast as ForecastData, HourPoint, Location } from '../types'
import WeatherCard from './WeatherCard'

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
    }
  }, [location])

  if (loading) return <div className="screen"><p className="muted">Loading…</p></div>
  if (error || !data) return <div className="screen"><p className="error">{error}</p></div>

  const { current, hourly, daily } = data

  // Base hour index = first hourly entry at/after current hour.
  const nowMs = new Date(current.time).getTime()
  const hourMs = Math.floor(nowMs / 3600000) * 3600000
  let baseIdx = hourly.findIndex((h) => new Date(h.time).getTime() >= hourMs)
  if (baseIdx < 0) baseIdx = 0
  const hourCards: HourPoint[] = HOURS.map((o) => hourly[baseIdx + o]).filter(Boolean)

  const hourTemps = [current.temperature, ...hourCards.map((h) => h.temperature)]
  const hMin = Math.min(...hourTemps)
  const hMax = Math.max(...hourTemps)

  const dMaxes = daily.map((d) => d.tempMax)
  const dRangeMax = Math.max(...dMaxes)
  const dRangeMin = Math.min(...dMaxes)

  const nowKind = weatherKind(current.weatherCode)
  const NowIcon = nowKind.Icon
  const nowArrow = current.windDirection + 180

  return (
    <div className="screen forecast">
      <header>
        <button className="back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} weight="bold" />
        </button>
        <span className="loc-name">
          {location.name}
          <small>{[location.admin1, location.country].filter(Boolean).join(', ')}</small>
        </span>
      </header>

      <section className="now">
        <div className={`now-card`}>
          <NowIcon size={64} weight="regular" className="now-icon" />
          <div className="now-main">
            <span className="now-temp">{Math.round(current.temperature)}°</span>
            <span className="now-label">{nowKind.label}</span>
          </div>
          <div className="now-wind">
            <ArrowUp
              size={20}
              weight="bold"
              style={{ transform: `rotate(${nowArrow}deg)` }}
            />
            <span>{current.windSpeed.toFixed(0)} m/s</span>
          </div>
          <span className="now-tag">NOW</span>
        </div>
        <div className="hours">
          {hourCards.map((h, i) => (
            <WeatherCard
              key={h.time}
              weatherCode={h.weatherCode}
              temp={h.temperature}
              windSpeed={h.windSpeed}
              windDirection={h.windDirection}
              caption={`+${HOURS[i]}h`}
              barFill={fill(h.temperature, hMin, hMax)}
            />
          ))}
        </div>
      </section>

      <section className="days">
        {daily.map((d, i) => {
          const dt = new Date(d.date + 'T00:00')
          const caption = i === 0 ? 'Today' : WEEKDAYS[dt.getDay()]
          return (
            <WeatherCard
              key={d.date}
              weatherCode={d.weatherCode}
              temp={d.tempMax}
              lowTemp={d.tempMin}
              windSpeed={d.windSpeedMax}
              caption={caption}
              barFill={fill(d.tempMax, dRangeMin, dRangeMax)}
              showArrow={false}
            />
          )
        })}
      </section>
    </div>
  )
}