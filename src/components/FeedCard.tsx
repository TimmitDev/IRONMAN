import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../lib/leaderboard'
import { formatPace, formatSessionDuration, formatShortDate, parseISODate, todayISO } from '../lib/race'
import { addComment, deleteComment, giveKudos, removeKudos, type FeedItem, type FeedPerson } from '../lib/social'
import { SPORT_BG, SPORT_LABEL } from '../lib/types'
import { errorMessage } from '../lib/ui'
import { Avatar } from './Avatar'

const DAY = 86_400_000

/** "Vandaag", "Gisteren", "3 dagen geleden", daarna de datum. */
function relativeDay(iso: string) {
  const diff = Math.round((parseISODate(todayISO()).getTime() - parseISODate(iso).getTime()) / DAY)
  if (diff <= 0) return 'Vandaag'
  if (diff === 1) return 'Gisteren'
  if (diff < 7) return `${diff} dagen geleden`
  return formatShortDate(iso)
}

/** Korte tijd sinds een tijdstip: "nu", "12 min", "3u", "2d". */
export function ago(ts: string) {
  const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000)
  if (min < 1) return 'nu'
  if (min < 60) return `${min} min`
  if (min < 24 * 60) return `${Math.floor(min / 60)}u`
  return `${Math.floor(min / (24 * 60))}d`
}

/** "Jij en Piet", "Jan, Piet en 3 anderen". */
function kudosText(kudos: FeedPerson[], meId?: string) {
  const names = [...kudos].sort((a, b) => Number(b.user_id === meId) - Number(a.user_id === meId)).map((k) => (k.user_id === meId ? 'jij' : k.display_name))
  const rest = names.length - 2
  const text = rest > 0 ? `${names[0]}, ${names[1]} en ${rest} ${rest === 1 ? 'ander' : 'anderen'}` : names.join(' en ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function FeedCard({
  item,
  me,
  online,
  onPatch,
}: {
  item: FeedItem
  me: Profile | null
  online: boolean
  onPatch: (fn: (i: FeedItem) => FeedItem) => void
}) {
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
        <Avatar name={item.display_name} highlight={isOwn} online={online} />
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
                <Avatar name={c.display_name} size="sm" />
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
