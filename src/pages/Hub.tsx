import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { useAuth } from '../lib/auth'
import { useLeaderboard, useProfile, type Profile, type ProfileFields } from '../lib/leaderboard'
import { RACE, addDays, currentPhase, daysUntilRace, formatDuration, formatPace, formatSessionDuration, formatShortDate, parseISODate, todayISO, weekStart } from '../lib/race'
import { addComment, deleteComment, giveKudos, removeKudos, useFeed, useInbox, type FeedItem, type FeedPerson, type InboxItem } from '../lib/social'
import { SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { errorMessage, ghostButton, primaryButton } from '../lib/ui'

const SPORT_NOUN: Record<Sport, string> = {
  swim: 'zwemsessie',
  bike: 'fietsrit',
  run: 'loopsessie',
  strength: 'krachttraining',
}

const DAY = 86_400_000

/** "vandaag", "gisteren", "3 dagen geleden", daarna de datum. */
function relativeDay(iso: string) {
  const diff = Math.round((parseISODate(todayISO()).getTime() - parseISODate(iso).getTime()) / DAY)
  if (diff <= 0) return 'Vandaag'
  if (diff === 1) return 'Gisteren'
  if (diff < 7) return `${diff} dagen geleden`
  return formatShortDate(iso)
}

/** Korte tijd sinds een tijdstip: "nu", "12 min", "3u", "2d". */
function ago(ts: string) {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000)
  if (min < 1) return 'nu'
  if (min < 60) return `${min} min`
  if (min < 24 * 60) return `${Math.floor(min / 60)}u`
  return `${Math.floor(min / (24 * 60))}d`
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeieavond'
}

export function Hub() {
  const { session } = useAuth()
  const { profile, loading: profileLoading, save } = useProfile()
  const feed = useFeed()
  const name = profile?.display_name ?? session!.user.email!.split('@')[0]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <HubHeader name={name} />

      {/* Mobiel staat dit boven de feed; op desktop als zijkolom rechts. */}
      <aside className="space-y-4 lg:col-start-3 lg:row-start-2 lg:self-start">
        {!profileLoading && !profile && <JoinCta />}
        {profile && !profile.share_workouts && (
          <ShareCta
            profile={profile}
            onSave={async (fields) => {
              await save(fields)
              await feed.refresh()
            }}
          />
        )}
        <WeekPodium profile={profile} meId={session!.user.id} />
        <InboxCard />
      </aside>

      <section className="space-y-3 lg:col-span-2 lg:col-start-1 lg:row-start-2" aria-labelledby="feed-title">
        <div className="flex items-center justify-between px-1">
          <h2 id="feed-title" className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            Activiteit
          </h2>
          <button onClick={feed.refresh} disabled={feed.loading} className={`${ghostButton} disabled:opacity-50`}>
            Vernieuwen
          </button>
        </div>

        {feed.error && (
          <Card>
            <p className="text-sm text-red-400">Kon de feed niet laden: {feed.error}</p>
            <p className="mt-1 text-xs text-zinc-500">Is migratie 007_social.sql al uitgevoerd in Supabase?</p>
          </Card>
        )}
        {feed.loading && !feed.items.length && <p className="px-1 text-sm text-zinc-500">Laden…</p>}
        {!feed.loading && !feed.error && !feed.items.length && (
          <Card>
            <p className="text-center text-sm text-zinc-400">
              Nog geen gedeelde trainingen. Zodra spelers hun trainingen delen, verschijnen ze hier.
            </p>
          </Card>
        )}

        {feed.items.map((item) => (
          <FeedCard key={item.id} item={item} me={profile} onPatch={(fn) => feed.patch(item.id, fn)} />
        ))}

        {feed.hasMore && (
          <button onClick={feed.loadMore} disabled={feed.loading} className={`w-full ${ghostButton} py-2.5 disabled:opacity-50`}>
            {feed.loading ? 'Laden…' : 'Meer laden'}
          </button>
        )}
      </section>
    </div>
  )
}

function HubHeader({ name }: { name: string }) {
  const days = daysUntilRace()
  const phase = currentPhase()
  return (
    <Card className="relative overflow-hidden lg:col-span-3">
      <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand/20 blur-3xl" />
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
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
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
    </Card>
  )
}

function JoinCta() {
  return (
    <Card>
      <p className="font-semibold text-white">Doe mee met de groep</p>
      <p className="mt-1 text-sm text-zinc-400">Kies een naam om kudos te geven, te reageren en op het leaderboard te komen.</p>
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
      <Avatar name={item.display_name} small />
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

function Avatar({ name, small = false, highlight = false }: { name: string; small?: boolean; highlight?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-200 uppercase ${
        small ? 'size-8 text-xs' : 'size-10 text-sm'
      } ${highlight ? 'ring-2 ring-brand/60' : ''}`}
    >
      {name.trim().slice(0, 1) || '?'}
    </span>
  )
}

/** "Jij en Piet", "Jan, Piet en 3 anderen". */
function kudosText(kudos: FeedPerson[], meId?: string) {
  const names = [...kudos].sort((a, b) => Number(b.user_id === meId) - Number(a.user_id === meId)).map((k) => (k.user_id === meId ? 'jij' : k.display_name))
  const rest = names.length - 2
  const text = rest > 0 ? `${names[0]}, ${names[1]} en ${rest} ${rest === 1 ? 'ander' : 'anderen'}` : names.join(' en ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function FeedCard({ item, me, onPatch }: { item: FeedItem; me: Profile | null; onPatch: (fn: (i: FeedItem) => FeedItem) => void }) {
  const isOwn = item.user_id === me?.id
  const gave = Boolean(me && item.kudos.some((k) => k.user_id === me.id))
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [replying, setReplying] = useState(false)
  const pace = formatPace(item.sport, item.duration_min, item.distance_km)
  const comments = showAll ? item.comments : item.comments.slice(-2)

  const stats = [
    { label: 'Duur', value: formatSessionDuration(item.duration_min) },
    item.distance_km ? { label: 'Afstand', value: `${item.distance_km.toLocaleString('nl-BE')} km` } : null,
    pace ? { label: item.sport === 'bike' ? 'Snelheid' : 'Tempo', value: pace } : null,
  ].filter((s) => s !== null)

  async function toggleKudos() {
    if (!me || isOwn || busy) return
    const before = item.kudos
    setBusy(true)
    onPatch((i) => ({
      ...i,
      kudos: gave ? i.kudos.filter((k) => k.user_id !== me.id) : [...i.kudos, { user_id: me.id, display_name: me.display_name }],
    }))
    try {
      await (gave ? removeKudos(item.id, me.id) : giveKudos(item.id))
    } catch (e) {
      onPatch((i) => ({ ...i, kudos: before }))
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function removeComment(id: string) {
    if (!confirm('Reactie verwijderen?')) return
    try {
      await deleteComment(id)
      onPatch((i) => ({ ...i, comments: i.comments.filter((c) => c.id !== id) }))
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  const actionClass = (active: boolean) =>
    `inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition disabled:opacity-40 sm:flex-none sm:px-3 ${
      active ? 'text-brand' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
    }`

  return (
    <article className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4 backdrop-blur sm:p-5">
      <header className="flex items-center gap-3">
        <Avatar name={item.display_name} highlight={isOwn} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <Link to={`/leaderboard/${item.user_id}`} className="truncate font-semibold text-white hover:underline">
              {item.display_name}
            </Link>
            {isOwn && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-300 uppercase">jij</span>}
          </p>
          <p className="text-xs text-zinc-500">
            {relativeDay(item.date)} · {SPORT_LABEL[item.sport]}
          </p>
        </div>
      </header>

      <div className="mt-3 flex gap-3">
        <span className={`w-1 shrink-0 rounded-full ${SPORT_BG[item.sport]}`} />
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">{s.label}</dt>
              <dd className="text-xl font-black text-white tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {item.kudos.length > 0 && <p className="mt-3 text-xs text-zinc-400">👏 {kudosText(item.kudos, me?.id)}</p>}

      <div className="mt-3 flex gap-1 border-t border-white/5 pt-2">
        <button
          onClick={toggleKudos}
          disabled={!me || isOwn || busy}
          aria-pressed={gave}
          className={actionClass(gave)}
          title={isOwn ? 'Je kan geen kudos geven op je eigen training' : undefined}
        >
          👏 Kudos{item.kudos.length > 0 && <span className="tabular-nums">· {item.kudos.length}</span>}
        </button>
        <button onClick={() => setReplying((v) => !v)} disabled={!me} aria-expanded={replying} className={actionClass(replying)}>
          💬 Reageer{item.comments.length > 0 && <span className="tabular-nums">· {item.comments.length}</span>}
        </button>
      </div>

      {item.comments.length > 0 && (
        <div className="mt-2 space-y-2">
          {!showAll && item.comments.length > 2 && (
            <button onClick={() => setShowAll(true)} className="text-xs font-medium text-zinc-400 hover:text-white">
              Alle {item.comments.length} reacties tonen
            </button>
          )}
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Avatar name={c.display_name} small />
                <div className="min-w-0 flex-1 rounded-xl bg-zinc-800/60 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link to={`/leaderboard/${c.user_id}`} className="truncate text-xs font-semibold text-white hover:underline">
                      {c.display_name}
                    </Link>
                    <span className="shrink-0 text-[11px] text-zinc-500">{ago(c.created_at)}</span>
                  </div>
                  <p className="break-words whitespace-pre-line text-zinc-200">{c.body}</p>
                </div>
                {me && (c.user_id === me.id || isOwn) && (
                  <button onClick={() => removeComment(c.id)} className="shrink-0 p-2 text-zinc-600 hover:text-red-400" aria-label="Reactie verwijderen">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {replying && me && (
        <CommentForm
          onSubmit={async (body) => {
            const c = await addComment(item.id, body)
            onPatch((i) => ({ ...i, comments: [...i.comments, { ...c, display_name: me.display_name }] }))
            setShowAll(true)
          }}
        />
      )}
    </article>
  )
}

function CommentForm({ onSubmit }: { onSubmit: (body: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      await onSubmit(body)
      setText('')
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      {/* text-base op mobiel: iOS zoomt in bij invoervelden kleiner dan 16px. */}
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={280}
        enterKeyHint="send"
        placeholder="Schrijf een reactie…"
        aria-label="Reactie"
        className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-brand focus:outline-none sm:text-sm"
      />
      <button type="submit" disabled={busy || !text.trim()} className="shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
        Plaats
      </button>
    </form>
  )
}
