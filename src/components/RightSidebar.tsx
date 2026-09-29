import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../lib/feedback'
import { useSharedFollows } from '../lib/follows'
import { usePlayerSearch } from '../lib/players'
import { useOnline } from '../lib/presence'
import { useMe } from '../lib/profile'
import type { FeedPerson, InboxItem } from '../lib/social'
import { SPORT_NOUN } from '../lib/types'
import { errorMessage, iconButton } from '../lib/ui'
import { Avatar } from './Avatar'
import { ago } from './FeedCard'
import { Icon } from './Icon'
import { WeekPodium } from './WeekPodium'

type FriendsTab = 'following' | 'followers'

/** Rechter zijbalk (enkel op Home, vanaf xl): vrienden met online-status, de weektop en recente activiteit. */
export function RightSidebar({ inbox }: { inbox: InboxItem[] }) {
  return (
    <aside
      className="no-scrollbar fixed inset-y-0 right-0 z-30 hidden w-72 flex-col overflow-y-auto border-l border-line bg-canvas xl:flex"
      aria-label="Vrienden en activiteit"
    >
      <FriendsBlock />
      <div className="mx-5 border-t border-line py-5">
        <WeekPodium bare />
      </div>
      <ActivityBlock items={inbox} />
    </aside>
  )
}

function FriendsBlock() {
  const { me } = useMe()
  const follows = useSharedFollows()
  const online = useOnline()
  const [tab, setTab] = useState<FriendsTab>('following')
  const [query, setQuery] = useState('')
  const search = usePlayerSearch(query)

  const q = query.trim().toLowerCase()
  const list = (tab === 'following' ? follows.following : follows.followers)
    .filter((p) => !q || p.display_name.toLowerCase().includes(q))
    // Online eerst, daarna alfabetisch (zoals de lijst al binnenkomt).
    .sort((a, b) => Number(online.has(b.user_id)) - Number(online.has(a.user_id)))
  // Bij zoeken ook spelers die (nog) niet in de lijst staan.
  const listed = new Set(list.map((p) => p.user_id))
  const others = q ? search.hits.filter((h) => h.id !== me.id && !listed.has(h.id)).map((h) => ({ user_id: h.id, display_name: h.display_name })) : []
  const onlineCount = follows.following.filter((f) => online.has(f.user_id)).length

  const tabs: { key: FriendsTab; label: string; count: number }[] = [
    { key: 'following', label: 'Volgend', count: follows.following.length },
    { key: 'followers', label: 'Volgers', count: follows.followers.length },
  ]

  return (
    <section className="px-5 pt-5 pb-5">
      <div className="flex h-6 items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Vrienden</h2>
        {onlineCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-3">
            <span className="size-1.5 rounded-full bg-success" />
            {onlineCount} online
          </span>
        )}
      </div>

      <label className="relative mt-4 block">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-4" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek een speler…"
          aria-label="Zoek een speler"
          className="h-9 w-full rounded-lg border border-line bg-subtle pr-3 pl-9 text-sm text-fg placeholder:text-fg-4 focus:border-fg-3 focus:ring-2 focus:ring-fg/10 focus:outline-none"
        />
      </label>

      <div className="mt-4 flex gap-4 border-b border-line text-sm" role="tablist">
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b pb-2 transition ${active ? 'border-fg font-medium text-fg' : 'border-transparent text-fg-3 hover:text-fg'}`}
            >
              {t.label} <span className="text-fg-4 tabular-nums">{t.count}</span>
            </button>
          )
        })}
      </div>

      {follows.loading ? (
        <p className="mt-4 text-sm text-fg-3">Laden…</p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {list.slice(0, q ? 20 : 6).map((p) => (
            <PersonRow
              key={p.user_id}
              person={p}
              online={online.has(p.user_id)}
              sub={online.has(p.user_id) ? 'Nu online' : tab === 'followers' && !follows.isFollowing(p.user_id) ? 'Volgt jou' : 'Offline'}
              action={tab === 'followers' && !follows.isFollowing(p.user_id) ? <FollowIcon person={p} label="Terug volgen" /> : undefined}
            />
          ))}
          {others.map((p) => (
            <PersonRow key={p.user_id} person={p} online={online.has(p.user_id)} sub="Speler" action={follows.isFollowing(p.user_id) ? undefined : <FollowIcon person={p} label="Volgen" />} />
          ))}
          {!list.length && !others.length && (
            <li className="px-2 py-3 text-sm text-fg-3">
              {q
                ? search.loading
                  ? 'Zoeken…'
                  : 'Geen spelers gevonden.'
                : tab === 'following'
                  ? 'Je volgt nog niemand. Zoek hierboven een speler.'
                  : 'Nog niemand volgt je.'}
            </li>
          )}
        </ul>
      )}
      {!q && list.length > 6 && (
        <Link to="/leaderboard" className="mt-2 block px-2 text-xs font-medium text-fg-3 hover:text-fg">
          Alle {list.length} bekijken
        </Link>
      )}
    </section>
  )
}

function PersonRow({ person, online, sub, action }: { person: FeedPerson; online: boolean; sub: string; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-hover">
      <Link to={`/leaderboard/${person.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={person.display_name} size="sm" online={online} />
        <span className="min-w-0">
          <span className="block truncate text-sm text-fg">{person.display_name}</span>
          <span className="block truncate text-xs text-fg-3">{sub}</span>
        </span>
      </Link>
      {action}
    </li>
  )
}

/** Recente kudos en reacties op je trainingen, met volg-terug als je die persoon nog niet volgt. */
function ActivityBlock({ items }: { items: InboxItem[] }) {
  const follows = useSharedFollows()
  const online = useOnline()
  const { me } = useMe()

  return (
    <section className="mx-5 border-t border-line py-5">
      <div className="mb-3 flex h-6 items-center justify-between">
        <h2 className="text-sm font-medium text-fg">Activiteit</h2>
        <Link to="/" className="text-xs text-fg-3 hover:text-fg">
          Alles
        </Link>
      </div>
      {items.length ? (
        <ul className="space-y-px">
          {items.slice(0, 5).map((i) => (
            <li key={`${i.kind}-${i.user_id}-${i.created_at}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-hover">
              <Link to={`/leaderboard/${i.user_id}`} className="shrink-0">
                <Avatar name={i.display_name} size="sm" online={online.has(i.user_id)} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/leaderboard/${i.user_id}`} className="block truncate text-sm text-fg hover:underline">
                  {i.display_name}
                </Link>
                <p className="truncate text-xs text-fg-3">
                  {i.kind === 'kudos' ? `kudos op je ${SPORT_NOUN[i.sport]}` : i.body ? `“${i.body}”` : `reageerde op je ${SPORT_NOUN[i.sport]}`}
                  <span className="text-fg-4"> · {ago(i.created_at)}</span>
                </p>
              </div>
              {i.user_id !== me.id && !follows.loading && !follows.isFollowing(i.user_id) ? (
                <FollowIcon person={{ user_id: i.user_id, display_name: i.display_name }} label="Terug volgen" />
              ) : (
                <Icon name={i.kind === 'kudos' ? 'heart' : 'message'} className="size-4 shrink-0 text-fg-4" />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 text-sm text-fg-3">Kudos en reacties op je trainingen verschijnen hier.</p>
      )}
    </section>
  )
}

/** Compacte volgknop (plus-icoon) voor in lijsten. */
function FollowIcon({ person, label }: { person: FeedPerson; label: string }) {
  const follows = useSharedFollows()
  const [busy, setBusy] = useState(false)
  return (
    <button
      onClick={async () => {
        setBusy(true)
        try {
          await follows.follow(person)
        } catch (e) {
          toast.error(errorMessage(e))
        } finally {
          setBusy(false)
        }
      }}
      disabled={busy}
      className={`${iconButton} size-7 border border-line text-fg-2`}
      aria-label={`${person.display_name}: ${label.toLowerCase()}`}
      title={label}
    >
      <Icon name="plus" className="size-3.5" />
    </button>
  )
}
