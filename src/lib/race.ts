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
}

// Klassieke periodisering, geteld terug vanaf de racedag.
export const PHASES: Phase[] = [
  { name: 'Voorbereiding', fromWeeks: Infinity, description: 'Routine opbouwen, techniek, kracht en blessurepreventie.' },
  { name: 'Base', fromWeeks: 36, description: 'Aerobe basis: veel volume op lage intensiteit (zone 2).' },
  { name: 'Build', fromWeeks: 20, description: 'Racespecifieke intensiteit, lange ritten en bricks.' },
  { name: 'Peak', fromWeeks: 8, description: 'Hoogste belasting, racesimulaties en voedingsstrategie testen.' },
  { name: 'Taper', fromWeeks: 3, description: 'Volume omlaag, scherpte behouden, rust en herstel.' },
]

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

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h}u${m ? String(m).padStart(2, '0') : ''}` : `${m} min`
}
