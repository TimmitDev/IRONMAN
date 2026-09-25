import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ghostButton } from '../lib/ui'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/plan', label: 'Schema' },
  { to: '/workouts', label: 'Trainingen' },
  { to: '/goals', label: 'Doelen' },
  { to: '/leaderboard', label: 'Leaderboard' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  }`

export function Layout() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap">
          <span className="mr-2 shrink-0 text-lg font-black tracking-tight italic sm:mr-6">
            IRON<span className="text-brand">MAN</span>
          </span>
          <nav className="order-last -mx-1 flex w-full min-w-0 gap-1 overflow-x-auto px-1 sm:order-none sm:w-auto">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
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
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
