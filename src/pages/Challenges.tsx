import { useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import {
  QUICK_PERIODS,
  challengeColor,
  challengeSportLabel,
  challengeStatus,
  daysBetween,
  formatAmount,
  formatPeriod,
  formatProgress,
  goalLabel,
  isDone,
  myEntry,
  progressFraction,
  quickPeriod,
  timingLabel,
  useChallenges,
  validateChallenge,
  type Challenge,
  type ChallengeMetric,
  type ChallengeStatus,
  type NewChallenge,
} from '../lib/challenges'
import { todayISO } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import {
  dangerOutlineButton,
  errorMessage,
  ghostButton,
  hintClass,
  inputClass,
  labelClass,
  pillClass,
  primaryButton,
  secondaryButton,
} from '../lib/ui'

const TABS: { key: ChallengeStatus; label: string }[] = [
  { key: 'active', label: 'Lopend' },
  { key: 'upcoming', label: 'Komend' },
  { key: 'ended', label: 'Afgelopen' },
]

const EMPTY: Record<ChallengeStatus, { title: string; text: string }> = {
  active: { title: 'Geen lopende uitdagingen', text: 'Start er zelf een, bv. "100 km lopen deze maand", en daag de groep uit.' },
  upcoming: { title: 'Niets gepland', text: 'Uitdagingen die later starten, verschijnen hier. Je kan er nu al aan meedoen.' },
  ended: { title: 'Nog niets afgelopen', text: 'Uitdagingen blijven hier tot 60 dagen na het einde staan.' },
}

// Lopend: eerst wat het snelst afloopt. Komend: eerst wat het snelst start. Afgelopen: meest recent eerst.
const SORT: Record<ChallengeStatus, (a: Challenge, b: Challenge) => number> = {
  active: (a, b) => a.ends_on.localeCompare(b.ends_on),
  upcoming: (a, b) => a.starts_on.localeCompare(b.starts_on),
  ended: (a, b) => b.ends_on.localeCompare(a.ends_on),
}

/** Zoveel deelnemers tonen voor "Toon alle". */
const SHOWN = 5

export function Challenges() {
  const { challenges, loading, error, create, remove, join, leave, meId } = useChallenges()
  const [tab, setTab] = useState<ChallengeStatus>('active')
  const [creating, setCreating] = useState(false)
  const today = todayISO()

  const counts = { active: 0, upcoming: 0, ended: 0 }
  for (const c of challenges) counts[challengeStatus(c, today)]++
  const shown = challenges.filter((c) => challengeStatus(c, today) === tab).sort(SORT[tab])
  const empty = EMPTY[tab]

  return (
    <div>
      <PageHeader
        title="Uitdagingen"
        description="Daag de groep uit: een afstand, tijd of aantal sessies binnen een periode. Je voortgang telt vanzelf mee uit je gelogde trainingen."
        actions={
          <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Nieuwe uitdaging
          </button>
        }
      />

      <div className="space-y-6">
        <Segmented options={TABS.map((t) => ({ key: t.key, label: counts[t.key] ? `${t.label} · ${counts[t.key]}` : t.label }))} value={tab} onChange={setTab} />

        {error && <p className="text-sm text-danger">{error}</p>}

        {loading && !challenges.length ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : shown.length ? (
          <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
            {shown.map((c) => (
              <ChallengeCard key={c.id} challenge={c} meId={meId} today={today} onJoin={join} onLeave={leave} onRemove={remove} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={tab === 'ended' ? 'trophy' : 'flag'}
              title={empty.title}
              action={
                tab !== 'ended' && (
                  <button type="button" onClick={() => setCreating(true)} className={secondaryButton}>
                    <Icon name="plus" className="size-4" />
                    Nieuwe uitdaging
                  </button>
                )
              }
            >
              {empty.text}
            </EmptyState>
          </Card>
        )}
      </div>

      {creating && (
        <CreateChallengeDialog
          onClose={() => setCreating(false)}
          onCreate={async (input) => {
            await create(input)
            setTab(challengeStatus(input, todayISO()))
          }}
        />
      )}
    </div>
  )
}

function ChallengeCard({
  challenge: c,
  meId,
  today,
  onJoin,
  onLeave,
  onRemove,
}: {
  challenge: Challenge
  meId: string
  today: string
  onJoin: (id: string) => Promise<void>
  onLeave: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const status = challengeStatus(c, today)
  const mine = myEntry(c, meId)
  const isOwner = c.created_by === meId
  const color = challengeColor(c)
  const done = mine ? isDone(c, mine.value) : false
  const doneCount = c.participants.filter((p) => isDone(c, p.value)).length
  const people = showAll ? c.participants : c.participants.slice(0, SHOWN)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
    }
    setBusy(false)
  }

  return (
    <Card className="min-w-0">
      <div className="space-y-4">
        {/* Kop: sport, periode en resterende tijd. */}
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-fg-2">
              {c.sport ? <span className={`size-2 rounded-full ${SPORT_BG[c.sport]}`} /> : <Icon name="activity" className="size-3.5" />}
              {challengeSportLabel(c)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="size-3.5" />
              {formatPeriod(c)}
            </span>
            <span className={status === 'active' ? 'font-semibold text-brand' : ''}>{timingLabel(c, today)}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight break-words text-fg">{c.title}</h2>
          <p className="mt-0.5 text-sm text-fg-3">
            Doel: <span className="font-medium text-fg-2">{goalLabel(c)}</span> · door {isOwner ? 'jou' : c.creator_name}
          </p>
          {c.description && <p className="mt-2 text-sm break-words whitespace-pre-line text-fg-2">{c.description}</p>}
        </div>

        {/* Eigen voortgang, of meedoen. */}
        {mine ? (
          <div className={`rounded-xl p-4 ${done ? 'bg-success/10' : 'bg-subtle'}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold text-fg tabular-nums">{formatProgress(c, mine.value)}</p>
              {done ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-white">
                  <Icon name="check" className="size-3.5" />
                  Gehaald!
                </span>
              ) : (
                <span className="shrink-0 text-sm font-semibold text-fg-2 tabular-nums">{Math.round(progressFraction(c, mine.value) * 100)}%</span>
              )}
            </div>
            <ProgressBar value={mine.value} max={c.target} color={done ? 'bg-success' : color} />
            {!done && status !== 'ended' && (
              <p className="mt-2 text-xs text-fg-3">
                {status === 'upcoming' ? 'Trainingen tellen mee vanaf de startdatum.' : `Nog ${formatAmount(c.metric, c.target - mine.value)} te gaan.`}
              </p>
            )}
          </div>
        ) : status !== 'ended' ? (
          <div className="flex flex-col gap-3 rounded-xl bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-2">Je doet nog niet mee. Je trainingen in deze periode tellen meteen mee.</p>
            <button type="button" onClick={() => run(() => onJoin(c.id))} disabled={busy} className={`${primaryButton} shrink-0`}>
              <Icon name="plus" className="size-4" />
              Doe mee
            </button>
          </div>
        ) : null}

        {/* Ranglijst. */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-fg-3 uppercase">
              {c.participants.length} {c.participants.length === 1 ? 'deelnemer' : 'deelnemers'}
            </p>
            {doneCount > 0 && <p className="text-xs text-fg-3">{doneCount} gehaald</p>}
          </div>
          {c.participants.length ? (
            <ol className="divide-y divide-line">
              {people.map((p, i) => {
                const isMe = p.user_id === meId
                const pDone = isDone(c, p.value)
                return (
                  <li key={p.user_id} className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 ${isMe ? 'bg-brand/5' : ''}`}>
                    <span className="w-5 shrink-0 text-center text-sm font-semibold text-fg-3 tabular-nums">{i + 1}</span>
                    <Avatar name={p.display_name} size="sm" highlight={isMe} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
                          <span className="truncate">{p.display_name}</span>
                          {isMe && <span className={pillClass}>jij</span>}
                        </p>
                        <p className="flex shrink-0 items-center gap-1 text-sm font-semibold text-fg tabular-nums">
                          {pDone && <Icon name="check" className="size-4 text-success" />}
                          {formatAmount(c.metric, p.value)}
                        </p>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={p.value} max={c.target} color={pDone ? 'bg-success' : color} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="py-2 text-sm text-fg-3">Nog niemand doet mee.</p>
          )}
          {c.participants.length > SHOWN && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className={`${ghostButton} mt-1 -ml-3`}>
              <Icon name="chevron-down" className={`size-4 transition ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Minder tonen' : `Toon alle ${c.participants.length}`}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {((mine && status !== 'ended') || isOwner) && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {mine && status !== 'ended' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm(`Stoppen met "${c.title}"?`) && run(() => onLeave(c.id))}
                className={ghostButton}
              >
                <Icon name="logout" className="size-4" />
                Stoppen
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm(`Uitdaging "${c.title}" verwijderen? Dit kan niet ongedaan worden en geldt voor alle deelnemers.`) && run(() => onRemove(c.id))}
                className={dangerOutlineButton}
              >
                <Icon name="trash" className="size-4" />
                Verwijderen
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ---------- Aanmaken ----------

type SportChoice = Sport | 'all'

const METRICS: { key: ChallengeMetric; label: string; unit: string; placeholder: string }[] = [
  { key: 'distance', label: 'Afstand', unit: 'km', placeholder: '100' },
  { key: 'duration', label: 'Tijd', unit: 'uur', placeholder: '10' },
  { key: 'sessions', label: 'Sessies', unit: 'sessies', placeholder: '12' },
]

/** Segmentknoppen in de stijl van SportPicker, met optioneel kleurbolletje en uitgeschakelde keuzes. */
function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string
  options: { key: T; label: string; dot?: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  className: string
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className={`grid gap-1 rounded-xl bg-muted p-1 ${className}`}>
        {options.map((o) => {
          const active = value === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              disabled={o.disabled}
              aria-pressed={active}
              className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'bg-surface text-fg shadow-sm' : 'text-fg-3 hover:text-fg'
              }`}
            >
              {o.dot && <span className={`size-2 shrink-0 rounded-full ${o.dot}`} />}
              <span className="truncate">{o.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function CreateChallengeDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (input: NewChallenge) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState<SportChoice>('all')
  const [metric, setMetric] = useState<ChallengeMetric>('distance')
  const [target, setTarget] = useState('')
  const [[startsOn, endsOn], setPeriod] = useState(() => quickPeriod('month'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unit = METRICS.find((m) => m.key === metric)!

  function pickSport(s: SportChoice) {
    setSport(s)
    // Krachttraining heeft geen afstand.
    if (s === 'strength' && metric === 'distance') setMetric('duration')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amount = Number(target.replace(',', '.').trim())
    const input: NewChallenge = {
      title: title.trim(),
      description: description.trim() || null,
      sport: sport === 'all' ? null : sport,
      metric,
      // Tijd vul je in uren in, maar wordt in minuten bewaard.
      target: target.trim() ? (metric === 'duration' ? Math.round(amount * 60) : amount) : NaN,
      starts_on: startsOn,
      ends_on: endsOn,
    }
    const problem = validateChallenge(input)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await onCreate(input)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const days = startsOn && endsOn && endsOn >= startsOn ? daysBetween(startsOn, endsOn) + 1 : null

  return (
    <Modal title="Nieuwe uitdaging" description="Kies een doel en een periode. Jij doet automatisch mee; anderen kunnen aansluiten." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="ch-title" className={labelClass}>
            Titel
          </label>
          <input
            id="ch-title"
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Bv. 100 km lopen in oktober"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="ch-description" className={labelClass}>
            Beschrijving <span className="font-normal text-fg-4">(optioneel)</span>
          </label>
          <textarea
            id="ch-description"
            className={`${inputClass} h-auto min-h-20 py-2.5`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="Waarom, spelregels of een aanmoediging…"
          />
          <p className={`${hintClass} text-right tabular-nums`}>{description.length}/280</p>
        </div>

        <Choice
          legend="Sport"
          className="grid-cols-3 sm:grid-cols-5"
          value={sport}
          onChange={pickSport}
          options={[{ key: 'all' as SportChoice, label: 'Alle' }, ...SPORTS.map((s) => ({ key: s as SportChoice, label: SPORT_LABEL[s], dot: SPORT_BG[s] }))]}
        />

        <Choice
          legend="Soort doel"
          className="grid-cols-3"
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ key: m.key, label: m.key === 'duration' ? 'Tijd (uren)' : m.key === 'distance' ? 'Afstand (km)' : m.label, disabled: m.key === 'distance' && sport === 'strength' }))}
        />

        <div>
          <label htmlFor="ch-target" className={labelClass}>
            Doel
          </label>
          <div className="relative">
            <input
              id="ch-target"
              className={`${inputClass} pr-20`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode={metric === 'sessions' ? 'numeric' : 'decimal'}
              placeholder={unit.placeholder}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-fg-3">{unit.unit}</span>
          </div>
          {metric === 'duration' && <p className={hintClass}>In uren, bv. 7,5 voor 7u30.</p>}
        </div>

        <fieldset>
          <legend className={labelClass}>Periode</legend>
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PERIODS.map((q) => {
              const [s, e] = quickPeriod(q.key)
              const active = s === startsOn && e === endsOn
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => setPeriod([s, e])}
                  aria-pressed={active}
                  className={`h-9 rounded-xl border px-3 text-sm font-medium transition ${
                    active ? 'border-brand bg-brand/5 text-brand' : 'border-line-strong text-fg-2 hover:bg-hover'
                  }`}
                >
                  {q.label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="ch-start" className="mb-1 block text-xs text-fg-3">
                Start
              </label>
              <input id="ch-start" type="date" className={inputClass} value={startsOn} onChange={(e) => setPeriod([e.target.value, endsOn])} />
            </div>
            <div className="min-w-0">
              <label htmlFor="ch-end" className="mb-1 block text-xs text-fg-3">
                Einde
              </label>
              <input id="ch-end" type="date" className={inputClass} value={endsOn} min={startsOn} onChange={(e) => setPeriod([startsOn, e.target.value])} />
            </div>
          </div>
          {days && <p className={hintClass}>{days === 1 ? '1 dag' : `${days} dagen`}, start- en einddag inbegrepen.</p>}
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className={primaryButton}>
            <Icon name="flag" className="size-4" />
            {busy ? 'Bezig…' : 'Uitdaging starten'}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Annuleren
          </button>
        </div>
      </form>
    </Modal>
  )
}
