import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { Sport, WeeklyGoal } from './types'

export type Goals = Partial<Record<Sport, WeeklyGoal>>

export function useGoals() {
  const { session } = useAuth()
  const [goals, setGoals] = useState<Goals>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('weekly_goals')
      .select('sport, minutes, distance_km')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setGoals(Object.fromEntries((data as WeeklyGoal[]).map((g) => [g.sport, g])))
        setLoading(false)
      })
  }, [])

  const save = async (items: WeeklyGoal[]) => {
    const rows = items.map((g) => ({ ...g, user_id: session!.user.id }))
    const { error } = await supabase.from('weekly_goals').upsert(rows, { onConflict: 'user_id,sport' })
    if (error) throw error
    setGoals(Object.fromEntries(items.map((g) => [g.sport, g])))
  }

  const totalMinutes = Object.values(goals).reduce((a, g) => a + (g?.minutes ?? 0), 0)

  return { goals, totalMinutes, loading, error, save }
}
