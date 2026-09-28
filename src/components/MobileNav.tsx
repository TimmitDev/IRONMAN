import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSharedFollows } from '../lib/follows'
import { NAV, useSessionCount } from '../lib/nav'
import { useMe } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'
import { Modal } from './Modal'
import { DarkModeSwitch } from './ThemeToggle'

/** Vaste tabs; al de rest van NAV staat onder "Meer". */
const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/plan', label: 'Schema', icon: 'calendar' },
  { to: '/dashboard', label: 'Mijn', icon: 'chart' },
]
const MORE = NAV.filter((n) => !TABS.some((t) => t.to === n.to))

const tabClass = (active: boolean) =>
  `relative flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition ${active ? 'text-brand' : 'text-fg-3 active:text-fg'}`

/**
 * Mobiele navigatie (onder lg): Home · Schema · + · Mijn · Meer.
 * "Meer" opent een menu van onderen met je profiel, alle andere pagina's, donkere modus en uitloggen.
 */
export function MobileNav({ unread }: { unread: number }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const moreActive = MORE.some((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))

  const tab = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => tabClass(isActive)}>
      <span className="relative">
        <Icon name={t.icon} className="size-6" />
        {t.to === '/' && unread > 0 && (
          <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-bold text-white tabular-nums ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
      {t.label}
    </NavLink>
  )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Hoofdmenu">
        <div className="mx-auto flex max-w-lg items-end">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <div className="flex flex-1 justify-center">
            <Link
              to="/workouts"
              className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95"
              aria-label="Training loggen"
            >
              <Icon name="plus" className="size-6" strokeWidth={2.5} />
            </Link>
          </div>
          {tab(TABS[2])}
          <button type="button" onClick={() => setOpen(true)} className={tabClass(moreActive || open)} aria-haspopup="dialog" aria-expanded={open}>
            <Icon name="menu" className="size-6" />
            Meer
          </button>
        </div>
      </nav>

      {open && <MoreSheet pathname={pathname} onClose={() => setOpen(false)} />}
    </>
  )
}

function MoreSheet({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const { me } = useMe()
  const follows = useSharedFollows()
  const sessions = useSessionCount(me.id)
  const stats = [
    { label: 'Sessies', value: sessions },
    { label: 'Volgers', value: follows.loading ? null : follows.followers.length },
    { label: 'Volgend', value: follows.loading ? null : follows.following.length },
  ]

  return (
    <Modal title="Menu" onClose={onClose}>
      {/* Profiel, zoals bovenaan de zijbalk op desktop. */}
      <Link to={`/leaderboard/${me.id}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl bg-subtle p-3 transition active:bg-hover">
        <span className="rounded-full p-0.5 ring-2 ring-brand/70">
          <Avatar name={me.display_name} size="lg" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-fg">{me.display_name}</span>
          <span className="block text-xs text-fg-3">Bekijk je profiel</span>
        </span>
        <Icon name="chevron-right" className="size-5 text-fg-4" />
      </Link>
      <dl className="mt-3 grid grid-cols-3 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="text-lg font-bold tracking-tight text-fg tabular-nums">{s.value ?? '–'}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 grid grid-cols-3 gap-2">
        {MORE.map((n) => {
          const active = pathname === n.to || pathname.startsWith(`${n.to}/`)
          return (
            <li key={n.to}>
              <Link
                to={n.to}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center gap-2 rounded-2xl px-1 py-3.5 text-center transition active:scale-[0.97] ${
                  active ? 'bg-brand/10 ring-1 ring-brand/30' : 'bg-subtle active:bg-hover'
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface shadow-card">
                  <Icon name={n.icon} className={`size-5 ${n.tint}`} />
                </span>
                <span className={`text-xs font-medium ${active ? 'text-brand' : 'text-fg-2'}`}>{n.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 space-y-1 border-t border-line pt-3">
        <DarkModeSwitch />
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-fg-2 transition hover:bg-danger/10 hover:text-danger active:bg-danger/10"
        >
          <Icon name="logout" className="size-5" />
          Uitloggen
        </button>
      </div>
    </Modal>
  )
}
