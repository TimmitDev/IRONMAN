import type { CardioType, Sport, Workout } from './types'

// Verbrande kcal = MET × gewicht (kg) × uren (Compendium of Physical Activities).
// Met afstand rekenen we de MET uit het tempo; zonder afstand gebruiken we een vaste MET per sport,
// bijgesteld met de RPE (RPE 5 = gemiddeld, 1 ≈ −24%, 10 ≈ +30%).

const BASE_MET: Record<Sport, number> = { swim: 7, bike: 7.5, run: 9.8, strength: 4.5, cardio: 7 }
const CARDIO_MET: Record<CardioType, number> = { rowing: 7, crosstrainer: 5, stairmaster: 9 }

/** Lopen volgens de ACSM-formule: VO2 = 0,2 × snelheid (m/min) + 3,5; 1 MET = 3,5 ml/kg/min. */
const runMet = (kmh: number) => (0.2 * ((kmh * 1000) / 60) + 3.5) / 3.5

function bikeMet(kmh: number) {
  if (kmh < 16) return 4
  if (kmh < 19) return 6.8
  if (kmh < 22) return 8
  if (kmh < 25) return 10
  if (kmh < 30) return 12
  return 15.8
}

/** Zwemmen op tempo per 100 m (minuten). */
function swimMet(minPer100: number) {
  if (minPer100 > 3) return 6
  if (minPer100 > 2) return 8.3
  return 10
}

const rpeFactor = (rpe: number | null | undefined) => (rpe ? 0.7 + rpe * 0.06 : 1)

type KcalInput = Pick<Workout, 'sport' | 'duration_min' | 'distance_km' | 'rpe'> & { cardio_type?: CardioType | null }

/** MET voor één training. Exporteerd zodat het formulier kan tonen waarop de schatting rust. */
export function metFor(w: KcalInput): number {
  const hours = w.duration_min / 60
  const km = w.distance_km ?? 0
  // Onrealistische snelheden (typfout, gps-sprong) vallen terug op de vaste MET.
  if (km > 0 && hours > 0) {
    const kmh = km / hours
    if (w.sport === 'run' && kmh >= 4 && kmh <= 25) return runMet(kmh)
    if (w.sport === 'bike' && kmh >= 5 && kmh <= 60) return bikeMet(kmh)
    if (w.sport === 'swim' && kmh >= 0.5 && kmh <= 8) return swimMet(w.duration_min / (km * 10))
  }
  const base = w.sport === 'cardio' && w.cardio_type ? CARDIO_MET[w.cardio_type] : BASE_MET[w.sport]
  return base * rpeFactor(w.rpe)
}

/** Geschatte kcal, of null zonder gewicht of duur. */
export function estimateKcal(w: KcalInput, weightKg: number | null | undefined): number | null {
  if (!weightKg || w.duration_min <= 0) return null
  return Math.round(metFor(w) * weightKg * (w.duration_min / 60))
}

/** Opgeslagen kcal (formulier of Strava), anders een schatting. */
export const workoutKcal = (w: KcalInput & { kcal?: number | null }, weightKg: number | null | undefined) => w.kcal ?? estimateKcal(w, weightKg)

/** "1.240 kcal" */
export const formatKcal = (kcal: number) => `${Math.round(kcal).toLocaleString('nl-BE')} kcal`
