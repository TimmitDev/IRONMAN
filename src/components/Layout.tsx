import { Suspense, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ghostButton } from '../lib/ui'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
)

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', end: true, icon: icon(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />) },
  { to: '/plan', label: 'Schema', short: 'Schema', icon: icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { to: '/workouts', label: 'Trainingen', short: 'Log', icon: icon(<><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></>) },
  { to: '/goals', label: 'Doelen', short: 'Doelen', icon: icon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>) },
  { to: '/leaderboard', label: 'Leaderboard', short: 'Ranking', icon: icon(<path d="M8 21V11H3v10zM15 21V4h-5v17zM21 21v-7h-5v7z" />) },
]

const topLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  }`

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
    isActive ? 'text-white' : 'text-zinc-500 active:text-zinc-300'
  }`

export function PageLoader() {
  return (
    <div className="flex justify-center p-12" role="status" aria-label="Laden">
      <span className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-brand" />
    </div>
  )
}

export function Layout() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <span className="mr-6 shrink-0 text-lg font-black tracking-tight italic">
            IRON<span className="text-brand">MAN</span>
          </span>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={topLinkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-zinc-500 lg:inline">{session?.user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className={ghostButton}>
              Uitloggen
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        {/* Binnen de layout, zodat header en tabbalk blijven staan terwijl een pagina laadt. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobiel: vaste tabbalk onderaan, binnen duimbereik. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={tabClass}>
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-0.5 transition ${isActive ? 'bg-brand/20 text-brand' : ''}`}>{n.icon}</span>
                  {n.short}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
