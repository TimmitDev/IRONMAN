import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { IconName } from '../components/Icon'
import type { InboxItem } from './social'
import { supabase } from './supabase'
import { useWorkoutsChanged } from './useWorkouts'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Icoonkleur, zodat het menu in één oogopslag leesbaar is. */
  tint: string
  end?: boolean
}

/** Alle pagina's, in de volgorde van het menu. Gedeeld door de desktop-zijbalk en het mobiele menu. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', tint: 'text-brand', end: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'chart', tint: 'text-swim' },
  { to: '/plan', label: 'Schema', icon: 'calendar', tint: 'text-bike' },
  { to: '/workouts', label: 'Trainingen', icon: 'activity', tint: 'text-run' },
  { to: '/goals', label: 'Doelen', icon: 'target', tint: 'text-strength' },
  { to: '/records', label: 'Records', icon: 'sparkles', tint: 'text-brand' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy', tint: 'text-warning' },
  { to: '/uitdagingen', label: 'Uitdagingen', icon: 'flag', tint: 'text-swim' },
  { to: '/instellingen', label: 'Instellingen', icon: 'settings', tint: 'text-fg-3' },
]

/** Aantal gelogde trainingen, bijgewerkt zodra er ergens trainingen bijkomen of verdwijnen. */
export function useSessionCount(userId: string) {
  const [count, setCount] = useState<number | null>(null)
  const load = useCallback(() => {
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setCount(count ?? 0))
  }, [userId])
  useEffect(load, [load])
  useWorkoutsChanged(load)
  return count
}

/** Meldingen die nieuwer zijn dan je laatste bezoek aan Home (per toestel bijgehouden). */
export function useUnread(meId: string, items: InboxItem[]) {
  const { pathname } = useLocation()
  const key = `inbox_seen_${meId}`
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  })

  // Op Home zie je "Voor jou", dus dan telt alles als gelezen.
  useEffect(() => {
    const latest = items[0]?.created_at
    if (pathname !== '/' || !latest || latest <= seen) return
    setSeen(latest)
    try {
      localStorage.setItem(key, latest)
    } catch {
      // Opslag geblokkeerd: dan telt het alleen voor deze sessie.
    }
  }, [pathname, items, seen, key])

  return items.filter((i) => i.created_at > seen).length
}
