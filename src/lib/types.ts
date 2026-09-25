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

export const SPORT_BORDER: Record<Sport, string> = {
  swim: 'border-swim',
  bike: 'border-bike',
  run: 'border-run',
  strength: 'border-strength',
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
