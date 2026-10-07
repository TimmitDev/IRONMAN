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
  `relative flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] transition ${active ? 'font-medium text-fg' : 'text-fg-4 active:text-fg'}`

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
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-brand ring-2 ring-surface" aria-label={`${unread} nieuwe meldingen`} />
        )}
      </span>
      {t.label}
    </NavLink>
  )

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Hoofdmenu">
        <div className="mx-auto flex max-w-lg items-center">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <div className="flex flex-1 justify-center">
            <Link
              to="/workouts"
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_20px_-6px_rgb(227_18_45/0.7)] ring-4 ring-canvas transition active:scale-95"
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
      <Link to={`/leaderboard/${me.id}`} onClick={onClose} className="flex items-center gap-3 rounded-lg border border-line p-3 transition active:bg-hover">
        <Avatar name={me.display_name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{me.display_name}</span>
          <span className="block text-xs text-fg-3">Bekijk je profiel</span>
        </span>
        <Icon name="chevron-right" className="size-5 text-fg-4" />
      </Link>
      <dl className="mt-3 grid grid-cols-3 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="text-base font-medium text-fg tabular-nums">{s.value ?? '–'}</dd>
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
                className={`flex h-full flex-col items-center gap-2 rounded-lg border px-1 py-4 text-center transition active:bg-hover ${
                  active ? 'border-fg-3 bg-subtle' : 'border-line'
                }`}
              >
                <Icon name={n.icon} className={`size-5 ${active ? 'text-fg' : 'text-fg-3'}`} />
                <span className={`text-xs ${active ? 'font-medium text-fg' : 'text-fg-2'}`}>{n.label}</span>
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
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg-2 transition hover:bg-hover hover:text-danger active:bg-hover"
        >
          <Icon name="logout" className="size-[18px] text-fg-3" />
          Uitloggen
        </button>
      </div>
    </Modal>
  )
}
