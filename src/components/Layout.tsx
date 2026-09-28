import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FollowsProvider, useSharedFollows } from '../lib/follows'
import { PresenceProvider } from '../lib/presence'
import { useMe } from '../lib/profile'
import { useStravaAutoSync } from '../lib/strava'
import { supabase } from '../lib/supabase'
import { useWorkoutsChanged } from '../lib/useWorkouts'
import { iconButton, primaryButton } from '../lib/ui'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { ThemeSwitchButton, ThemeToggle } from './ThemeToggle'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overzicht',
    items: [
      { to: '/', label: 'Home', icon: 'home', end: true },
      { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
    ],
  },
  {
    title: 'Training',
    items: [
      { to: '/plan', label: 'Schema', icon: 'calendar' },
      { to: '/workouts', label: 'Trainingen', icon: 'activity' },
      { to: '/goals', label: 'Doelen', icon: 'target' },
    ],
  },
  {
    title: 'Community',
    items: [{ to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' }],
  },
]

/** Mobiele tabbalk: vier tabs met in het midden een opvallende knop om te loggen. */
const TABS: (NavItem & { alsoActive?: string[] })[] = [
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

function Logo() {
  return (
    <Link to="/" className="text-xl font-black tracking-tight text-fg italic">
      IRON<span className="text-brand">MAN</span>
    </Link>
  )
}

/** Aantal gelogde trainingen, bijgewerkt zodra er ergens trainingen bijkomen of verdwijnen. */
function useSessionCount(userId: string) {
  const [count, setCount] = useState<number | null>(null)
  const load = useCallback(() => {
    supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setCount(count ?? 0))
  }, [userId])
  useEffect(load, [load])
  useWorkoutsChanged(load)
  return count
}

/** Bovenaan de zijbalk: wie je bent, met volgers, volgend en sessies. */
function SidebarProfile() {
  const { me } = useMe()
  const follows = useSharedFollows()
  const sessions = useSessionCount(me.id)
  const stats = [
    { label: 'Volgers', value: follows.loading ? '–' : follows.followers.length },
    { label: 'Volgend', value: follows.loading ? '–' : follows.following.length },
    { label: 'Sessies', value: sessions ?? '–' },
  ]

  return (
    <div className="rounded-2xl border border-line bg-subtle p-4">
      <Link to={`/leaderboard/${me.id}`} className="group flex items-center gap-3">
        <Avatar name={me.display_name} size="md" />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-fg group-hover:underline">{me.display_name}</span>
          <span className="block text-xs text-fg-3">Bekijk je profiel</span>
        </span>
      </Link>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-line text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse px-1">
            <dt className="text-[11px] text-fg-3">{s.label}</dt>
            <dd className="text-lg font-semibold tracking-tight text-fg tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
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
      <div className="min-h-screen lg:pl-72">
        {/* Desktop: vaste zijbalk met je profiel bovenaan en daaronder het menu. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-16 shrink-0 items-center px-6">
            <Logo />
          </div>

          <div className="px-4">
            <SidebarProfile />
          </div>

          <div className="px-4 pt-4">
            <Link to="/workouts" className={`w-full ${primaryButton}`}>
              <Icon name="plus" className="size-4" />
              Training loggen
            </Link>
          </div>

          <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-4" aria-label="Hoofdmenu">
            {NAV_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-fg-4 uppercase">{g.title}</p>
                <ul className="space-y-0.5">
                  {g.items.map((n) => (
                    <li key={n.to}>
                      <NavLink
                        to={n.to}
                        end={n.end}
                        className={({ isActive }) =>
                          `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                            isActive ? 'bg-brand/10 text-brand' : 'text-fg-2 hover:bg-hover hover:text-fg'
                          }`
                        }
                      >
                        <Icon name={n.icon} className="size-[18px]" />
                        {n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="space-y-3 border-t border-line p-4">
            <ThemeToggle labels />
            <div className="flex items-center gap-1">
              <NavLink
                to="/instellingen"
                className={({ isActive }) =>
                  `flex h-10 flex-1 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    isActive ? 'bg-brand/10 text-brand' : 'text-fg-2 hover:bg-hover hover:text-fg'
                  }`
                }
              >
                <Icon name="settings" className="size-[18px]" />
                Instellingen
              </NavLink>
              <button onClick={() => supabase.auth.signOut()} className={iconButton} aria-label="Uitloggen" title="Uitloggen">
                <Icon name="logout" className="size-[18px]" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobiel en tablet: compacte bovenbalk. */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <Logo />
            <div className="ml-auto flex items-center gap-1">
              <ThemeSwitchButton />
              <Link to="/instellingen" className="ml-1 rounded-full" aria-label="Instellingen">
                <Avatar name={me.display_name} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[88rem] px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {/* Binnen de layout, zodat zijbalk en tabbalk blijven staan terwijl een pagina laadt. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobiel: vaste tabbalk onderaan, binnen duimbereik. */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
          aria-label="Hoofdmenu"
        >
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
