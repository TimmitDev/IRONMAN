import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSharedFollows } from '../lib/follows'
import { LEVELS, usePlanSettings } from '../lib/ironmanPlan'
import { useMe } from '../lib/profile'
import { RACE, currentPhase, daysUntilRace } from '../lib/race'
import { useInbox, type InboxItem } from '../lib/social'
import { supabase } from '../lib/supabase'
import { iconButton } from '../lib/ui'
import { useWorkoutsChanged } from '../lib/useWorkouts'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { DarkModeSwitch } from './ThemeToggle'

// Elk onderdeel een eigen icoonkleur, zodat het menu in één oogopslag leesbaar is.
const NAV: { to: string; label: string; icon: IconName; tint: string; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', tint: 'text-brand', end: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'chart', tint: 'text-swim' },
  { to: '/plan', label: 'Schema', icon: 'calendar', tint: 'text-bike' },
  { to: '/workouts', label: 'Trainingen', icon: 'activity', tint: 'text-run' },
  { to: '/goals', label: 'Doelen', icon: 'target', tint: 'text-strength' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy', tint: 'text-warning' },
  { to: '/instellingen', label: 'Instellingen', icon: 'settings', tint: 'text-fg-3' },
]

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

/** Meldingen die nieuwer zijn dan je laatste bezoek aan Home (per toestel bijgehouden). */
function useUnread(meId: string, items: InboxItem[]) {
  const { pathname } = useLocation()
  const key = `inbox_seen_${meId}`
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  })

  // Op Home zie je "Voor jou", dus dan telt alles als gelezen.
  useEffect(() => {
    const latest = items[0]?.created_at
    if (pathname !== '/' || !latest || latest <= seen) return
    setSeen(latest)
    try {
      localStorage.setItem(key, latest)
    } catch {
      // Opslag geblokkeerd: dan telt het alleen voor deze sessie.
    }
  }, [pathname, items, seen, key])

  return items.filter((i) => i.created_at > seen).length
}

/** Desktop-zijbalk: profiel bovenaan, dan het menu. Vrienden en activiteit staan rechts (RightSidebar). */
export function Sidebar() {
  const { me } = useMe()
  const inbox = useInbox()
  const unread = useUnread(me.id, inbox)

  return (
    // Zwevende kaart: los van de rand van het scherm, met eigen afronding en schaduw.
    <aside className="no-scrollbar fixed top-4 bottom-4 left-4 z-30 hidden w-72 flex-col overflow-y-auto rounded-3xl border border-line bg-surface shadow-xl shadow-black/5 lg:flex dark:shadow-black/40">
      <div className="flex h-16 shrink-0 items-center justify-between px-6">
        <Link to="/" className="text-xl font-black tracking-tight text-fg italic">
          IRON<span className="text-brand">MAN</span>
        </Link>
        <Link to="/workouts" className={`${iconButton} bg-brand/10 text-brand hover:bg-brand hover:text-white`} aria-label="Training loggen" title="Training loggen">
          <Icon name="plus" className="size-[18px]" strokeWidth={2.5} />
        </Link>
      </div>

      <ProfileBlock />

      <nav className="mx-4 border-t border-line py-5" aria-label="Hoofdmenu">
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
                    isActive ? 'bg-subtle font-semibold text-fg shadow-card' : 'font-medium text-fg-2 hover:bg-hover hover:text-fg'
                  }`
                }
              >
                <Icon name={n.icon} className={`size-5 ${n.tint}`} />
                <span className="flex-1">{n.label}</span>
                {n.to === '/' && unread > 0 && (
                  <span className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[11px] font-bold text-white tabular-nums">{unread}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-4 mt-auto space-y-1 border-t border-line py-4">
        <DarkModeSwitch />
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-fg-2 transition hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none"
        >
          <Icon name="logout" className="size-5" />
          Uitloggen
        </button>
      </div>
    </aside>
  )
}

/** Gecentreerd profiel: avatar, naam, niveau en fase, en drie kerncijfers. */
function ProfileBlock() {
  const { me } = useMe()
  const follows = useSharedFollows()
  const sessions = useSessionCount(me.id)
  const { settings } = usePlanSettings()
  const phase = currentPhase()
  const subtitle = [settings ? LEVELS[settings.level].label : null, `Fase ${phase.name}`].filter(Boolean).join(' · ')

  const stats = [
    { label: 'Sessies', value: sessions },
    { label: 'Volgers', value: follows.loading ? null : follows.followers.length },
    { label: 'Volgend', value: follows.loading ? null : follows.following.length },
  ]

  return (
    <div className="px-6 pt-4 pb-6 text-center">
      <Link to={`/leaderboard/${me.id}`} className="group relative mx-auto block w-fit">
        {/* Zachte gloed achter de avatar. */}
        <span className="pointer-events-none absolute inset-0 scale-150 rounded-full bg-brand/15 blur-2xl" aria-hidden />
        <span className="relative block rounded-full p-1 ring-2 ring-brand/70 transition group-hover:ring-brand">
          <Avatar name={me.display_name} size="xl" />
        </span>
      </Link>
      <Link to={`/leaderboard/${me.id}`} className="mt-4 inline-flex max-w-full items-center gap-1.5 hover:underline">
        <span className="truncate text-lg font-bold text-fg">{me.display_name}</span>
      </Link>
      <p className="text-xs font-medium text-fg-3">{subtitle}</p>
      <p className="mx-auto mt-2 max-w-[15rem] text-sm text-fg-2">
        Op weg naar {RACE.name}, nog <span className="font-semibold text-fg tabular-nums">{daysUntilRace()}</span> dagen.
      </p>

      <dl className="mt-5 grid grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="text-lg font-bold tracking-tight text-fg tabular-nums">{s.value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
