import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { decodePolyline } from '../lib/polyline'
import { useTheme } from '../lib/theme'
import { SPORT_HEX, type Sport } from '../lib/types'

// Standaardkaart van OpenStreetMap: geen API-sleutel nodig, wel naamsvermelding. In dark mode maakt
// een CSS-filter (.map-tiles-dark in index.css) de tegels donker; de routelijn zelf blijft ongefilterd.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/**
 * Route op een kaart. Leaflet laadt pas wanneer er echt een kaart getoond wordt.
 * Niet-interactief (standaard) in de feed, zodat scrollen op mobiel nooit in de kaart blijft hangen.
 */
export function RouteMap({
  polyline,
  sport,
  interactive = false,
  className = 'h-52',
}: {
  polyline: string
  sport: Sport
  interactive?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolved } = useTheme()

  useEffect(() => {
    let map: import('leaflet').Map | undefined
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !ref.current) return
      const pts = decodePolyline(polyline)
      if (pts.length < 2) return

      map = L.map(ref.current, {
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: true,
      })
      map.attributionControl.setPrefix(false)
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, className: resolved === 'dark' ? 'map-tiles-dark' : '' }).addTo(map)

      // Donkere rand onder de lijn, zodat de route op elke ondergrond leesbaar blijft.
      L.polyline(pts, { color: resolved === 'dark' ? '#000' : '#fff', weight: 7, opacity: 0.6 }).addTo(map)
      const line = L.polyline(pts, { color: SPORT_HEX[sport], weight: 4, opacity: 1 }).addTo(map)
      const dot = (fill: string) => ({ radius: 5, color: '#fff', weight: 2, fillColor: fill, fillOpacity: 1 })
      L.circleMarker(pts[0], dot('#16a34a')).addTo(map)
      L.circleMarker(pts[pts.length - 1], dot('#dc2626')).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [24, 24] })
    })

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [polyline, sport, interactive, resolved])

  // `isolate`: Leaflet gebruikt hoge z-indexen; zo blijven die binnen de kaart en onder de balken en vensters.
  return <div ref={ref} className={`isolate overflow-hidden rounded-lg border border-line bg-muted ${className}`} role="img" aria-label="Kaart van de route" />
}
