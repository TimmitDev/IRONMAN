export const RACE = {
  name: 'IRONMAN België',
  date: new Date('2027-09-05T07:00:00+02:00'),
  distances: { swim: 3.8, bike: 180, run: 42.2 },
}

const DAY = 86_400_000

export function daysUntilRace(now = new Date()): number {
  return Math.max(0, Math.ceil((RACE.date.getTime() - now.getTime()) / DAY))
}

export interface Phase {
  name: string
  description: string
  /** Weken tot de race waarop deze fase begint (exclusief bovengrens). */
  fromWeeks: number
  /** Richtlijn trainingsuren per week voor een age-grouper. */
  hoursHint: [number, number]
}

// Klassieke periodisering, geteld terug vanaf de racedag.
export const PHASES: Phase[] = [
  { name: 'Voorbereiding', fromWeeks: Infinity, hoursHint: [5, 8], description: 'Routine opbouwen, techniek, kracht en blessurepreventie.' },
  { name: 'Base', fromWeeks: 36, hoursHint: [8, 12], description: 'Aerobe basis: veel volume op lage intensiteit (zone 2).' },
  { name: 'Build', fromWeeks: 20, hoursHint: [12, 16], description: 'Racespecifieke intensiteit, lange ritten en bricks.' },
  { name: 'Peak', fromWeeks: 8, hoursHint: [14, 20], description: 'Hoogste belasting, racesimulaties en voedingsstrategie testen.' },
  { name: 'Taper', fromWeeks: 3, hoursHint: [6, 10], description: 'Volume omlaag, scherpte behouden, rust en herstel.' },
]

/** Hoeveel weken de fasetijdlijn toont (de open Voorbereiding-fase wordt hierop afgekapt). */
export const TIMELINE_WEEKS = 52

export function currentPhase(now = new Date()): Phase {
  const weeks = daysUntilRace(now) / 7
  let phase = PHASES[0]
  for (const p of PHASES) if (weeks < p.fromWeeks) phase = p
  return phase
}

/** Maandag van de week waarin `d` valt, als YYYY-MM-DD (lokale tijd). */
export function weekStart(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const offset = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - offset)
  return toISODate(copy)
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export const todayISO = () => toISODate(new Date())

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

/** Afgerond op minuten, voor totalen: "45 min", "1u05". */
export function formatDuration(min: number): string {
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}u${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
}

/** Voor één sessie: toont seconden als die er zijn ("45:30", "1:05:30"), anders als formatDuration. */
export function formatSessionDuration(min: number): string {
  const totalSec = Math.round(min * 60)
  if (totalSec % 60 === 0) return formatDuration(min)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = String(totalSec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s} min`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Tempo zoals triatleten het lezen: lopen min/km, zwemmen min/100 m, fietsen km/u. Null zonder afstand of voor kracht. */
export function formatPace(sport: string, min: number, km: number | null): string | null {
  if (!km || km <= 0 || !min || min <= 0) return null
  if (sport === 'bike') return `${(km / (min / 60)).toFixed(1).replace('.', ',')} km/u`
  if (sport === 'run') {
    const sec = Math.round((min * 60) / km)
    return `${Math.floor(sec / 60)}:${pad2(sec % 60)} /km`
  }
  if (sport === 'swim') {
    const sec = Math.round((min * 60) / (km * 10))
    return `${Math.floor(sec / 60)}:${pad2(sec % 60)} /100m`
  }
  return null
}

export const sumMinutes = (items: { duration_min: number }[]) => items.reduce((a, w) => a + w.duration_min, 0)
export const sumKm = (items: { distance_km: number | null }[]) =>
  Math.round(items.reduce((a, w) => a + Number(w.distance_km ?? 0), 0) * 10) / 10
