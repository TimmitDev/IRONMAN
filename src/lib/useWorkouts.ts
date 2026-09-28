import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { normalizeRow, type NewWorkout, type Workout } from './types'

const CHANGED = 'workouts-changed'

/** Meldt aan de rest van de app dat er trainingen bijkwamen of verdwenen (loggen, afvinken, Strava-import). */
export function notifyWorkoutsChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

/**
 * Voert `fn` uit als elders trainingen wijzigen. Geeft een `notify` terug die de eigen melding
 * overslaat: dispatchEvent is synchroon, dus de vlag staat precies tijdens de eigen melding.
 */
export function useWorkoutsChanged(fn: () => void) {
  const own = useRef(false)
  const latest = useRef(fn)
  latest.current = fn

  useEffect(() => {
    const onChange = () => {
      if (!own.current) latest.current()
    }
    window.addEventListener(CHANGED, onChange)
    return () => window.removeEventListener(CHANGED, onChange)
  }, [])

  return useCallback(() => {
    own.current = true
    notifyWorkoutsChanged()
    own.current = false
  }, [])
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setWorkouts((data as Workout[]).map(normalizeRow))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const notify = useWorkoutsChanged(refresh)

  const add = async (w: NewWorkout) => {
    const { data, error } = await supabase.from('workouts').insert(w).select().single()
    if (error) throw error
    setWorkouts((prev) => [normalizeRow(data as Workout), ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    notify()
  }

  const update = async (id: string, patch: NewWorkout) => {
    const { data, error } = await supabase.from('workouts').update(patch).eq('id', id).select().single()
    if (error) throw error
    setWorkouts((prev) =>
      prev
        .map((w) => (w.id === id ? normalizeRow(data as Workout) : w))
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    )
    notify()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) throw error
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    notify()
  }

  return { workouts, loading, error, add, update, remove, refresh }
}
