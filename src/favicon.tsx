import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Icon } from '@phosphor-icons/react'

// Matches the brand accent of the default favicon.svg.
const BRAND = '#863bff'

function faviconLink(): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'icon'
    document.head.appendChild(el)
  }
  return el
}

// Render the Phosphor icon to an SVG string via the already-bundled
// react-dom client renderer (flushSync forces a synchronous commit).
function iconToSvg(Icon: Icon): string {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => {
    root.render(<Icon size={256} weight="fill" color={BRAND} aria-hidden />)
  })
  const svg = container.innerHTML
  root.unmount()
  return svg
}

export function setWeatherFavicon(Icon: Icon) {
  faviconLink().href = `data:image/svg+xml,${encodeURIComponent(iconToSvg(Icon))}`
}

export function restoreFavicon() {
  faviconLink().href = '/favicon.svg'
}