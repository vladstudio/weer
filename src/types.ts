export interface Location {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

export interface CurrentWeather {
  time: string
  temperature: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  precipitation: number
  isDay: number
}

export interface HourPoint {
  time: string
  temperature: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  precipitation: number
  isDay: number
}

export interface DayPoint {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
  windSpeedMax: number
  precipitationSum: number
  uvIndexMax: number
}

export interface Forecast {
  current: CurrentWeather
  hourly: HourPoint[]
  daily: DayPoint[]
  timezone: string
}
