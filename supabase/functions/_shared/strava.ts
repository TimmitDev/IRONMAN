// Gedeelde Strava-logica voor de Edge Functions `strava` en `strava-webhook` (Deno).
import { createClient } from 'npm:@supabase/supabase-js@2'

/** Service-role client: omzeilt RLS, dus enkel server-side gebruiken. */
export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')

type Sport = 'swim' | 'bike' | 'run' | 'strength' | 'cardio'

export interface Connection {
  user_id: string
  athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: string
  last_synced_at: string | null
}

export interface StravaActivity {
  id: number
  name?: string
  sport_type?: string
  type?: string
  moving_time: number
  distance: number
  /** Alleen in de detailweergave (webhook); niet in de lijst. */
  calories?: number
  /** Arbeid op de pedalen bij ritten met vermogen. */
  kilojoules?: number
  start_date_local: string
  map?: { summary_polyline?: string | null; polyline?: string | null }
}

// --- Routes (Google encoded polyline) ---

type LatLng = [number, number]

function decodePolyline(str: string): LatLng[] {
  const points: LatLng[] = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < str.length) {
    for (const axis of [0, 1]) {
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

function encodePolyline(points: LatLng[]): string {
  let out = ''
  let prevLat = 0
  let prevLng = 0
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63)
      n >>= 5
    }
    out += String.fromCharCode(n + 63)
  }
  for (const [la, ln] of points) {
    const lat = Math.round(la * 1e5)
    const lng = Math.round(ln * 1e5)
    enc(lat - prevLat)
    enc(lng - prevLng)
    prevLat = lat
    prevLng = lng
  }
  return out
}

function metersBetween([lat1, lng1]: LatLng, [lat2, lng2]: LatLng) {
  const r = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a))
}

/** Publieke versie van een route: zonder de eerste en laatste `trim` meter, zodat start en finish verborgen blijven. */
function publicRoute(polyline: string, trim = 300): string {
  const pts = decodePolyline(polyline)
  if (pts.length < 2) return ''
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + metersBetween(pts[i - 1], pts[i]))
  const total = cum[cum.length - 1]
  if (total < trim * 2 + 200) return '' // te kort om zinvol in te korten
  const kept = pts.filter((_, i) => cum[i] >= trim && cum[i] <= total - trim)
  return kept.length >= 2 ? encodePolyline(kept) : ''
}

/** Route-kolommen voor een activiteit. Lege string = gecontroleerd, geen route (binnen, zwembad, kracht). */
function routeFields(a: StravaActivity) {
  const polyline = a.map?.summary_polyline || a.map?.polyline || ''
  return { route_polyline: polyline, route_public: polyline ? publicRoute(polyline) : '' }
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number; firstname?: string; lastname?: string }
}

export async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET ontbreken als Supabase-secret.')
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Strava weigerde de aanvraag.')
  return json as TokenResponse
}

/** Geldig access token; vernieuwt en bewaart het als het (bijna) verlopen is. */
export async function validToken(conn: Connection): Promise<string> {
  if (new Date(conn.expires_at).getTime() - 60_000 > Date.now()) return conn.access_token
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: conn.refresh_token })
  await admin
    .from('strava_connections')
    .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString() })
    .eq('user_id', conn.user_id)
  return t.access_token
}

export async function stravaGet<T>(token: string, path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 429) throw new Error('Strava-limiet bereikt. Probeer het over een kwartier opnieuw.')
  if (res.status === 404) return { status: 404, data: null }
  if (!res.ok) throw new Error(`Strava gaf fout ${res.status}.`)
  return { status: res.status, data: (await res.json()) as T }
}

// Strava-sporttypes naar de sporten van de app; al de rest (wandelen, yoga …) wordt niet geïmporteerd.
const SPORTS: Record<string, Sport> = {
  Swim: 'swim',
  Ride: 'bike',
  VirtualRide: 'bike',
  GravelRide: 'bike',
  MountainBikeRide: 'bike',
  EBikeRide: 'bike',
  EMountainBikeRide: 'bike',
  Velomobile: 'bike',
  Handcycle: 'bike',
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  WeightTraining: 'strength',
  Crossfit: 'strength',
  HighIntensityIntervalTraining: 'strength',
  Workout: 'strength',
}

// Strava-sporttypes die als cardio binnenkomen, met de soort uit CARDIO_TYPES (src/lib/types.ts).
const CARDIO: Record<string, string> = {
  Rowing: 'rowing',
  VirtualRow: 'rowing',
  Elliptical: 'crosstrainer',
  StairStepper: 'stairmaster',
}

interface WorkoutRow {
  user_id: string
  strava_activity_id: number
  date: string
  sport: Sport
  cardio_type: string | null
  kcal: number | null
  duration_min: number
  distance_km: number | null
  notes: string | null
  route_polyline: string
  route_public: string
}

function toWorkout(a: StravaActivity, userId: string): WorkoutRow | null {
  const type = a.sport_type ?? a.type ?? ''
  const cardioType = CARDIO[type] ?? null
  const sport: Sport | undefined = cardioType ? 'cardio' : SPORTS[type]
  if (!sport || !a.moving_time) return null
  return {
    user_id: userId,
    strava_activity_id: a.id,
    date: a.start_date_local.slice(0, 10),
    sport,
    cardio_type: cardioType,
    // Gemeten calorieën als Strava ze heeft; anders kJ op de pedalen (≈ kcal verbrand, want het lichaam is ~24% efficiënt
    // en 1 kcal = 4,184 kJ: die twee heffen elkaar zo goed als op). Zonder beide schat de app zelf (src/lib/kcal.ts).
    kcal: a.calories ? Math.round(a.calories) : a.kilojoules ? Math.round(a.kilojoules) : null,
    // Bewegingstijd, zoals Strava die ook als "tijd" toont; minuten met 4 decimalen zoals de database.
    duration_min: Math.round((a.moving_time / 60) * 10000) / 10000,
    distance_km: sport === 'strength' || !a.distance ? null : Math.round(a.distance / 10) / 100,
    notes: a.name?.slice(0, 200) || null,
    ...routeFields(a),
  }
}

/** Zelfde sessie? Zelfde dag en sport, duur binnen 20%. */
const sameSession = (a: { duration_min: number }, b: { duration_min: number }) =>
  Math.abs(a.duration_min - b.duration_min) <= Math.max(a.duration_min, b.duration_min) * 0.2

/** Koppelt nieuwe trainingen aan een open geplande sessie op dezelfde dag en sport (dichtste duur). */
async function linkPlanned(workouts: { id: string; user_id: string; date: string; sport: string; duration_min: number }[]) {
  let linked = 0
  for (const w of workouts) {
    const { data } = await admin
      .from('planned_workouts')
      .select('id, duration_min')
      .eq('user_id', w.user_id)
      .eq('date', w.date)
      .eq('sport', w.sport)
      .is('workout_id', null)
    if (!data?.length) continue
    const best = data.sort((a, b) => Math.abs(Number(a.duration_min) - w.duration_min) - Math.abs(Number(b.duration_min) - w.duration_min))[0]
    const { error } = await admin.from('planned_workouts').update({ workout_id: w.id }).eq('id', best.id).is('workout_id', null)
    if (!error) linked++
  }
  return linked
}

/**
 * Importeert activiteiten als trainingen.
 * - Al geïmporteerd: overgeslagen, of met `overwrite` bijgewerkt (webhook "update"; je eigen notities blijven).
 * - Staat dezelfde sessie er al met de hand in (bv. afgevinkt vóór de sync): die krijgt enkel het Strava-ID, geen dubbel.
 * - Nieuw: ingevoegd en waar mogelijk aan een geplande sessie gekoppeld.
 */
export async function importActivities(userId: string, activities: StravaActivity[], overwrite = false) {
  const rows = activities.map((a) => toWorkout(a, userId)).filter((r): r is WorkoutRow => r !== null)
  if (!rows.length) return { imported: 0, linked: 0 }

  const { data: existing, error: existingError } = await admin
    .from('workouts')
    .select('strava_activity_id')
    .eq('user_id', userId)
    .in('strava_activity_id', rows.map((r) => r.strava_activity_id))
  if (existingError) throw existingError
  const known = new Set((existing ?? []).map((e) => Number(e.strava_activity_id)))

  if (overwrite) {
    for (const r of rows.filter((r) => known.has(r.strava_activity_id))) {
      const { notes: _notes, ...fields } = r
      await admin.from('workouts').update(fields).eq('user_id', userId).eq('strava_activity_id', r.strava_activity_id)
    }
  } else if (known.size) {
    // Eerder geïmporteerd zonder route (van vóór de routes): alsnog aanvullen.
    const { data: missing } = await admin
      .from('workouts')
      .select('strava_activity_id')
      .eq('user_id', userId)
      .in('strava_activity_id', [...known])
      .is('route_polyline', null)
    for (const m of missing ?? []) {
      const r = rows.find((x) => x.strava_activity_id === Number(m.strava_activity_id))
      if (r) {
        await admin
          .from('workouts')
          .update({ route_polyline: r.route_polyline, route_public: r.route_public })
          .eq('user_id', userId)
          .eq('strava_activity_id', r.strava_activity_id)
      }
    }
  }

  const fresh = rows.filter((r) => !known.has(r.strava_activity_id))
  if (!fresh.length) return { imported: 0, linked: 0 }

  // Handmatig gelogde trainingen in dezelfde periode, om dubbels te vermijden.
  const dates = fresh.map((r) => r.date).sort()
  const { data: manual } = await admin
    .from('workouts')
    .select('id, date, sport, duration_min')
    .eq('user_id', userId)
    .is('strava_activity_id', null)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
  const candidates = (manual ?? []).map((m) => ({ ...m, duration_min: Number(m.duration_min) }))

  const toInsert: WorkoutRow[] = []
  let merged = 0
  for (const r of fresh) {
    const i = candidates.findIndex((m) => m.date === r.date && m.sport === r.sport && sameSession(m, r))
    if (i >= 0) {
      await admin
        .from('workouts')
        .update({ strava_activity_id: r.strava_activity_id, route_polyline: r.route_polyline, route_public: r.route_public })
        .eq('id', candidates[i].id)
      candidates.splice(i, 1)
      merged++
    } else toInsert.push(r)
  }

  if (!toInsert.length) return { imported: 0, linked: merged }
  const { data: inserted, error } = await admin.from('workouts').insert(toInsert).select('id, user_id, date, sport, duration_min')
  if (error) throw error
  const linked = await linkPlanned((inserted ?? []).map((w) => ({ ...w, duration_min: Number(w.duration_min) })))
  return { imported: inserted?.length ?? 0, linked: linked + merged }
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
