import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

const PresenceContext = createContext<Set<string>>(new Set())

/**
 * Wie er nu online is, via Supabase Realtime Presence (geen tabel nodig).
 * Iedereen luistert mee; alleen spelers die zichtbaar zijn op het leaderboard melden zichzelf aan.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('online', { config: { presence: { key: userId } } })

    channel
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        const { data } = await supabase.from('profiles').select('show_on_leaderboard').eq('id', userId).maybeSingle()
        if (data?.show_on_leaderboard) await channel.track({ since: new Date().toISOString() })
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>
}

export const useOnline = () => useContext(PresenceContext)
