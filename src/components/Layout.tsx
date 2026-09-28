import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FollowsProvider } from '../lib/follows'
import { PresenceProvider } from '../lib/presence'
import { useMe } from '../lib/profile'
import { useStravaAutoSync } from '../lib/strava'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { RightSidebar } from './RightSidebar'
import { Sidebar } from './Sidebar'
import { ThemeSwitchButton } from './ThemeToggle'

/** Mobiele tabbalk: vier tabs met in het midden een opvallende knop om te loggen. */
const TABS: { to: string; label: string; icon: IconName; end?: boolean; alsoActive?: string[] }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/plan', label: 'Schema', icon: 'calendar' },
  { to: '/leaderboard', label: 'Ranking', icon: 'trophy' },
  { to: '/dashboard', label: 'Mijn', icon: 'chart', alsoActive: ['/goals', '/instellingen'] },
]

export function PageLoader() {
  return (
    <div className="flex justify-center p-16" role="status" aria-label="Laden">
      <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
    </div>
  )
}

export function Layout() {
  const { me } = useMe()
  return (
    <PresenceProvider>
      <FollowsProvider meId={me.id}>
        <Shell />
      </FollowsProvider>
    </PresenceProvider>
  )
}

function Shell() {
  const { me } = useMe()
  const { pathname } = useLocation()
  useStravaAutoSync()

  return (
    // Ruimte voor de zwevende zijbalken: 18rem breed + 1rem marge aan de rand + 1rem tussenruimte.
    <div className="min-h-screen lg:pl-80 xl:pr-80">
      <Sidebar />
      <RightSidebar />

      {/* Mobiel en tablet: compacte bovenbalk. */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="text-xl font-black tracking-tight text-fg italic">
            IRON<span className="text-brand">MAN</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitchButton />
            <Link to="/instellingen" className="ml-1 rounded-full" aria-label="Instellingen">
              <Avatar name={me.display_name} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[88rem] px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-6 lg:pt-4 lg:pb-4">
        {/* Binnen de layout, zodat zijbalk en tabbalk blijven staan terwijl een pagina laadt. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobiel: vaste tabbalk onderaan, binnen duimbereik. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Hoofdmenu">
        <div className="mx-auto flex max-w-lg items-end">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.to} item={t} pathname={pathname} />
          ))}
          <div className="flex flex-1 justify-center">
            <Link
              to="/workouts"
              className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
              aria-label="Training loggen"
            >
              <Icon name="plus" className="size-6" strokeWidth={2.5} />
            </Link>
          </div>
          {TABS.slice(2).map((t) => (
            <Tab key={t.to} item={t} pathname={pathname} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function Tab({ item, pathname }: { item: (typeof TABS)[number]; pathname: string }) {
  const also = item.alsoActive?.some((p) => pathname.startsWith(p)) ?? false
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition ${
          isActive || also ? 'text-brand' : 'text-fg-3 active:text-fg'
        }`
      }
    >
      <Icon name={item.icon} className="size-6" />
      {item.label}
    </NavLink>
  )
}
