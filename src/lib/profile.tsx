import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { RaceType } from './race'

export interface Profile {
  id: string
  display_name: string
  show_on_leaderboard: boolean
  share_workouts: boolean
  /** Routes (ingekort, zonder start en finish) tonen in de feed. Standaard uit. */
  share_routes: boolean
  /** Eigen race; leeg = de standaardrace (DEFAULT_RACE). */
  race_name: string | null
  /** YYYY-MM-DD */
  race_date: string | null
  race_type: RaceType | null
  /** Uit `private_settings`, enkel voor jezelf; null = niet ingevuld (of vóór migratie 015). */
  weight_kg: number | null
}

export type ProfileFields = Pick<Profile, 'display_name' | 'show_on_leaderboard'> &
  Partial<Pick<Profile, 'share_workouts' | 'share_routes' | 'race_name' | 'race_date' | 'race_type'>>

const COLUMNS = 'id, display_name, show_on_leaderboard, share_workouts, share_routes, race_name, race_date, race_type'

interface ProfileState {
  profile: Profile | null
  loading: boolean
  save: (fields: ProfileFields) => Promise<void>
  saveWeight: (kg: number | null) => Promise<void>
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
    Promise.all([
      supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle(),
      // Faalt stil vóór migratie 015: dan gewoon geen gewicht.
      supabase.from('private_settings').select('weight_kg').eq('user_id', userId).maybeSingle(),
    ]).then(([{ data }, { data: priv }]) => {
      if (stale) return
      const weight = priv?.weight_kg == null ? null : Number(priv.weight_kg)
      setState({ userId, profile: data ? { ...(data as Omit<Profile, 'weight_kg'>), weight_kg: weight } : null })
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
      setState((s) => ({ userId: userId!, profile: { ...(data as Omit<Profile, 'weight_kg'>), weight_kg: s.profile?.weight_kg ?? null } }))
    },
    [userId],
  )

  const saveWeight = useCallback(
    async (kg: number | null) => {
      const { error } = await supabase.from('private_settings').upsert({ user_id: userId, weight_kg: kg })
      if (error) throw error
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, weight_kg: kg } } : s))
    },
    [userId],
  )

  return <ProfileContext.Provider value={{ profile, loading, save, saveWeight }}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile buiten ProfileProvider')
  return ctx
}

/** Binnen de app-layout bestaat het profiel altijd (anders stuurt de router naar de onboarding). */
export function useMe() {
  const { profile, save, saveWeight } = useProfile()
  if (!profile) throw new Error('useMe zonder profiel')
  return { me: profile, save, saveWeight }
}
