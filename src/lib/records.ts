import { useMemo } from 'react'
import { SPORT_LABEL, type Workout } from './types'

// Persoonlijke records en mijlpalen. Trainingen hebben geen splits: een record is het gemiddelde tempo
// van een hele sessie die minstens de afstand haalde, omgerekend naar die afstand.

export const RECORD_SPORTS = ['swim', 'bike', 'run'] as const
export type RecordSport = (typeof RECORD_SPORTS)[number]

/** Afstandsklassen in km, van kort naar lang. Zelfde waarden als in migratie 012_highlights.sql. */
export const BUCKETS: Record<RecordSport, number[]> = {
  run: [5, 10, 21.1, 42.2],
  bike: [40, 90, 180],
  swim: [1, 1.9, 3.8],
}

/** Een sessie telt voor een klasse vanaf 99% van de afstand (gps-afronding). */
export const BUCKET_TOLERANCE = 0.99

const BUCKET_NAME: Partial<Record<string, string>> = {
  'run:21.1': 'halve marathon',
  'run:42.2': 'marathon',
}

/** "10 km", "halve marathon", "1,9 km". */
export function bucketLabel(sport: string, km: number): string {
  return BUCKET_NAME[`${sport}:${km}`] ?? `${km.toLocaleString('nl-BE')} km`
}

export const reachesBucket = (km: number | null, bucket: number) => (km ?? 0) >= bucket * BUCKET_TOLERANCE

export interface BucketRecord {
  km: number
  label: string
  /** Snelste sessie die de afstand haalde, of null als de klasse nog niet gehaald is. */
  best: {
    /** Geschatte tijd over de klasse-afstand: tempo × afstand. */
    minutes: number
    /** Minuten per km. */
    pace: number
    date: string
    workoutId: string
  } | null
  /** Datum waarop de klasse voor het eerst gehaald werd. */
  firstDate: string | null
}

export interface Longest {
  distance: { km: number; date: string; workoutId: string } | null
  duration: { minutes: number; date: string; workoutId: string } | null
}

export interface SportRecords {
  sport: RecordSport
  buckets: BucketRecord[]
  longest: Longest
  sessions: number
}

export type MilestoneKind = 'km' | 'hours' | 'sessions'

export interface Milestone {
  kind: MilestoneKind
  sport: RecordSport | null
  target: number
  label: string
  reached: boolean
  /** Datum waarop het totaal de grens overschreed. */
  date: string | null
}

/** Eén reeks mijlpalen (bv. km lopen) met het huidige totaal en de eerstvolgende grens. */
export interface MilestoneTrack {
  key: string
  kind: MilestoneKind
  sport: RecordSport | null
  title: string
  total: number
  milestones: Milestone[]
  next: Milestone | null
  /** Voortgang naar `next`, 0–1 (totaal / grens). */
  progress: number
}

const MILESTONE_KM: Record<RecordSport, number[]> = {
  run: [100, 250, 500, 1000, 2500],
  bike: [500, 1000, 2500, 5000, 10000],
  swim: [25, 50, 100, 250, 500],
}
const MILESTONE_HOURS = [25, 50, 100, 250, 500, 1000]
const MILESTONE_SESSIONS = [25, 50, 100, 250, 500]

const num = (n: number) => n.toLocaleString('nl-BE')

export function milestoneLabel(kind: MilestoneKind, target: number, sport: RecordSport | null = null): string {
  if (kind === 'km') return `${num(target)} km ${SPORT_LABEL[sport ?? 'run'].toLowerCase()}`
  if (kind === 'hours') return `${num(target)} uur training`
  return `${num(target)} sessies`
}

/** Chronologisch: oudste eerst, bij dezelfde datum op aanmaakmoment. */
const chronological = (a: Workout, b: Workout) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)

function sportRecords(sport: RecordSport, sorted: Workout[]): SportRecords {
  const list = sorted.filter((w) => w.sport === sport)
  const buckets = BUCKETS[sport].map((km): BucketRecord => {
    let best: BucketRecord['best'] = null
    let firstDate: string | null = null
    for (const w of list) {
      if (!w.distance_km || w.duration_min <= 0 || !reachesBucket(w.distance_km, km)) continue
      firstDate ??= w.date
      const pace = w.duration_min / w.distance_km
      // Strikt sneller: bij gelijk tempo blijft de eerste sessie het record.
      if (!best || pace < best.pace) best = { minutes: pace * km, pace, date: w.date, workoutId: w.id }
    }
    return { km, label: bucketLabel(sport, km), best, firstDate }
  })

  const longest: Longest = { distance: null, duration: null }
  for (const w of list) {
    if (w.distance_km && (!longest.distance || w.distance_km > longest.distance.km))
      longest.distance = { km: w.distance_km, date: w.date, workoutId: w.id }
    if (w.duration_min > 0 && (!longest.duration || w.duration_min > longest.duration.minutes))
      longest.duration = { minutes: w.duration_min, date: w.date, workoutId: w.id }
  }

  return { sport, buckets, longest, sessions: list.length }
}

/** Telt `value` per sessie chronologisch op en noteert wanneer elke grens overschreden werd. */
function track(
  key: string,
  kind: MilestoneKind,
  sport: RecordSport | null,
  title: string,
  targets: number[],
  sorted: Workout[],
  value: (w: Workout) => number,
): MilestoneTrack {
  const milestones: Milestone[] = targets.map((target) => ({ kind, sport, target, label: milestoneLabel(kind, target, sport), reached: false, date: null }))
  let total = 0
  for (const w of sorted) {
    if (sport && w.sport !== sport) continue
    total += value(w)
    for (const m of milestones) {
      if (!m.reached && total >= m.target) {
        m.reached = true
        m.date = w.date
      }
    }
  }
  const next = milestones.find((m) => !m.reached) ?? null
  return { key, kind, sport, title, total, milestones, next, progress: next ? Math.min(1, total / next.target) : 1 }
}

export interface Records {
  sports: SportRecords[]
  milestones: MilestoneTrack[]
  /** Alle gehaalde mijlpalen, nieuwste eerst. */
  reached: Milestone[]
}

export function computeRecords(workouts: Workout[]): Records {
  const sorted = [...workouts].sort(chronological)
  const sports = RECORD_SPORTS.map((s) => sportRecords(s, sorted))

  const milestones = [
    ...RECORD_SPORTS.map((s) =>
      track(`km-${s}`, 'km', s, `Kilometers ${SPORT_LABEL[s].toLowerCase()}`, MILESTONE_KM[s], sorted, (w) => w.distance_km ?? 0),
    ),
    track('hours', 'hours', null, 'Uren training', MILESTONE_HOURS, sorted, (w) => w.duration_min / 60),
    track('sessions', 'sessions', null, 'Sessies', MILESTONE_SESSIONS, sorted, () => 1),
  ]

  const reached = milestones
    .flatMap((t) => t.milestones.filter((m) => m.reached))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.target - a.target)

  return { sports, milestones, reached }
}

export function useRecords(workouts: Workout[]): Records {
  return useMemo(() => computeRecords(workouts), [workouts])
}

/** Eén keer dat een klasse-record gezet of verbeterd werd. */
export interface RecordEvent {
  sport: RecordSport
  km: number
  label: string
  date: string
  /** Geschatte tijd over de klasse-afstand. */
  minutes: number
  workoutId: string
  /** Vorige recordtijd, of null als de klasse toen voor het eerst gehaald werd. */
  previous: number | null
}

/** Alle records zoals ze in de tijd gezet werden (zelfde regels als computeRecords), nieuwste eerst. */
export function recordHistory(workouts: Workout[]): RecordEvent[] {
  const sorted = [...workouts].sort(chronological)
  const events: RecordEvent[] = []
  for (const sport of RECORD_SPORTS) {
    const list = sorted.filter((w) => w.sport === sport)
    for (const km of BUCKETS[sport]) {
      let best: number | null = null
      for (const w of list) {
        if (!w.distance_km || w.duration_min <= 0 || !reachesBucket(w.distance_km, km)) continue
        const minutes = (w.duration_min / w.distance_km) * km
        if (best !== null && minutes >= best) continue
        events.push({ sport, km, label: bucketLabel(sport, km), date: w.date, minutes, workoutId: w.id, previous: best })
        best = minutes
      }
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)
}

/** Kortste sessies die nog meetellen voor de tempografiek; korter is meestal een test of inloopje. */
const MIN_PACE_KM: Record<RecordSport, number> = { run: 1, bike: 5, swim: 0.2 }

/** Tempo in de eenheid die triatleten lezen: lopen min/km, zwemmen min/100 m, fietsen km/u. */
export function paceValue(sport: RecordSport, minutes: number, km: number): number {
  if (sport === 'bike') return km / (minutes / 60)
  if (sport === 'swim') return minutes / (km * 10)
  return minutes / km
}

/** Bij fietsen is hoger beter (km/u), bij lopen en zwemmen lager (min per afstand). */
export const higherIsFaster = (sport: RecordSport) => sport === 'bike'

export interface PacePoint {
  date: string
  value: number
  km: number
  minutes: number
  workoutId: string
}

/** Tempo per sessie vanaf `from` (YYYY-MM-DD), oudste eerst. */
export function paceSeries(workouts: Workout[], sport: RecordSport, from: string): PacePoint[] {
  return workouts
    .filter((w) => w.sport === sport && w.date >= from && w.duration_min > 0 && (w.distance_km ?? 0) >= MIN_PACE_KM[sport])
    .sort(chronological)
    .map((w) => ({ date: w.date, value: paceValue(sport, w.duration_min, w.distance_km!), km: w.distance_km!, minutes: w.duration_min, workoutId: w.id }))
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Hoeveel sneller (positief) of trager (negatief) je nu bent dan 3 maanden geleden, als fractie.
 * Vergelijkt de mediaan van de laatste 6 weken met die van de 6 weken rond 3 maanden terug
 * (minstens 2 sessies in elk venster), anders null.
 */
export function paceTrend(points: PacePoint[], sport: RecordSport, today: string): number | null {
  const daysAgo = (iso: string) => Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000)
  const recent = points.filter((p) => daysAgo(p.date) < 42).map((p) => p.value)
  const past = points.filter((p) => daysAgo(p.date) >= 70 && daysAgo(p.date) < 112).map((p) => p.value)
  if (recent.length < 2 || past.length < 2) return null
  const now = median(recent)
  const then = median(past)
  return higherIsFaster(sport) ? (now - then) / then : (then - now) / then
}
