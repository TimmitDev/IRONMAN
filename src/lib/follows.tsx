import { createContext, useContext, type ReactNode } from 'react'
import { useFollows, type Follows } from './social'

const FollowsContext = createContext<Follows | null>(null)

/** Eén gedeelde volg-toestand voor de hele app, zodat zijbalk, hub en spelerspagina's gelijk lopen. */
export function FollowsProvider({ meId, children }: { meId: string; children: ReactNode }) {
  const follows = useFollows(meId)
  return <FollowsContext.Provider value={follows}>{children}</FollowsContext.Provider>
}

export function useSharedFollows() {
  const ctx = useContext(FollowsContext)
  if (!ctx) throw new Error('useSharedFollows buiten FollowsProvider')
  return ctx
}
