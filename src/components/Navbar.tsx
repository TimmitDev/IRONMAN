import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePlayerSearch } from '../lib/players'
import { useOnline } from '../lib/presence'
import { useMe } from '../lib/profile'
import type { InboxItem } from '../lib/social'
import { supabase } from '../lib/supabase'
import { SPORT_NOUN } from '../lib/types'
import { iconButton } from '../lib/ui'
import { Avatar } from './Avatar'
import { ago } from './FeedCard'
import { Icon, type IconName } from './Icon'
import { ProgressChips } from './LevelBadge'
import { DarkModeSwitch } from './ThemeToggle'

/** Open/dicht voor een uitklapmenu; sluit bij klik ernaast, Escape of een andere pagina. */
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, ref }
}

const panelClass =
  'absolute top-full right-0 z-40 mt-2 origin-top-right animate-pop rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/5 dark:shadow-black/40'

/**
 * Smalle balk bovenaan (desktop): spelers zoeken, meldingen en je profielmenu (met thema en uitloggen).
 * De paginanaam staat op de pagina zelf; loggen zit in de zijbalk.
 */
export function Navbar({ inbox, unread, onMarkRead }: { inbox: InboxItem[]; unread: number; onMarkRead: () => void }) {
  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center gap-3 border-b border-line bg-canvas/80 px-6 backdrop-blur-xl lg:flex">
      <PlayerSearch />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Link to="/dashboard" className="mr-2 rounded-full transition hover:opacity-80" aria-label="Je voortgang">
          <ProgressChips />
        </Link>
        <Notifications inbox={inbox} unread={unread} onMarkRead={onMarkRead} />
        <ProfileMenu />
      </div>
    </header>
  )
}

function PlayerSearch() {
  const [query, setQuery] = useState('')
  const { hits, loading } = usePlayerSearch(query)
  const { open, setOpen, ref } = usePopover()
  const navigate = useNavigate()
  const online = useOnline()

  const go = (id: string) => {
    setQuery('')
    setOpen(false)
    navigate(`/leaderboard/${id}`)
  }

  return (
    <div ref={ref} className="relative w-52 xl:w-64">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-4" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hits[0]) go(hits[0].id)
        }}
        placeholder="Zoek een speler…"
        aria-label="Zoek een speler"
        className="h-9 w-full rounded-lg border border-line bg-subtle pr-3 pl-9 text-sm text-fg placeholder:text-fg-4 focus:border-fg-3 focus:ring-2 focus:ring-fg/10 focus:outline-none"
      />
      {open && query.trim() && (
        <div className={`${panelClass} left-0 w-full`}>
          {hits.length ? (
            <ul>
              {hits.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => go(h.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-hover">
                    <Avatar name={h.display_name} size="sm" online={online.has(h.id)} />
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">{h.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-2 text-sm text-fg-3">{loading ? 'Zoeken…' : 'Geen spelers gevonden.'}</p>
          )}
        </div>
      )}
    </div>
  )
}

function Notifications({ inbox, unread, onMarkRead }: { inbox: InboxItem[]; unread: number; onMarkRead: () => void }) {
  const { open, setOpen, ref } = usePopover()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open) onMarkRead()
        }}
        className={`${iconButton} relative ${open ? 'bg-hover text-fg' : ''}`}
        aria-label={unread ? `Meldingen, ${unread} nieuw` : 'Meldingen'}
        aria-expanded={open}
      >
        <Icon name="bell" className="size-5" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-brand ring-2 ring-surface" aria-hidden />
        )}
      </button>
      {open && (
        <div className={`${panelClass} w-80`}>
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <p className="font-semibold text-fg">Meldingen</p>
            <Link to="/" className="text-xs font-medium text-fg-3 hover:text-fg">
              Naar Home
            </Link>
          </div>
          {inbox.length ? (
            <ul className="max-h-96 overflow-y-auto">
              {inbox.map((i) => (
                <li key={`${i.kind}-${i.user_id}-${i.created_at}`}>
                  <Link to={`/leaderboard/${i.user_id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-hover">
                    <Avatar name={i.display_name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-fg-2">
                        <span className="font-semibold text-fg">{i.display_name}</span>{' '}
                        {i.kind === 'kudos' ? `gaf kudos op je ${SPORT_NOUN[i.sport]}` : `reageerde op je ${SPORT_NOUN[i.sport]}`}
                      </span>
                      {i.body && <span className="block truncate text-xs text-fg-3">“{i.body}”</span>}
                      <span className="block text-[11px] text-fg-4">{ago(i.created_at)}</span>
                    </span>
                    <Icon name={i.kind === 'kudos' ? 'heart' : 'message'} className="size-4 shrink-0 text-fg-4" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 pb-2 text-sm text-fg-3">Nog geen meldingen. Kudos en reacties op je trainingen verschijnen hier.</p>
          )}
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, icon, children }: { to: string; icon: IconName; children: ReactNode }) {
  return (
    <Link to={to} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-fg-2 transition hover:bg-hover hover:text-fg">
      <Icon name={icon} className="size-[18px] text-fg-3" />
      {children}
    </Link>
  )
}

function ProfileMenu() {
  const { me } = useMe()
  const { session } = useAuth()
  const { open, setOpen, ref } = usePopover()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 transition hover:bg-hover ${open ? 'bg-hover' : ''}`}
        aria-label="Profielmenu"
        aria-expanded={open}
      >
        <Avatar name={me.display_name} size="sm" />
        <Icon name="chevron-down" className={`size-4 text-fg-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`${panelClass} w-72`}>
          <div className="flex items-center gap-3 px-2 pt-1 pb-3">
            <Avatar name={me.display_name} size="md" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-fg">{me.display_name}</span>
              <span className="block truncate text-xs text-fg-3">{session?.user.email}</span>
            </span>
          </div>
          <div className="space-y-0.5 border-t border-line pt-2">
            <MenuLink to={`/leaderboard/${me.id}`} icon="user">
              Bekijk je profiel
            </MenuLink>
            <MenuLink to="/instellingen" icon="settings">
              Instellingen
            </MenuLink>
          </div>
          <div className="mt-2 space-y-0.5 border-t border-line pt-2">
            <DarkModeSwitch />
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg-2 transition hover:bg-hover hover:text-danger"
            >
              <Icon name="logout" className="size-[18px] text-fg-3" />
              Uitloggen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
