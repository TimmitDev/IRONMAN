import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActiveChallengesCard } from '../components/ActiveChallengesCard'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { FeedCard, ago } from '../components/FeedCard'
import { FollowButton } from '../components/FollowButton'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { WeekPodium } from '../components/WeekPodium'
import { useOnline } from '../lib/presence'
import { useMe, type Profile, type ProfileFields } from '../lib/profile'
import { formatDuration, formatShortDate, sumMinutes, weekStart } from '../lib/race'
import { useSharedFollows } from '../lib/follows'
import { useFeed, useInbox, usePlayers, type FeedPerson, type Follows, type InboxItem } from '../lib/social'
import { SPORT_NOUN, type Workout } from '../lib/types'
import { eyebrowClass, errorMessage, ghostButton, linkClass, primaryButton, secondaryButton } from '../lib/ui'
import { useWorkouts } from '../lib/useWorkouts'

type MobileTab = 'feed' | 'me' | 'friends'
type FeedFilter = 'all' | 'following'

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'Iedereen' },
  { key: 'following', label: 'Gevolgd' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeieavond'
}

export function Hub() {
  const { me, save } = useMe()
  const meId = me.id
  const [filter, setFilter] = useState<FeedFilter>('all')
  const feed = useFeed(filter === 'following')
  const follows = useSharedFollows()
  const online = useOnline()
  const players = usePlayers()
  const { workouts } = useWorkouts()
  const [tab, setTab] = useState<MobileTab>('feed')

  const onlineFriends = follows.following.filter((f) => online.has(f.user_id))
  const tabs: { key: MobileTab; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'me', label: 'Jij' },
    { key: 'friends', label: onlineFriends.length ? `Vrienden · ${onlineFriends.length} online` : 'Vrienden' },
  ]
  // Home is puur sociaal: vanaf xl enkel de feed; vrienden, weektop en activiteit staan dan in de rechter zijbalk.
  // Daaronder één onderdeel tegelijk via de tabs. Je eigen cijfers (sessies, badges) staan op het Dashboard.
  const feedClass = tab === 'feed' ? '' : 'hidden xl:block'
  const tabClass = (t: MobileTab) => (tab === t ? 'xl:hidden' : 'hidden')

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <HubHeader name={me.display_name} />

      <div className="xl:hidden">
        <Segmented options={tabs} value={tab} onChange={setTab} full />
      </div>

      <div>
        <section className={`space-y-4 ${feedClass}`} aria-label="Activiteit">
          {!me.share_workouts && (
            <ShareCta
              profile={me}
              onSave={async (fields) => {
                await save(fields)
                await feed.refresh()
              }}
            />
          )}
          <OnlineStrip friends={onlineFriends} />
          <div className="flex items-center justify-between gap-2">
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
            <button type="button" onClick={feed.refresh} disabled={feed.loading} className={ghostButton}>
              <Icon name="refresh" className={`size-4 ${feed.loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Vernieuwen</span>
              <span className="sr-only sm:hidden">Vernieuwen</span>
            </button>
          </div>

          {feed.error && (
            <Card>
              <p className="text-sm text-danger">Kon de feed niet laden: {feed.error}</p>
              <p className="mt-1 text-xs text-fg-3">Zijn migraties 007_social.sql en 008_follows.sql al uitgevoerd in Supabase?</p>
            </Card>
          )}
          {feed.loading && !feed.items.length && (
            <div className="space-y-4" aria-label="Laden…">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl bg-subtle" />
              ))}
            </div>
          )}
          {!feed.loading && !feed.error && !feed.items.length && (
            <Card>
              {filter === 'following' ? (
                <EmptyState icon="users" title="Nog niets van wie je volgt">
                  Nog geen trainingen van spelers die je volgt. Volg iemand via Vrienden of hun profiel.
                </EmptyState>
              ) : (
                <EmptyState icon="activity" title="Nog geen gedeelde trainingen">
                  Zodra spelers hun trainingen delen, verschijnen ze hier.
                </EmptyState>
              )}
            </Card>
          )}

          {feed.items.map((item) => (
            <FeedCard key={item.id} item={item} me={me} online={online.has(item.user_id)} onPatch={(fn) => feed.patch(item.id, fn)} />
          ))}

          {feed.hasMore && (
            <button type="button" onClick={feed.loadMore} disabled={feed.loading} className={`w-full ${secondaryButton}`}>
              {feed.loading ? 'Laden…' : 'Meer laden'}
            </button>
          )}
        </section>

        {/* Mobiel en tablet: "Jij" en "Vrienden" als aparte tabs. Vanaf xl staat dit in de zijbalken. */}
        <aside className={`space-y-4 ${tabClass('me')}`}>
          <div className="lg:hidden">
            <ProfileCard profile={me} follows={follows} workouts={workouts} />
          </div>
          <ActiveChallengesCard />
          <WeekPodium />
        </aside>

        <aside className={`space-y-4 ${tabClass('friends')}`}>
          <OnlineCard meId={meId} follows={follows} online={online} players={players} />
          <SuggestionsCard meId={meId} follows={follows} players={players} />
          <InboxCard />
        </aside>
      </div>
    </div>
  )
}

/** Rustige begroeting. Loggen, countdown en je cijfers staan al in de zijbalk, de tabbalk en het Dashboard. */
function HubHeader({ name }: { name: string }) {
  return (
    <header>
      <p className="text-sm text-fg-3">{greeting()}</p>
      <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{name}</h1>
    </header>
  )
}

function ProfileCard({ profile, follows, workouts }: { profile: Profile; follows: Follows; workouts: Workout[] }) {
  const monday = weekStart(new Date())
  const week = workouts.filter((w) => w.date >= monday)
  const stats = [
    { label: 'Volgend', value: follows.following.length },
    { label: 'Volgers', value: follows.followers.length },
    { label: 'Sessies', value: workouts.length },
  ]

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={profile.display_name} size="lg" highlight />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-fg">{profile.display_name}</p>
          <Link to={`/leaderboard/${profile.id}`} className={`${linkClass} inline-flex items-center gap-1 text-xs`}>
            Bekijk profiel <Icon name="arrow-right" className="size-3.5" />
          </Link>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse">
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="text-lg font-medium tracking-tight text-fg tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-fg-3">
        Deze week: <span className="font-medium text-fg tabular-nums">{week.length}</span> {week.length === 1 ? 'sessie' : 'sessies'}
        {week.length > 0 && (
          <>
            {' · '}
            <span className="font-medium text-fg tabular-nums">{formatDuration(sumMinutes(week))}</span>
          </>
        )}
      </p>
    </Card>
  )
}

/** Mobiel en tablet, boven de feed: wie van je vrienden nu online is, horizontaal scrollbaar. */
function OnlineStrip({ friends }: { friends: FeedPerson[] }) {
  if (!friends.length) return null
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 xl:hidden">
      {friends.map((f) => (
        <Link key={f.user_id} to={`/leaderboard/${f.user_id}`} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
          <Avatar name={f.display_name} size="lg" online />
          <span className="w-full truncate text-[11px] text-fg-2">{f.display_name}</span>
        </Link>
      ))}
    </div>
  )
}

function PersonRow({ person, online, sub, action }: { person: FeedPerson; online?: boolean; sub?: string; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Link to={`/leaderboard/${person.user_id}`} className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-hover">
        <Avatar name={person.display_name} size="sm" online={online} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{person.display_name}</p>
          {sub && <p className="truncate text-xs text-fg-3">{sub}</p>}
        </div>
      </Link>
      {action}
    </li>
  )
}

function OnlineCard({ meId, follows, online, players }: { meId: string; follows: Follows; online: Set<string>; players: FeedPerson[] }) {
  const friendsOnline = follows.following.filter((f) => online.has(f.user_id))
  const friendsOffline = follows.following.filter((f) => !online.has(f.user_id))
  const othersOnline = players.filter((p) => p.user_id !== meId && online.has(p.user_id) && !follows.isFollowing(p.user_id))

  return (
    <Card
      title="Online"
      action={
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-3 tabular-nums">
          <span className={`size-1.5 rounded-full ${friendsOnline.length ? 'bg-success' : 'bg-line-strong'}`} aria-hidden />
          {friendsOnline.length}
        </span>
      }
    >
      {friendsOnline.length ? (
        <ul className="space-y-1">
          {friendsOnline.map((f) => (
            <PersonRow key={f.user_id} person={f} online sub="Nu online" />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-3">{follows.following.length ? 'Geen vrienden online.' : 'Volg spelers om te zien wie er online is.'}</p>
      )}

      {othersOnline.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className={`${eyebrowClass} mb-2`}>Ook online</p>
          <ul className="space-y-1">
            {othersOnline.slice(0, 5).map((p) => (
              <PersonRow key={p.user_id} person={p} online action={<FollowButton person={p} follows={follows} />} />
            ))}
          </ul>
        </div>
      )}

      {friendsOffline.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className={`${eyebrowClass} mb-2`}>Offline</p>
          <ul className="space-y-1 opacity-70">
            {friendsOffline.slice(0, 8).map((f) => (
              <PersonRow key={f.user_id} person={f} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function SuggestionsCard({ meId, follows, players }: { meId: string; follows: Follows; players: FeedPerson[] }) {
  const followsMe = new Set(follows.followers.map((f) => f.user_id))
  // Wie jou al volgt eerst: die volg je waarschijnlijk graag terug.
  const suggestions = players
    .filter((p) => p.user_id !== meId && !follows.isFollowing(p.user_id))
    .sort((a, b) => Number(followsMe.has(b.user_id)) - Number(followsMe.has(a.user_id)))
    .slice(0, 5)
  if (follows.loading || !suggestions.length) return null

  return (
    <Card title="Wie volgen?">
      <ul className="space-y-1">
        {suggestions.map((p) => (
          <PersonRow
            key={p.user_id}
            person={p}
            sub={followsMe.has(p.user_id) ? 'Volgt jou' : undefined}
            action={<FollowButton person={p} follows={follows} />}
          />
        ))}
      </ul>
    </Card>
  )
}

function ShareCta({ profile, onSave }: { profile: Profile; onSave: (f: ProfileFields) => Promise<void> }) {
  const [busy, setBusy] = useState(false)

  async function enable() {
    setBusy(true)
    try {
      await onSave({ display_name: profile.display_name, show_on_leaderboard: true, share_workouts: true })
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex gap-3">
        <Icon name="users" className="mt-0.5 size-[18px] shrink-0 text-fg-3" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">Deel je trainingen in de feed</p>
          <p className="mt-1 text-sm text-fg-3">
            Anderen zien datum, sport, duur en afstand en kunnen kudos geven. Notities en RPE blijven privé.
            {!profile.show_on_leaderboard && ' Je komt dan ook op het leaderboard.'}
          </p>
          <button type="button" onClick={enable} disabled={busy} className={`mt-4 ${primaryButton}`}>
            {busy ? 'Bezig…' : 'Delen aanzetten'}
          </button>
        </div>
      </div>
    </Card>
  )
}

function InboxCard() {
  const items = useInbox()
  if (!items.length) return null

  return (
    <Card title="Voor jou" action={<Icon name="bell" className="size-4 text-fg-3" />}>
      <ul className="divide-y divide-line">
        {items.slice(0, 5).map((i) => (
          <InboxRow key={`${i.kind}-${i.user_id}-${i.created_at}`} item={i} />
        ))}
      </ul>
    </Card>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  return (
    <li className="flex gap-3 py-3 text-sm first:pt-0 last:pb-0">
      <span className="relative shrink-0">
        <Avatar name={item.display_name} size="sm" />
        <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-surface text-fg-3 ring-2 ring-surface">
          <Icon name={item.kind === 'kudos' ? 'heart' : 'message'} className="size-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-fg-2">
          <span className="font-medium text-fg">{item.display_name}</span> {item.kind === 'kudos' ? 'gaf kudos op' : 'reageerde op'} je{' '}
          {SPORT_NOUN[item.sport]} van {formatShortDate(item.date)}
        </p>
        {item.body && <p className="mt-0.5 truncate text-fg-3">“{item.body}”</p>}
      </div>
      <span className="shrink-0 text-xs text-fg-4">{ago(item.created_at)}</span>
    </li>
  )
}
