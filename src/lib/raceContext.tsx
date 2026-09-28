import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useProfile } from './profile'
import { DEFAULT_RACE, RACE_TYPES, type Race } from './race'

const RaceContext = createContext<Race>(DEFAULT_RACE)

/** De race van de ingelogde gebruiker; zonder ingevulde race (of zonder profiel) de standaardrace. */
export function RaceProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const name = profile?.race_name
  const date = profile?.race_date
  const type = profile?.race_type

  const race = useMemo<Race>(() => {
    if (!date) return DEFAULT_RACE
    const t = type ?? 'full'
    // Lokaal interpreteren: de start om 7 uur 's ochtends op de racedag.
    return { name: name || DEFAULT_RACE.name, date: new Date(`${date}T07:00:00`), type: t, distances: RACE_TYPES[t].distances }
  }, [name, date, type])

  return <RaceContext.Provider value={race}>{children}</RaceContext.Provider>
}

export function useRace(): Race {
  return useContext(RaceContext)
}
