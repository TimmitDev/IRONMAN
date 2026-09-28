import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../lib/profile'
import { formatPace, formatSessionDuration, formatShortDate, parseISODate, todayISO } from '../lib/race'
import { addComment, deleteComment, giveKudos, removeKudos, type FeedItem, type FeedPerson } from '../lib/social'
import { SPORT_BG, SPORT_LABEL } from '../lib/types'
import { errorMessage, iconButton, pillClass } from '../lib/ui'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

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
function kudosText(kudos: FeedPerson[], meId: string) {
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
  me: Profile
  online: boolean
  onPatch: (fn: (i: FeedItem) => FeedItem) => void
}) {
  const isOwn = item.user_id === me.id
  const gave = item.kudos.some((k) => k.user_id === me.id)
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
    if (isOwn || busy) return
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
    `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition disabled:opacity-40 sm:flex-none sm:px-3 ${
      active ? 'bg-brand/10 text-brand' : 'text-fg-3 hover:bg-hover hover:text-fg'
    }`

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="flex items-center gap-3">
        <Avatar name={item.display_name} highlight={isOwn} online={online} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2">
            <Link to={`/leaderboard/${item.user_id}`} className="truncate font-semibold text-fg hover:underline">
              {item.display_name}
            </Link>
            {isOwn && <span className={pillClass}>jij</span>}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-fg-3">
            <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[item.sport]}`} aria-hidden />
            {SPORT_LABEL[item.sport]} · {relativeDay(item.date)}
          </p>
        </div>
      </header>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-subtle p-3 sm:px-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-xs font-medium text-fg-3">{s.label}</dt>
            <dd className="mt-0.5 truncate text-lg font-semibold tracking-tight text-fg tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {item.kudos.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-3">
          <Icon name="heart" className="size-3.5 fill-current text-brand" />
          <span className="min-w-0 truncate">{kudosText(item.kudos, me.id)}</span>
        </p>
      )}

      <div className="mt-3 flex gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={toggleKudos}
          disabled={isOwn || busy}
          aria-pressed={gave}
          className={actionClass(gave)}
          title={isOwn ? 'Je kan geen kudos geven op je eigen training' : undefined}
        >
          <Icon name="heart" className={`size-4 ${gave ? 'fill-current' : ''}`} />
          Kudos{item.kudos.length > 0 && <span className="tabular-nums">· {item.kudos.length}</span>}
        </button>
        <button type="button" onClick={() => setReplying((v) => !v)} aria-expanded={replying} className={actionClass(replying)}>
          <Icon name="message" className="size-4" />
          Reageer{item.comments.length > 0 && <span className="tabular-nums">· {item.comments.length}</span>}
        </button>
      </div>

      {item.comments.length > 0 && (
        <div className="mt-2 space-y-2">
          {!showAll && item.comments.length > 2 && (
            <button type="button" onClick={() => setShowAll(true)} className="text-xs font-medium text-fg-3 hover:text-fg">
              Alle {item.comments.length} reacties tonen
            </button>
          )}
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Avatar name={c.display_name} size="sm" />
                <div className="min-w-0 flex-1 rounded-xl bg-subtle px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link to={`/leaderboard/${c.user_id}`} className="truncate text-xs font-semibold text-fg hover:underline">
                      {c.display_name}
                    </Link>
                    <span className="shrink-0 text-[11px] text-fg-4">{ago(c.created_at)}</span>
                  </div>
                  <p className="break-words whitespace-pre-line text-fg-2">{c.body}</p>
                </div>
                {(c.user_id === me.id || isOwn) && (
                  <button type="button" onClick={() => removeComment(c.id)} className={`${iconButton} hover:bg-danger/10 hover:text-danger`} aria-label="Reactie verwijderen">
                    <Icon name="trash" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {replying && (
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
        className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-base text-fg placeholder:text-fg-4 transition focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none sm:text-sm"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="inline-flex h-10 shrink-0 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        Plaats
      </button>
    </form>
  )
}
