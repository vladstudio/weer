import { ArrowUp } from '@phosphor-icons/react'
import { weatherKind } from '../weather'

interface Props {
  weatherCode: number
  temp: number
  windSpeed: number
  windDirection?: number
  caption: string
  barFill: number // 0..1 within sibling set
  lowTemp?: number
  highlight?: boolean
  showArrow?: boolean
}

export default function WeatherCard({
  weatherCode,
  temp,
  windSpeed,
  windDirection,
  caption,
  barFill,
  lowTemp,
  highlight,
  showArrow = true,
}: Props) {
  const { Icon, label } = weatherKind(weatherCode)
  // Wind direction = bearing wind blows FROM. Arrow points where wind goes TO.
  const arrowRotation = (windDirection ?? 0) + 180

  return (
    <div className={`card${highlight ? ' highlight' : ''}`}>
      <span className="caption">{caption}</span>
      <Icon size={28} weight="regular" className="wicon" aria-label={label} />
      <div className="bar-wrap">
        <span className="temp">{Math.round(temp)}°</span>
        <div className="bar">
          <div className="bar-fill" style={{ height: `${Math.max(4, barFill * 100)}%` }} />
        </div>
        {lowTemp !== undefined && <span className="low">{Math.round(lowTemp)}°</span>}
      </div>
      <div className="wind">
        {showArrow && (
          <ArrowUp
            size={14}
            weight="bold"
            style={{ transform: `rotate(${arrowRotation}deg)` }}
          />
        )}
        <span>{windSpeed.toFixed(0)}</span>
      </div>
    </div>
  )
}