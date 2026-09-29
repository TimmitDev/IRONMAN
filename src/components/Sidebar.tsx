import { Link, NavLink } from 'react-router-dom'
import { useSharedFollows } from '../lib/follows'
import { LEVELS, usePlanSettings } from '../lib/ironmanPlan'
import { NAV, useSessionCount } from '../lib/nav'
import { useMe } from '../lib/profile'
import { currentPhase, racePassed } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { iconButton } from '../lib/ui'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Logo } from './Logo'

// Instellingen, donkere modus en uitloggen zitten in het profielmenu van de navbar; zo past alles zonder scrollen.
const ITEMS = NAV.filter((n) => n.to !== '/instellingen')

/** Desktop-zijbalk: compact profiel en het menu. Vrienden en activiteit staan rechts (RightSidebar). */
export function Sidebar({ unread }: { unread: number }) {
  return (
    // Tegen de rand, gescheiden met een dunne lijn; overflow-y-auto is enkel een vangnet voor heel lage vensters.
    <aside className="no-scrollbar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line bg-canvas lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between pr-3 pl-5">
        <Logo />
        <Link to="/workouts" className={`${iconButton} size-8 border border-line text-fg-2`} aria-label="Training loggen" title="Training loggen">
          <Icon name="plus" className="size-4" />
        </Link>
      </div>

      <ProfileBlock />

      <nav className="px-3 py-4" aria-label="Hoofdmenu">
        <ul className="space-y-px">
          {ITEMS.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `group flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition ${
                    isActive ? 'bg-subtle font-medium text-fg' : 'text-fg-3 hover:bg-hover hover:text-fg'
                  }`
                }
              >
                <Icon name={n.icon} className="size-[18px]" />
                <span className="flex-1">{n.label}</span>
                {n.to === '/' && unread > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-2 tabular-nums">
                    <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                    {unread}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/** Compact profiel: avatar met naam en niveau/fase, daaronder drie kerncijfers tussen dunne lijnen. */
function ProfileBlock() {
  const { me } = useMe()
  const follows = useSharedFollows()
  const sessions = useSessionCount(me.id)
  const { settings } = usePlanSettings()
  const race = useRace()
  const subtitle = [settings ? LEVELS[settings.level].label : null, racePassed(race) ? null : `Fase ${currentPhase(race).name}`].filter(Boolean).join(' · ')

  const stats = [
    { label: 'Sessies', value: sessions },
    { label: 'Volgers', value: follows.loading ? null : follows.followers.length },
    { label: 'Volgend', value: follows.loading ? null : follows.following.length },
  ]

  return (
    <div className="border-y border-line px-3 py-3">
      <Link to={`/leaderboard/${me.id}`} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-hover">
        <Avatar name={me.display_name} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-fg">{me.display_name}</span>
          {subtitle && <span className="block truncate text-xs text-fg-3">{subtitle}</span>}
        </span>
      </Link>

      <dl className="mt-2 grid grid-cols-3 px-2 pb-1">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-[11px] text-fg-3">{s.label}</dt>
            <dd className="text-sm font-medium text-fg tabular-nums">{s.value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
