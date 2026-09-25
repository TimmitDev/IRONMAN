import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { addDays } from './race'
import type { NewPlanned, PlannedWorkout, Workout } from './types'

const byDate = <T extends { date: string; created_at: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)

/** Geplande en gelogde trainingen voor de week die begint op `start` (maandag, YYYY-MM-DD). */
export function usePlan(start: string) {
  const end = addDays(start, 6)
  const [planned, setPlanned] = useState<PlannedWorkout[]>([])
  const [done, setDone] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [p, w] = await Promise.all([
      supabase.from('planned_workouts').select('*').gte('date', start).lte('date', end),
      supabase.from('workouts').select('*').gte('date', start).lte('date', end),
    ])
    return { planned: p, done: w }
  }, [start, end])

  useEffect(() => {
    let stale = false
    setLoading(true)
    load().then(({ planned: p, done: w }) => {
      if (stale) return
      setError(p.error?.message ?? w.error?.message ?? null)
      setPlanned(((p.data ?? []) as PlannedWorkout[]).sort(byDate))
      setDone(((w.data ?? []) as Workout[]).sort(byDate))
      setLoading(false)
    })
    return () => {
      stale = true
    }
  }, [load])

  const add = async (item: NewPlanned) => {
    const { data, error } = await supabase.from('planned_workouts').insert(item).select().single()
    if (error) throw error
    setPlanned((prev) => [...prev, data as PlannedWorkout].sort(byDate))
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('planned_workouts').delete().eq('id', id)
    if (error) throw error
    setPlanned((prev) => prev.filter((p) => p.id !== id))
  }

  /** Afvinken logt de sessie als training; uitvinken verwijdert die gelogde training weer. */
  const toggle = async (item: PlannedWorkout) => {
    if (item.workout_id) {
      const { error } = await supabase.from('workouts').delete().eq('id', item.workout_id)
      if (error) throw error
      // FK staat op "on delete set null", dus de planning is in de database al losgekoppeld.
      setDone((prev) => prev.filter((w) => w.id !== item.workout_id))
      setPlanned((prev) => prev.map((p) => (p.id === item.id ? { ...p, workout_id: null } : p)))
      return
    }
    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        date: item.date,
        sport: item.sport,
        duration_min: item.duration_min,
        distance_km: item.distance_km,
        notes: item.title ?? item.notes,
      })
      .select()
      .single()
    if (error) throw error
    const { error: linkError } = await supabase
      .from('planned_workouts')
      .update({ workout_id: workout.id })
      .eq('id', item.id)
    if (linkError) throw linkError
    setDone((prev) => [...prev, workout as Workout].sort(byDate))
    setPlanned((prev) => prev.map((p) => (p.id === item.id ? { ...p, workout_id: workout.id } : p)))
  }

  /** Kopieert de planning van de vorige week naar deze week (zonder afvinkstatus). */
  const copyPreviousWeek = async () => {
    const { data, error } = await supabase
      .from('planned_workouts')
      .select('date, sport, title, duration_min, distance_km, notes')
      .gte('date', addDays(start, -7))
      .lte('date', addDays(start, -1))
    if (error) throw error
    if (!data.length) return 0
    const rows = (data as NewPlanned[]).map((p) => ({ ...p, date: addDays(p.date, 7) }))
    const { data: inserted, error: insertError } = await supabase.from('planned_workouts').insert(rows).select()
    if (insertError) throw insertError
    setPlanned((prev) => [...prev, ...(inserted as PlannedWorkout[])].sort(byDate))
    return rows.length
  }

  return { planned, done, loading, error, add, remove, toggle, copyPreviousWeek }
}
