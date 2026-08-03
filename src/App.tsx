import { useEffect } from 'react'
import { useQueryState, parseAsInteger } from 'nuqs'
import SearchScreen from './components/SearchScreen'
import ForecastScreen from './components/ForecastScreen'
import { loadRecents } from './storage'
import './App.css'

export default function App() {
  const [locId, setLocId] = useQueryState('loc', parseAsInteger)

  const loc = locId != null ? loadRecents().find((l) => l.id === locId) ?? null : null

  // Clear an unresolvable id (e.g. shared link, evicted recent).
  useEffect(() => {
    if (locId != null && !loc) setLocId(null)
  }, [locId, loc, setLocId])

  return loc ? (
    <ForecastScreen location={loc} onBack={() => setLocId(null)} />
  ) : (
    <SearchScreen onSelect={setLocId} />
  )
}