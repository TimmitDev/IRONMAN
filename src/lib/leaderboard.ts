import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { RACE } from './race'

export interface Profile {
  id: string
  display_name: string
  show_on_leaderboard: boolean
}

export interface LeaderboardRow {
  user_id: string
  display_name: string
  total_min: number
  swim_min: number
  bike_min: number
  run_min: number
  strength_min: number
  swim_km: number
  bike_km: number
  run_km: number
  sessions: number
  active_days: number
  planned: number
  planned_done: number
}

/** Deel van een volledige IRONMAN, elke discipline even zwaar (1 = 3,8 + 180 + 42,2 km). */
export const ironmanFraction = (r: LeaderboardRow) =>
  (r.swim_km / RACE.distances.swim + r.bike_km / RACE.distances.bike + r.run_km / RACE.distances.run) / 3

/** Schema-trouw 0–1, of null zonder geplande sessies. */
export const compliance = (r: LeaderboardRow) => (r.planned ? r.planned_done / r.planned : null)

export function useProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, show_on_leaderboard')
      .eq('id', session!.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data as Profile | null)
        setLoading(false)
      })
  }, [session])

  const save = async (fields: Pick<Profile, 'display_name' | 'show_on_leaderboard'>) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: session!.user.id, ...fields })
      .select('id, display_name, show_on_leaderboard')
      .single()
    if (error) throw error
    setProfile(data as Profile)
  }

  return { profile, loading, save }
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
