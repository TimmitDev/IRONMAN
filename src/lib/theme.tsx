import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Zet data-theme op <html> en de kleur van de statusbalk. Zelfde logica als het script in index.html. */
function apply(pref: ThemePreference, animate: boolean) {
  const dark = pref === 'dark' || (pref === 'system' && media().matches)
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 250)
  }
  root.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0a' : '#fafafa')
}

interface ThemeState {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeState>({ preference: 'system', resolved: 'dark', setPreference: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  // Volg het systeemthema zolang de voorkeur "systeem" is.
  useEffect(() => {
    const m = media()
    const onChange = () => setSystemDark(m.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    apply(preference, false)
  }, [preference, systemDark])

  const setPreference = (p: ThemePreference) => {
    try {
      if (p === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, p)
    } catch {
      // Opslag geblokkeerd (privévenster): het thema geldt dan alleen voor deze sessie.
    }
    apply(p, true)
    setPref(p)
  }

  const resolved = preference === 'dark' || (preference === 'system' && systemDark) ? 'dark' : 'light'
  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
