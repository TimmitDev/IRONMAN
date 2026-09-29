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
  end?: boolean
}

/** Alle pagina's, in de volgorde van het menu. Gedeeld door de desktop-zijbalk, de navbar en het mobiele menu. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
  { to: '/plan', label: 'Schema', icon: 'calendar' },
  { to: '/workouts', label: 'Trainingen', icon: 'activity' },
  { to: '/goals', label: 'Doelen', icon: 'target' },
  { to: '/records', label: 'Records', icon: 'sparkles' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { to: '/uitdagingen', label: 'Uitdagingen', icon: 'flag' },
  { to: '/instellingen', label: 'Instellingen', icon: 'settings' },
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

/**
 * Meldingen die nieuwer zijn dan wat je al zag (per toestel bijgehouden). Alles telt als gelezen
 * op Home (daar staat "Voor jou") of met `markRead`, bv. bij het openen van het belletje.
 */
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

  const markRead = useCallback(() => {
    const latest = items[0]?.created_at
    if (!latest || latest <= seen) return
    setSeen(latest)
    try {
      localStorage.setItem(key, latest)
    } catch {
      // Opslag geblokkeerd: dan telt het alleen voor deze sessie.
    }
  }, [items, seen, key])

  useEffect(() => {
    if (pathname === '/') markRead()
  }, [pathname, markRead])

  return { unread: items.filter((i) => i.created_at > seen).length, markRead }
}
