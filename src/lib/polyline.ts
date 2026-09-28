export type LatLng = [number, number]

/** Decodeert een Google encoded polyline (zoals Strava routes aanlevert) naar [lat, lng]-punten. */
export function decodePolyline(str: string): LatLng[] {
  const points: LatLng[] = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < str.length) {
    for (let axis = 0; axis < 2; axis++) {
      let shift = 0
      let result = 0
      let b: number
      do {
        b = str.charCodeAt(i++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}
