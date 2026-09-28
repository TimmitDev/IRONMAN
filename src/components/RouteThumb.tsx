import { useMemo } from 'react'
import { decodePolyline } from '../lib/polyline'
import { SPORT_HEX, type Sport } from '../lib/types'

/** Kleine routeschets zonder kaart, voor in lijsten. Licht: geen kaarttegels, enkel de vorm. */
export function RouteThumb({ polyline, sport, className = 'size-10' }: { polyline: string; sport: Sport; className?: string }) {
  const path = useMemo(() => {
    const pts = decodePolyline(polyline)
    if (pts.length < 2) return null
    // Equirectangulair: lengtegraden krimpen met cos(breedte), anders oogt de route uitgerekt.
    const k = Math.cos((pts[0][0] * Math.PI) / 180)
    const xs = pts.map(([, lng]) => lng * k)
    const ys = pts.map(([lat]) => -lat)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1
    const pad = 4
    const size = 40 - pad * 2
    // Centreren binnen het vierkant.
    const offX = (size - ((Math.max(...xs) - minX) / span) * size) / 2
    const offY = (size - ((Math.max(...ys) - minY) / span) * size) / 2
    return xs
      .map((x, i) => `${i ? 'L' : 'M'}${(pad + offX + ((x - minX) / span) * size).toFixed(1)} ${(pad + offY + ((ys[i] - minY) / span) * size).toFixed(1)}`)
      .join('')
  }, [polyline])

  if (!path) return null
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 rounded-lg bg-subtle ${className}`} aria-hidden>
      <path d={path} fill="none" stroke={SPORT_HEX[sport]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
