import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlass, Crosshair, X } from '@phosphor-icons/react'
import { searchLocations, reverseGeocode } from '../api'
import { addRecent, loadRecents, removeRecent } from '../storage'
import type { Location } from '../types'

interface Props {
  onSelect: (id: number) => void
}

export default function SearchScreen({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recents, setRecents] = useState<Location[]>([])
  const [locating, setLocating] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setRecents(loadRecents()), [])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        setResults(await searchLocations(query))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [query])

  function pick(loc: Location) {
    setRecents(addRecent(loc))
    setQuery('')
    setResults([])
    onSelect(loc.id)
  }

  async function findMe() {
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          pick(loc)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Reverse geocoding failed')
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        setError(err.message)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  function remove(id: number) {
    setRecents(removeRecent(id))
  }

  return (
    <div className="screen search">
      <header>
        <span className="brand">Weer</span>
      </header>

      <div className="search-bar">
        <MagnifyingGlass size={20} weight="bold" className="search-icon" />
        <input
          type="text"
          placeholder="Search a city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className="clear" onClick={() => setQuery('')} aria-label="Clear">
            <X size={18} />
          </button>
        )}
        <button className="find-me" onClick={findMe} disabled={locating} title="Use my location">
          <Crosshair size={20} weight="bold" />
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {query.trim().length >= 2 ? (
        <ul className="results">
          {loading && <li className="muted">Searching…</li>}
          {!loading && results.length === 0 && <li className="muted">No matches</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button className="result" onClick={() => pick(r)}>
                <strong>{r.name}</strong>
                <small>{[r.admin1, r.country].filter(Boolean).join(', ')}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        recents.length > 0 && (
          <div className="recents">
            <h2 className="kicker">Recent</h2>
            <ul className="results">
              {recents.map((r) => (
                <li key={r.id} className="recent-row">
                  <button className="result" onClick={() => pick(r)}>
                    <strong>{r.name}</strong>
                    <small>{[r.admin1, r.country].filter(Boolean).join(', ')}</small>
                  </button>
                  <button className="delete" onClick={() => remove(r.id)} aria-label="Remove">
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  )
}
