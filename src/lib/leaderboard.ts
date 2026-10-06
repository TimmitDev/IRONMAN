import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { IRONMAN_DISTANCES } from './race'

export interface LeaderboardRow {
  user_id: string
  display_name: string
  total_min: number
  swim_min: number
  bike_min: number
  run_min: number
  strength_min: number
  /** Ontbreekt vóór migratie 014. */
  cardio_min?: number
  swim_km: number
  bike_km: number
  run_km: number
  sessions: number
  active_days: number
  planned: number
  planned_done: number
}

/** Deel van een volledige IRONMAN, elke discipline even zwaar (1 = 3,8 + 180 + 42,2 km). */
export const ironmanFraction = (r: Pick<LeaderboardRow, 'swim_km' | 'bike_km' | 'run_km'>) =>
  (r.swim_km / IRONMAN_DISTANCES.swim + r.bike_km / IRONMAN_DISTANCES.bike + r.run_km / IRONMAN_DISTANCES.run) / 3

/** Schema-trouw 0–1, of null zonder geplande sessies. */
export const compliance = (r: Pick<LeaderboardRow, 'planned' | 'planned_done'>) => (r.planned ? r.planned_done / r.planned : null)

/** "1,25×" vanaf een volledige afstand, anders een percentage. */
export function formatIronman(x: number) {
  return x >= 1 ? `${x.toFixed(2).replace('.', ',')}×` : `${Math.round(x * 100)}%`
}

export function useLeaderboard(from: string, to: string, reloadKey: unknown) {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    setLoading(true)
    supabase.rpc('leaderboard', { p_from: from, p_to: to }).then(({ data, error }) => {
      if (stale) return
      setError(error?.message ?? null)
      // numeric-kolommen kunnen als string binnenkomen; alles naar number.
      setRows(
        ((data ?? []) as LeaderboardRow[]).map((r) => ({
          ...r,
          swim_km: Number(r.swim_km),
          bike_km: Number(r.bike_km),
          run_km: Number(r.run_km),
        })),
      )
      setLoading(false)
    })
    return () => {
      stale = true
    }
  }, [from, to, reloadKey])

  return { rows, loading, error }
}
