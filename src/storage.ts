import type { Location } from './types'

const KEY = 'weer.recents'

export function loadRecents(): Location[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveRecents(list: Location[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function addRecent(loc: Location): Location[] {
  const list = loadRecents().filter((l) => l.id !== loc.id)
  const next = [loc, ...list].slice(0, 10)
  saveRecents(next)
  return next
}

export function removeRecent(id: number): Location[] {
  const next = loadRecents().filter((l) => l.id !== id)
  saveRecents(next)
  return next
}
