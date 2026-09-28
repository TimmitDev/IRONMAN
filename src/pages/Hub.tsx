import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BadgesCard } from '../components/Badges'
import { Card } from '../components/Card'
import { FeedCard, ago } from '../components/FeedCard'
import { FollowButton } from '../components/FollowButton'
import { Segmented } from '../components/Segmented'
import { WorkoutList } from '../components/WorkoutList'
import { useAuth } from '../lib/auth'
import { useBadges } from '../lib/badges'
import { useLeaderboard, useProfile, type Profile, type ProfileFields } from '../lib/leaderboard'
import { useOnline } from '../lib/presence'
import { RACE, addDays, currentPhase, daysUntilRace, formatDuration, formatShortDate, sumMinutes, weekStart } from '../lib/race'
import { useFeed, useFollows, useInbox, usePlayers, type FeedPerson, type Follows, type InboxItem } from '../lib/social'
import type { Sport, Workout } from '../lib/types'
import { errorMessage, ghostButton, primaryButton } from '../lib/ui'
import { useGoals } from '../lib/useGoals'
import { useWorkouts } from '../lib/useWorkouts'

const SPORT_NOUN: Record<Sport, string> = {
  swim: 'zwemsessie',
  bike: 'fietsrit',
  run: 'loopsessie',
  strength: 'krachttraining',
}

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
  const { session } = useAuth()
  const meId = session!.user.id
  const { profile, loading: profileLoading, save } = useProfile()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const feed = useFeed(filter === 'following')
  const follows = useFollows(meId)
  const online = useOnline()
  const players = usePlayers()
  const { workouts, loading: workoutsLoading } = useWorkouts()
  const { goals } = useGoals()
  const badges = useBadges(workouts, goals)
  const [tab, setTab] = useState<MobileTab>('feed')

  const name = profile?.display_name ?? session!.user.email!.split('@')[0]
  const onlineFriends = follows.following.filter((f) => online.has(f.user_id))
  const tabs: { key: MobileTab; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'me', label: 'Jij' },
    { key: 'friends', label: onlineFriends.length ? `Vrienden · ${onlineFriends.length} online` : 'Vrienden' },
  ]
  // Mobiel: één kolom tegelijk via tabs. Vanaf lg staan de drie kolommen naast elkaar.
  const column = (t: MobileTab) => `${tab === t ? '' : 'hidden'} lg:block`

  return (
    <div className="space-y-4">
      <HubHeader name={name} />

      <div className="lg:hidden">
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_15rem] lg:items-start xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
        {/* Links: jouw profiel, vrienden, sessies en badges. */}
        <aside className={`space-y-4 ${column('me')}`}>
          {!profileLoading && !profile && <JoinCta />}
          {profile && <ProfileCard profile={profile} follows={follows} workouts={workouts} />}
          {profile && !profile.share_workouts && (
            <ShareCta
              profile={profile}
              onSave={async (fields) => {
                await save(fields)
                await feed.refresh()
              }}
            />
          )}
          <FriendsCard follows={follows} online={online} onFindFriends={() => setTab('friends')} />
          <Card
            title="Recente sessies"
            action={
              <Link to="/workouts" className="text-xs font-semibold text-brand hover:underline">
                Log →
              </Link>
            }
          >
            {workoutsLoading ? <p className="text-sm text-zinc-500">Laden…</p> : <WorkoutList workouts={workouts.slice(0, 4)} />}
          </Card>
          <BadgesCard results={badges} />
        </aside>

        {/* Midden: de feed. */}
        <section className={`space-y-3 ${column('feed')}`} aria-label="Activiteit">
          <OnlineStrip friends={onlineFriends} />
          <div className="flex items-center justify-between gap-2">
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
            <button onClick={feed.refresh} disabled={feed.loading} className={`${ghostButton} disabled:opacity-50`}>
              Vernieuwen
            </button>
          </div>

          {feed.error && (
            <Card>
              <p className="text-sm text-red-400">Kon de feed niet laden: {feed.error}</p>
              <p className="mt-1 text-xs text-zinc-500">Zijn migraties 007_social.sql en 008_follows.sql al uitgevoerd in Supabase?</p>
            </Card>
          )}
          {feed.loading && !feed.items.length && <p className="px-1 text-sm text-zinc-500">Laden…</p>}
          {!feed.loading && !feed.error && !feed.items.length && (
            <Card>
              <p className="text-center text-sm text-zinc-400">
                {filter === 'following'
                  ? 'Nog geen trainingen van spelers die je volgt. Volg iemand via Vrienden of hun profiel.'
                  : 'Nog geen gedeelde trainingen. Zodra spelers hun trainingen delen, verschijnen ze hier.'}
              </p>
            </Card>
          )}

          {feed.items.map((item) => (
            <FeedCard key={item.id} item={item} me={profile} online={online.has(item.user_id)} onPatch={(fn) => feed.patch(item.id, fn)} />
          ))}

          {feed.hasMore && (
            <button onClick={feed.loadMore} disabled={feed.loading} className={`w-full ${ghostButton} py-2.5 disabled:opacity-50`}>
              {feed.loading ? 'Laden…' : 'Meer laden'}
            </button>
          )}
        </section>

        {/* Rechts: wie er online is, suggesties, weektop en meldingen. Op desktop blijft deze balk staan. */}
        <aside className={`space-y-4 ${column('friends')} lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto`}>
          <OnlineCard meId={meId} follows={follows} online={online} players={players} canFollow={Boolean(profile)} />
          <SuggestionsCard meId={meId} follows={follows} players={players} canFollow={Boolean(profile)} />
          <WeekPodium profile={profile} meId={meId} />
          <InboxCard />
        </aside>
      </div>
    </div>
  )
}

function HubHeader({ name }: { name: string }) {
  const days = daysUntilRace()
  const phase = currentPhase()
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand/20 blur-3xl" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">{greeting()}</p>
          <h1 className="mt-1 truncate text-3xl font-black tracking-tight sm:text-4xl">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-zinc-300 transition hover:bg-white/10">
              <span className="font-bold text-white tabular-nums">{days}</span> dagen tot {RACE.name}
            </Link>
            <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-zinc-300">
              Fase <span className="ml-1 font-semibold text-white">{phase.name}</span>
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Link to="/workouts" className={`${primaryButton} text-center`}>
            + Training loggen
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            Mijn dashboard
          </Link>
        </div>
      </div>
    </Card>
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
          <p className="truncate text-lg font-black text-white">{profile.display_name}</p>
          <Link to={`/leaderboard/${profile.id}`} className="text-xs font-semibold text-brand hover:underline">
            Bekijk profiel →
          </Link>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-xl bg-zinc-800/50 py-2">
            <dt className="text-[11px] text-zinc-400">{s.label}</dt>
            <dd className="text-lg font-black text-white tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-zinc-400">
        Deze week: <span className="font-semibold text-white">{week.length}</span> {week.length === 1 ? 'sessie' : 'sessies'}
        {week.length > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-white">{formatDuration(sumMinutes(week))}</span>
          </>
        )}
      </p>
    </Card>
  )
}

function FriendsCard({ follows, online, onFindFriends }: { follows: Follows; online: Set<string>; onFindFriends: () => void }) {
  // Online vrienden eerst.
  const friends = [...follows.following].sort((a, b) => Number(online.has(b.user_id)) - Number(online.has(a.user_id)))

  return (
    <Card title={`Vrienden · ${friends.length}`}>
      {follows.loading ? (
        <p className="text-sm text-zinc-500">Laden…</p>
      ) : friends.length ? (
        <ul className="grid grid-cols-4 gap-2">
          {friends.slice(0, 12).map((f) => (
            <li key={f.user_id}>
              <Link to={`/leaderboard/${f.user_id}`} className="flex flex-col items-center gap-1 rounded-lg p-1 text-center transition hover:bg-white/5" title={f.display_name}>
                <Avatar name={f.display_name} online={online.has(f.user_id)} />
                <span className="w-full truncate text-[11px] text-zinc-300">{f.display_name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-zinc-500">
          <p>Je volgt nog niemand.</p>
          {/* Op desktop staan de suggesties al rechts; op mobiel springt dit naar de Vrienden-tab. */}
          <button onClick={onFindFriends} className="mt-1 font-semibold text-brand hover:underline lg:hidden">
            Vind spelers →
          </button>
        </div>
      )}
    </Card>
  )
}

/** Mobiel, boven de feed: wie van je vrienden nu online is, horizontaal scrollbaar. */
function OnlineStrip({ friends }: { friends: FeedPerson[] }) {
  if (!friends.length) return null
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:hidden">
      {friends.map((f) => (
        <Link key={f.user_id} to={`/leaderboard/${f.user_id}`} className="flex w-14 shrink-0 flex-col items-center gap-1 text-center">
          <Avatar name={f.display_name} size="lg" online />
          <span className="w-full truncate text-[11px] text-zinc-300">{f.display_name}</span>
        </Link>
      ))}
    </div>
  )
}

function PersonRow({ person, online, sub, action }: { person: FeedPerson; online?: boolean; sub?: string; action?: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Link to={`/leaderboard/${person.user_id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:brightness-125">
        <Avatar name={person.display_name} size="sm" online={online} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{person.display_name}</p>
          {sub && <p className="truncate text-[11px] text-zinc-500">{sub}</p>}
        </div>
      </Link>
      {action}
    </li>
  )
}

function OnlineCard({
  meId,
  follows,
  online,
  players,
  canFollow,
}: {
  meId: string
  follows: Follows
  online: Set<string>
  players: FeedPerson[]
  canFollow: boolean
}) {
  const friendsOnline = follows.following.filter((f) => online.has(f.user_id))
  const friendsOffline = follows.following.filter((f) => !online.has(f.user_id))
  const othersOnline = players.filter((p) => p.user_id !== meId && online.has(p.user_id) && !follows.isFollowing(p.user_id))

  return (
    <Card title={`Online · ${friendsOnline.length}`}>
      {friendsOnline.length ? (
        <ul className="space-y-3">
          {friendsOnline.map((f) => (
            <PersonRow key={f.user_id} person={f} online sub="Nu online" />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">{follows.following.length ? 'Geen vrienden online.' : 'Volg spelers om te zien wie er online is.'}</p>
      )}

      {othersOnline.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="mb-3 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Ook online</p>
          <ul className="space-y-3">
            {othersOnline.slice(0, 5).map((p) => (
              <PersonRow key={p.user_id} person={p} online action={<FollowButton person={p} follows={follows} disabled={!canFollow} />} />
            ))}
          </ul>
        </div>
      )}

      {friendsOffline.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="mb-3 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Offline</p>
          <ul className="space-y-3 opacity-60">
            {friendsOffline.slice(0, 8).map((f) => (
              <PersonRow key={f.user_id} person={f} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function SuggestionsCard({ meId, follows, players, canFollow }: { meId: string; follows: Follows; players: FeedPerson[]; canFollow: boolean }) {
  const followsMe = new Set(follows.followers.map((f) => f.user_id))
  // Wie jou al volgt eerst: die volg je waarschijnlijk graag terug.
  const suggestions = players
    .filter((p) => p.user_id !== meId && !follows.isFollowing(p.user_id))
    .sort((a, b) => Number(followsMe.has(b.user_id)) - Number(followsMe.has(a.user_id)))
    .slice(0, 5)
  if (follows.loading || !suggestions.length) return null

  return (
    <Card title="Wie volgen?">
      <ul className="space-y-3">
        {suggestions.map((p) => (
          <PersonRow
            key={p.user_id}
            person={p}
            sub={followsMe.has(p.user_id) ? 'Volgt jou' : undefined}
            action={<FollowButton person={p} follows={follows} disabled={!canFollow} />}
          />
        ))}
      </ul>
    </Card>
  )
}

function JoinCta() {
  return (
    <Card>
      <p className="font-semibold text-white">Doe mee met de groep</p>
      <p className="mt-1 text-sm text-zinc-400">Kies een naam om spelers te volgen, kudos te geven, te reageren en op het leaderboard te komen.</p>
      <Link to="/leaderboard" className={`mt-3 inline-block ${primaryButton}`}>
        Meedoen
      </Link>
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
      <p className="font-semibold text-white">Deel je trainingen in de feed</p>
      <p className="mt-1 text-sm text-zinc-400">
        Anderen zien datum, sport, duur en afstand en kunnen kudos geven. Notities en RPE blijven privé.
        {!profile.show_on_leaderboard && ' Je komt dan ook op het leaderboard.'}
      </p>
      <button onClick={enable} disabled={busy} className={`mt-3 ${primaryButton}`}>
        {busy ? 'Bezig…' : 'Delen aanzetten'}
      </button>
    </Card>
  )
}

function WeekPodium({ profile, meId }: { profile: Profile | null; meId: string }) {
  const start = weekStart(new Date())
  const { rows, loading } = useLeaderboard(start, addDays(start, 6), profile)
  const ranked = rows.filter((r) => r.total_min > 0).sort((a, b) => b.total_min - a.total_min)
  const max = ranked[0]?.total_min ?? 0
  const myRank = ranked.findIndex((r) => r.user_id === meId)
  const shown = ranked.slice(0, 3).map((r, i) => ({ r, rank: i + 1 }))
  if (myRank >= 3) shown.push({ r: ranked[myRank], rank: myRank + 1 })

  return (
    <Card
      title="Top deze week"
      action={
        <Link to="/leaderboard" className="text-xs font-semibold text-brand hover:underline">
          Ranking →
        </Link>
      }
    >
      {loading && !rows.length ? (
        <p className="text-sm text-zinc-500">Laden…</p>
      ) : !shown.length ? (
        <p className="text-sm text-zinc-500">Nog niemand getraind deze week. Wees de eerste!</p>
      ) : (
        <ol className="space-y-3">
          {shown.map(({ r, rank }) => {
            const isMe = r.user_id === meId
            return (
              <li key={r.user_id}>
                <Link to={`/leaderboard/${r.user_id}`} className="flex items-center gap-3 rounded-lg transition hover:brightness-125">
                  <span className={`w-5 shrink-0 text-center text-lg font-black italic ${rank === 1 ? 'text-brand' : 'text-zinc-600'}`}>{rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className={`truncate font-semibold ${isMe ? 'text-brand' : 'text-white'}`}>{isMe ? 'Jij' : r.display_name}</span>
                      <span className="shrink-0 font-semibold text-white tabular-nums">{formatDuration(r.total_min)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
                      <div className={`h-full rounded-full ${isMe ? 'bg-brand' : 'bg-zinc-400'}`} style={{ width: `${max ? (r.total_min / max) * 100 : 0}%` }} />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

function InboxCard() {
  const items = useInbox()
  if (!items.length) return null

  return (
    <Card title="Voor jou">
      <ul className="space-y-3">
        {items.slice(0, 5).map((i) => (
          <InboxRow key={`${i.kind}-${i.user_id}-${i.created_at}`} item={i} />
        ))}
      </ul>
    </Card>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  return (
    <li className="flex gap-3 text-sm">
      <Avatar name={item.display_name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-zinc-300">
          <span className="font-semibold text-white">{item.display_name}</span>{' '}
          {item.kind === 'kudos' ? 'gaf kudos op' : 'reageerde op'} je {SPORT_NOUN[item.sport]} van {formatShortDate(item.date)}
        </p>
        {item.body && <p className="mt-0.5 truncate text-zinc-400">“{item.body}”</p>}
      </div>
      <span className="shrink-0 text-xs text-zinc-500">{ago(item.created_at)}</span>
    </li>
  )
}
