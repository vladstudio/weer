import { useEffect, useState } from 'react'
import { useQueryState, parseAsInteger } from 'nuqs'
import SearchScreen from './components/SearchScreen'
import ForecastScreen from './components/ForecastScreen'
import { getLocationById } from './api'
import { addRecent, loadRecents } from './storage'
import type { Location } from './types'
import './App.css'

export default function App() {
  const [locId, setLocId] = useQueryState('loc', parseAsInteger)
  const [fetched, setFetched] = useState<Location | null>(null)

  const cached = locId != null ? (loadRecents().find((l) => l.id === locId) ?? null) : null
  const loc = cached ?? fetched

  useEffect(() => {
    if (locId == null) {
      setFetched(null)
      return
    }
    if (loadRecents().some((l) => l.id === locId)) {
      setFetched(null)
      return
    }
    let alive = true
    setFetched(null)
    getLocationById(locId)
      .then((l) => {
        if (alive) {
          addRecent(l)
          setFetched(l)
        }
      })
      .catch(() => {
        if (alive) setLocId(null)
      })
    return () => {
      alive = false
    }
  }, [locId, setLocId])

  if (locId != null && !loc) {
    return (
      <div className="screen">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return loc ? (
    <ForecastScreen location={loc} onBack={() => setLocId(null)} />
  ) : (
    <SearchScreen onSelect={setLocId} />
  )
}
