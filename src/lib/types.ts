export const SPORTS = ['swim', 'bike', 'run', 'strength'] as const
export type Sport = (typeof SPORTS)[number]

export const SPORT_LABEL: Record<Sport, string> = {
  swim: 'Zwemmen',
  bike: 'Fietsen',
  run: 'Lopen',
  strength: 'Kracht',
}

export const SPORT_BG: Record<Sport, string> = {
  swim: 'bg-swim',
  bike: 'bg-bike',
  run: 'bg-run',
  strength: 'bg-strength',
}

export const SPORT_TEXT: Record<Sport, string> = {
  swim: 'text-swim',
  bike: 'text-bike',
  run: 'text-run',
  strength: 'text-strength',
}

/** Zachte achtergrond in de sportkleur, voor icoontegels. */
export const SPORT_SOFT: Record<Sport, string> = {
  swim: 'bg-swim/15',
  bike: 'bg-bike/15',
  run: 'bg-run/15',
  strength: 'bg-strength/15',
}

/** Zelfstandig naamwoord voor in zinnen: "kudos op je loopsessie". */
export const SPORT_NOUN: Record<Sport, string> = {
  swim: 'zwemsessie',
  bike: 'fietsrit',
  run: 'loopsessie',
  strength: 'krachttraining',
}

export const SPORT_BORDER: Record<Sport, string> = {
  swim: 'border-swim',
  bike: 'border-bike',
  run: 'border-run',
  strength: 'border-strength',
}

/** numeric-kolommen kunnen als string uit PostgREST komen; zet ze om zodat optellen niet gaat concateneren. */
export function normalizeRow<T extends { duration_min: number; distance_km: number | null }>(row: T): T {
  return { ...row, duration_min: Number(row.duration_min), distance_km: row.distance_km === null ? null : Number(row.distance_km) }
}

export interface Workout {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  sport: Sport
  duration_min: number
  distance_km: number | null
  rpe: number | null
  notes: string | null
  created_at: string
  /** Gezet als de training uit Strava geïmporteerd is. */
  strava_activity_id?: number | null
}

export type NewWorkout = Pick<Workout, 'date' | 'sport' | 'duration_min' | 'distance_km' | 'rpe' | 'notes'>

export interface PlannedWorkout {
  id: string
  user_id: string
  date: string
  sport: Sport
  title: string | null
  duration_min: number
  distance_km: number | null
  notes: string | null
  workout_id: string | null
  created_at: string
}

export type NewPlanned = Pick<PlannedWorkout, 'date' | 'sport' | 'title' | 'duration_min' | 'distance_km' | 'notes'>

export interface WeeklyGoal {
  sport: Sport
  minutes: number
  distance_km: number | null
}
