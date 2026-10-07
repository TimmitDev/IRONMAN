export const SPORTS = ['swim', 'bike', 'run', 'strength', 'cardio'] as const
export type Sport = (typeof SPORTS)[number]

/** De drie triatlondisciplines; de rest telt niet mee voor IRONMAN-afstanden en -badges. */
export const TRI_SPORTS = ['swim', 'bike', 'run'] as const
export type TriSport = (typeof TRI_SPORTS)[number]
export const isTriSport = (s: Sport): s is TriSport => (TRI_SPORTS as readonly Sport[]).includes(s)

export const SPORT_LABEL: Record<Sport, string> = {
  swim: 'Zwemmen',
  bike: 'Fietsen',
  run: 'Lopen',
  strength: 'Kracht',
  cardio: 'Cardio',
}

export const SPORT_BG: Record<Sport, string> = {
  swim: 'bg-swim',
  bike: 'bg-bike',
  run: 'bg-run',
  strength: 'bg-strength',
  cardio: 'bg-cardio',
}

/** Sportkleuren als hex, voor plekken buiten Tailwind (kaartlijnen). Zelfde waarden als in index.css. */
export const SPORT_HEX: Record<Sport, string> = {
  swim: '#3987e5',
  bike: '#d95926',
  run: '#199e70',
  strength: '#c98500',
  cardio: '#8b5fd6',
}

export const SPORT_TEXT: Record<Sport, string> = {
  swim: 'text-swim',
  bike: 'text-bike',
  run: 'text-run',
  strength: 'text-strength',
  cardio: 'text-cardio',
}

/** Zachte achtergrond in de sportkleur, voor icoontegels. */
export const SPORT_SOFT: Record<Sport, string> = {
  swim: 'bg-swim/15',
  bike: 'bg-bike/15',
  run: 'bg-run/15',
  strength: 'bg-strength/15',
  cardio: 'bg-cardio/15',
}

/** Zelfstandig naamwoord voor in zinnen: "kudos op je loopsessie". */
export const SPORT_NOUN: Record<Sport, string> = {
  swim: 'zwemsessie',
  bike: 'fietsrit',
  run: 'loopsessie',
  strength: 'krachttraining',
  cardio: 'cardiotraining',
}

export const SPORT_BORDER: Record<Sport, string> = {
  swim: 'border-swim',
  bike: 'border-bike',
  run: 'border-run',
  strength: 'border-strength',
  cardio: 'border-cardio',
}

/** Soorten cardiotraining waaruit je kiest bij sport "Cardio". Nieuwe soorten mogen hier gewoon bij. */
export const CARDIO_TYPES = ['rowing', 'crosstrainer', 'stairmaster'] as const
export type CardioType = (typeof CARDIO_TYPES)[number]

export const CARDIO_LABEL: Record<CardioType, string> = {
  rowing: 'Roeien',
  crosstrainer: 'Crosstrainer',
  stairmaster: 'Stairmaster',
}

/** Naam van een training: de cardiosoort als die gekozen is ("Roeien"), anders de sport. */
export function workoutLabel(w: { sport: Sport; cardio_type?: CardioType | null }): string {
  return (w.cardio_type && CARDIO_LABEL[w.cardio_type]) || SPORT_LABEL[w.sport]
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
  /** Alleen bij sport "cardio": welke soort (CARDIO_TYPES), of null als niet gekozen. */
  cardio_type?: CardioType | null
  duration_min: number
  distance_km: number | null
  rpe: number | null
  notes: string | null
  created_at: string
  /** Gezet als de training uit Strava geïmporteerd is. */
  strava_activity_id?: number | null
  /** Route uit Strava (encoded polyline); leeg of null zonder route. Alleen voor jezelf zichtbaar. */
  route_polyline?: string | null
}

export type NewWorkout = Pick<Workout, 'date' | 'sport' | 'cardio_type' | 'duration_min' | 'distance_km' | 'rpe' | 'notes'>

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
