import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { normalizeRow, type NewWorkout, type Workout } from './types'

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

  const add = async (w: NewWorkout) => {
    const { data, error } = await supabase.from('workouts').insert(w).select().single()
    if (error) throw error
    setWorkouts((prev) => [normalizeRow(data as Workout), ...prev].sort((a, b) => b.date.localeCompare(a.date)))
  }

  const update = async (id: string, patch: NewWorkout) => {
    const { data, error } = await supabase.from('workouts').update(patch).eq('id', id).select().single()
    if (error) throw error
    setWorkouts((prev) =>
      prev
        .map((w) => (w.id === id ? normalizeRow(data as Workout) : w))
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)),
    )
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) throw error
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
  }

  return { workouts, loading, error, add, update, remove, refresh }
}
