import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  /** Ingelogd via een wachtwoord-herstellink: eerst een nieuw wachtwoord kiezen. */
  recovery: boolean
  endRecovery: () => void
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, recovery: false, endRecovery: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      // Na e-mailbevestiging of herstellink de ?code= uit de URL halen.
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading, recovery, endRecovery: () => setRecovery(false) }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Terugkeer-URL voor mails (bevestiging, herstel): de app zelf, zonder hash. */
export const appUrl = () => window.location.origin + window.location.pathname
