import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { RaceType } from './race'
import type { Sport, Workout } from './types'

export interface PlayerHit {
  id: string
  display_name: string
}

export interface PlayerTotals {
  sessions: number
  active_days: number
  first_date: string | null
  last_date: string | null
  total_min: number
  swim_min: number
  bike_min: number
  run_min: number
  strength_min: number
  /** cardio_min en cardio_km ontbreken vóór migratie 014. */
  cardio_min?: number
  swim_km: number
  bike_km: number
  run_km: number
  cardio_km?: number
}

/** Wat `player_profile` teruggeeft. `workouts` is null als de speler geen losse trainingen deelt. */
export interface PlayerProfile {
  id: string
  display_name: string
  created_at: string
  share_workouts: boolean
  totals: PlayerTotals
  records: Partial<Record<Sport, { km: number | null; min: number }>>
  planned: number
  planned_done: number
  weeks: { week: string; sport: Sport; minutes: number; km: number }[]
  workouts: Workout[] | null
  /** De race waarvoor de speler traint; ontbreekt zonder eigen race (of vóór migratie 011). */
  race?: { name: string; date: string; type: RaceType } | null
}

/** Zoekt spelers op naam (hoofdletterongevoelig). RLS geeft alleen zichtbare profielen en je eigen terug. */
export function usePlayerSearch(query: string) {
  const [hits, setHits] = useState<PlayerHit[]>([])
  const [loading, setLoading] = useState(false)
  // % en _ zijn jokers in ilike; * vertaalt PostgREST ook naar een joker.
  const term = query.trim().replace(/[\\%_]/g, '\\$&').replace(/\*/g, '')

  useEffect(() => {
    if (!term) {
      setHits([])
      setLoading(false)
      return
    }
    let stale = false
    setLoading(true)
    // Kort wachten zodat niet elke toetsaanslag een request wordt.
    const timer = setTimeout(() => {
      supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', `%${term}%`)
        .order('display_name')
        .limit(20)
        .then(({ data }) => {
          if (stale) return
          setHits((data ?? []) as PlayerHit[])
          setLoading(false)
        })
    }, 200)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [term])

  return { hits, loading }
}

export function usePlayerProfile(id: string) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    setLoading(true)
    supabase.rpc('player_profile', { p_user: id }).then(({ data, error }) => {
      if (stale) return
      setError(error?.message ?? null)
      const p = data as PlayerProfile | null
      // Notities en RPE komen nooit mee; aanvullen zodat de gewone trainingscomponenten werken.
      setPlayer(p && { ...p, workouts: p.workouts?.map((w) => ({ ...w, user_id: p.id, rpe: null, notes: null })) ?? null })
      setLoading(false)
    })
    return () => {
      stale = true
    }
  }, [id])

  return { player, loading, error }
}
