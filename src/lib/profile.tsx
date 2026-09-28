import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export interface Profile {
  id: string
  display_name: string
  show_on_leaderboard: boolean
  share_workouts: boolean
}

export type ProfileFields = Pick<Profile, 'display_name' | 'show_on_leaderboard'> & Partial<Pick<Profile, 'share_workouts'>>

const COLUMNS = 'id, display_name, show_on_leaderboard, share_workouts'

interface ProfileState {
  profile: Profile | null
  loading: boolean
  save: (fields: ProfileFields) => Promise<void>
}

const ProfileContext = createContext<ProfileState | null>(null)

/**
 * Het eigen profiel, één keer geladen en gedeeld door alle pagina's.
 * Geen profiel = nog niet door de onboarding (zie RequireOnboarded in App.tsx).
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    let stale = false
    setLoading(true)
    supabase
      .from('profiles')
      .select(COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (stale) return
        setProfile(data as Profile | null)
        setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [userId])

  const save = useCallback(
    async (fields: ProfileFields) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...fields })
        .select(COLUMNS)
        .single()
      if (error) throw error
      setProfile(data as Profile)
    },
    [userId],
  )

  return <ProfileContext.Provider value={{ profile, loading, save }}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile buiten ProfileProvider')
  return ctx
}

/** Binnen de app-layout bestaat het profiel altijd (anders stuurt de router naar de onboarding). */
export function useMe() {
  const { profile, save } = useProfile()
  if (!profile) throw new Error('useMe zonder profiel')
  return { me: profile, save }
}
