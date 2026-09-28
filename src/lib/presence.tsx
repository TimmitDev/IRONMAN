import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useProfile } from './profile'

const PresenceContext = createContext<Set<string>>(new Set())

/**
 * Wie er nu online is, via Supabase Realtime Presence (geen tabel nodig).
 * Iedereen luistert mee; alleen spelers die zichtbaar zijn op het leaderboard melden zichzelf aan.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const userId = profile?.id
  const visible = Boolean(profile?.show_on_leaderboard)
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('online', { config: { presence: { key: userId } } })

    channel
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && visible) await channel.track({ since: new Date().toISOString() })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, visible])

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>
}

export const useOnline = () => useContext(PresenceContext)
