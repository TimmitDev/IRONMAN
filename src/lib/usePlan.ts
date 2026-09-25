import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { addDays } from './race'
import { normalizeRow, type NewPlanned, type NewWorkout, type PlannedWorkout, type Workout } from './types'

const byDate = <T extends { date: string; created_at: string }>(a: T, b: T) =>
  a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)

/** Geplande en gelogde trainingen voor de week die begint op `start` (maandag, YYYY-MM-DD). */
export function usePlan(start: string) {
  const end = addDays(start, 6)
  const [planned, setPlanned] = useState<PlannedWorkout[]>([])
  const [done, setDone] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  /** Opnieuw ophalen, bv. na een bulkactie buiten deze hook. */
  const reload = () => setVersion((v) => v + 1)

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
      setPlanned(((p.data ?? []) as PlannedWorkout[]).map(normalizeRow).sort(byDate))
      setDone(((w.data ?? []) as Workout[]).map(normalizeRow).sort(byDate))
      setLoading(false)
    })
    return () => {
      stale = true
    }
  }, [load, version])

  const add = async (item: NewPlanned) => {
    const { data, error } = await supabase.from('planned_workouts').insert(item).select().single()
    if (error) throw error
    setPlanned((prev) => [...prev, normalizeRow(data as PlannedWorkout)].sort(byDate))
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('planned_workouts').delete().eq('id', id)
    if (error) throw error
    setPlanned((prev) => prev.filter((p) => p.id !== id))
  }

  const inWeek = (date: string) => date >= start && date <= end

  /** Wijzigt een geplande sessie. Bij een nieuwe datum verhuist de gekoppelde training mee. */
  const update = async (item: PlannedWorkout, patch: Partial<NewPlanned>) => {
    const { error } = await supabase.from('planned_workouts').update(patch).eq('id', item.id)
    if (error) throw error
    const moved = patch.date && patch.date !== item.date
    if (moved && item.workout_id) {
      const { error: moveError } = await supabase.from('workouts').update({ date: patch.date }).eq('id', item.workout_id)
      if (moveError) throw moveError
      setDone((prev) => prev.map((w) => (w.id === item.workout_id ? { ...w, date: patch.date! } : w)).filter((w) => inWeek(w.date)).sort(byDate))
    }
    setPlanned((prev) => prev.map((p) => (p.id === item.id ? { ...p, ...patch } : p)).filter((p) => inWeek(p.date)).sort(byDate))
  }

  /** Uitvinken verwijdert de gelogde training weer. */
  const uncomplete = async (item: PlannedWorkout) => {
    if (!item.workout_id) return
    const { error } = await supabase.from('workouts').delete().eq('id', item.workout_id)
    if (error) throw error
    // FK staat op "on delete set null", dus de planning is in de database al losgekoppeld.
    setDone((prev) => prev.filter((w) => w.id !== item.workout_id))
    setPlanned((prev) => prev.map((p) => (p.id === item.id ? { ...p, workout_id: null } : p)))
  }

  /** Afvinken logt de sessie als training, met wat er echt gedaan is. */
  const complete = async (item: PlannedWorkout, actual: Pick<NewWorkout, 'duration_min' | 'distance_km' | 'rpe' | 'notes'>) => {
    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ date: item.date, sport: item.sport, ...actual })
      .select()
      .single()
    if (error) throw error
    const { error: linkError } = await supabase
      .from('planned_workouts')
      .update({ workout_id: workout.id })
      .eq('id', item.id)
    if (linkError) throw linkError
    setDone((prev) => [...prev, normalizeRow(workout as Workout)].sort(byDate))
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
    setPlanned((prev) => [...prev, ...(inserted as PlannedWorkout[]).map(normalizeRow)].sort(byDate))
    return rows.length
  }

  return { planned, done, loading, error, add, update, remove, complete, uncomplete, copyPreviousWeek, reload }
}

export type ClearMode = 'plan' | 'open' | 'all'

/*
 * "Schema leegmaken" voor één gebruiker.
 * plan = open sessies uit het IRONMAN-plan, open = alle niet-afgevinkte, all = alles.
 * Het user_id-filter is ook nodig omdat Supabase deletes zonder WHERE weigert.
 */

export async function countClearable(userId: string, mode: ClearMode, fromDate: string | null): Promise<number> {
  let q = supabase.from('planned_workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (mode === 'plan') q = q.eq('source', 'plan')
  if (mode !== 'all') q = q.is('workout_id', null)
  if (fromDate) q = q.gte('date', fromDate)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

/** Verwijdert geplande sessies; gelogde trainingen blijven altijd bestaan. */
export async function clearSchedule(userId: string, mode: ClearMode, fromDate: string | null): Promise<number> {
  let q = supabase.from('planned_workouts').delete({ count: 'exact' }).eq('user_id', userId)
  if (mode === 'plan') q = q.eq('source', 'plan')
  if (mode !== 'all') q = q.is('workout_id', null)
  if (fromDate) q = q.gte('date', fromDate)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}
