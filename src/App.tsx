import { useState } from 'react'
import SearchScreen from './components/SearchScreen'
import ForecastScreen from './components/ForecastScreen'
import type { Location } from './types'
import './App.css'

export default function App() {
  const [loc, setLoc] = useState<Location | null>(null)

  return loc ? (
    <ForecastScreen location={loc} onBack={() => setLoc(null)} />
  ) : (
    <SearchScreen onSelect={setLoc} />
  )
}