import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  Snowflake,
  CloudLightning,
  type Icon,
} from '@phosphor-icons/react'

export interface WeatherKind {
  Icon: Icon
  label: string
}

// WMO weather interpretation codes -> phosphor icon + label.
const MAP: Record<number, WeatherKind> = {
  0: { Icon: Sun, label: 'Clear' },
  1: { Icon: Sun, label: 'Mainly clear' },
  2: { Icon: CloudSun, label: 'Partly cloudy' },
  3: { Icon: Cloud, label: 'Overcast' },
  45: { Icon: CloudFog, label: 'Fog' },
  48: { Icon: CloudFog, label: 'Rime fog' },
  51: { Icon: CloudRain, label: 'Light drizzle' },
  53: { Icon: CloudRain, label: 'Drizzle' },
  55: { Icon: CloudRain, label: 'Heavy drizzle' },
  56: { Icon: CloudRain, label: 'Freezing drizzle' },
  57: { Icon: CloudRain, label: 'Freezing drizzle' },
  61: { Icon: CloudRain, label: 'Light rain' },
  63: { Icon: CloudRain, label: 'Rain' },
  65: { Icon: CloudRain, label: 'Heavy rain' },
  66: { Icon: CloudRain, label: 'Freezing rain' },
  67: { Icon: CloudRain, label: 'Freezing rain' },
  71: { Icon: CloudSnow, label: 'Light snow' },
  73: { Icon: CloudSnow, label: 'Snow' },
  75: { Icon: CloudSnow, label: 'Heavy snow' },
  77: { Icon: Snowflake, label: 'Snow grains' },
  80: { Icon: CloudRain, label: 'Light showers' },
  81: { Icon: CloudRain, label: 'Showers' },
  82: { Icon: CloudRain, label: 'Violent showers' },
  85: { Icon: CloudSnow, label: 'Snow showers' },
  86: { Icon: CloudSnow, label: 'Snow showers' },
  95: { Icon: CloudLightning, label: 'Thunderstorm' },
  96: { Icon: CloudLightning, label: 'Thunderstorm + hail' },
  99: { Icon: CloudLightning, label: 'Thunderstorm + hail' },
}

const FALLBACK: WeatherKind = { Icon: Cloud, label: 'Unknown' }

export function weatherKind(code: number): WeatherKind {
  return MAP[code] ?? FALLBACK
}