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
  // Het profiel onthoudt voor welke gebruiker het geladen is. Zo telt "net ingelogd, nog niet opgehaald" als
  // laden, en niet als "geen profiel" — anders stuurt de router bij het opstarten even naar de onboarding
  // en gaat het opgevraagde adres (bv. de terugkeer van Strava) verloren.
  const [state, setState] = useState<{ userId: string | null; profile: Profile | null }>({ userId: null, profile: null })
  const loading = Boolean(userId) && state.userId !== userId
  const profile = userId && state.userId === userId ? state.profile : null

  useEffect(() => {
    if (!userId) return
    let stale = false
    supabase
      .from('profiles')
      .select(COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!stale) setState({ userId, profile: data as Profile | null })
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
      setState({ userId: userId!, profile: data as Profile })
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
