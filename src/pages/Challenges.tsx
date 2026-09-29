import { useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { KpiStrip } from '../components/KpiStrip'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import {
  QUICK_PERIODS,
  challengeColor,
  challengeSportLabel,
  challengeStatus,
  daysBetween,
  daysLeft,
  elapsedDays,
  forecast,
  formatAmount,
  formatPeriod,
  formatProgress,
  goalLabel,
  isDone,
  myEntry,
  myRank,
  neededLabel,
  periodDays,
  progressFraction,
  quickPeriod,
  timeFraction,
  timingLabel,
  useChallenges,
  validateChallenge,
  type Challenge,
  type ChallengeMetric,
  type ChallengeStatus,
  type NewChallenge,
} from '../lib/challenges'
import { ask } from '../lib/feedback'
import { formatShortDate, todayISO } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import {
  dangerOutlineButton,
  errorMessage,
  eyebrowClass,
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
        {loading && !challenges.length ? <Skeleton className="h-[98px] w-full rounded-xl sm:h-[106px]" /> : <ChallengeKpis challenges={challenges} meId={meId} today={today} />}

        <Segmented options={TABS.map((t) => ({ key: t.key, label: counts[t.key] ? `${t.label} · ${counts[t.key]}` : t.label }))} value={tab} onChange={setTab} />

        {error && <p className="text-sm text-danger">{error}</p>}

        {loading && !challenges.length ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2" role="status" aria-label="Laden">
            {[0, 1].map((i) => (
              <Card key={i}>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                  <Skeleton className="h-20 w-full" />
                  <div className="space-y-3">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <Skeleton className="h-3 flex-1" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
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

/** Kerncijfers over de uitdagingen waar je aan meedoet. */
function ChallengeKpis({ challenges, meId, today }: { challenges: Challenge[]; meId: string; today: string }) {
  const joined = challenges.filter((c) => myEntry(c, meId))
  const active = joined.filter((c) => challengeStatus(c, today) === 'active')
  const activeTotal = challenges.filter((c) => challengeStatus(c, today) === 'active').length
  const achieved = joined.filter((c) => isDone(c, myEntry(c, meId)!.value)).length
  // Beste plaats in een lopende uitdaging; bij gelijke plaats die met de meeste deelnemers.
  const best = active
    .map((c) => ({ c, r: myRank(c, meId)! }))
    .sort((a, b) => a.r.rank - b.r.rank || b.r.of - a.r.of)[0]
  // Bijna voorbij: nog hoogstens 3 dagen en nog niet gehaald.
  const closing = active.filter((c) => daysLeft(c, today) <= 3 && !isDone(c, myEntry(c, meId)!.value)).sort((a, b) => a.ends_on.localeCompare(b.ends_on))

  return (
    <KpiStrip
      items={[
        {
          label: 'Lopend, je doet mee',
          value: active.length,
          sub: activeTotal ? `van ${activeTotal} lopende` : 'Niets lopend',
        },
        {
          label: 'Gehaald',
          value: achieved,
          sub: joined.length ? `van ${joined.length} waar je aan meedeed` : 'Doe mee om te starten',
        },
        {
          label: 'Beste positie',
          value: best ? `${best.r.rank}e` : '–',
          sub: best ? `van ${best.r.of} in ${best.c.title}` : 'Geen lopende deelname',
        },
        {
          label: 'Loopt bijna af',
          value: closing.length,
          sub: closing.length ? `${closing[0].title} · ${timingLabel(closing[0], today).toLowerCase()}` : 'Niets binnen 3 dagen',
        },
      ]}
    />
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
  // Zonder sport een neutrale balk: rood blijft voor kleine accenten.
  const color = c.sport ? challengeColor(c) : 'bg-fg-3'
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
      <div className="space-y-5">
        {/* Kop: sport, periode en resterende tijd. */}
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
            <span className="inline-flex items-center gap-1.5 text-fg-2">
              {c.sport ? <span className={`size-1.5 rounded-full ${SPORT_BG[c.sport]}`} /> : <Icon name="activity" className="size-3.5 text-fg-4" />}
              {challengeSportLabel(c)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" className="size-3.5 text-fg-4" />
              {formatPeriod(c)}
            </span>
            <span className={status === 'active' ? 'inline-flex items-center gap-1.5 font-medium text-fg-2' : ''}>
              {status === 'active' && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
              {timingLabel(c, today)}
            </span>
          </div>
          <h2 className="mt-2 text-base font-medium tracking-tight break-words text-fg">{c.title}</h2>
          <p className="mt-0.5 text-sm text-fg-3">
            Doel: <span className="font-medium text-fg-2">{goalLabel(c)}</span> · door {isOwner ? 'jou' : c.creator_name}
          </p>
          {c.description && <p className="mt-2 text-sm break-words whitespace-pre-line text-fg-2">{c.description}</p>}
        </div>

        {/* Eigen voortgang, of meedoen. */}
        {mine ? (
          <div className="rounded-lg bg-subtle p-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-sm font-medium text-fg tabular-nums">{formatProgress(c, mine.value)}</p>
              {done ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-fg-2">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  Gehaald
                </span>
              ) : (
                <span className="shrink-0 text-sm font-medium text-fg-2 tabular-nums">{Math.round(progressFraction(c, mine.value) * 100)}%</span>
              )}
            </div>
            <div className="relative">
              <ProgressBar value={mine.value} max={c.target} color={done ? 'bg-success' : color} />
              {/* Streepje: waar je bij een gelijkmatig tempo nu zou staan. */}
              {status === 'active' && !done && (
                <span
                  className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
                  style={{ left: `${timeFraction(c, today) * 100}%` }}
                  title="Hier zou je nu moeten staan"
                  aria-hidden
                />
              )}
            </div>
            <MyStanding challenge={c} value={mine.value} meId={meId} today={today} status={status} done={done} />
          </div>
        ) : status !== 'ended' ? (
          <div className="flex flex-col gap-3 rounded-lg bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className={eyebrowClass}>
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
                  <li key={p.user_id} className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 ${isMe ? 'bg-subtle' : ''}`}>
                    <span className="relative w-5 shrink-0 text-center text-sm text-fg-3 tabular-nums">
                      {i + 1}
                      {i === 0 && p.value > 0 && <span className="absolute top-0 -right-0.5 size-1.5 rounded-full bg-brand" aria-hidden />}
                    </span>
                    <Avatar name={p.display_name} size="sm" highlight={isMe} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
                          <span className="truncate">{p.display_name}</span>
                          {isMe && <span className={pillClass}>jij</span>}
                        </p>
                        <p className="flex shrink-0 items-center gap-1 text-sm font-medium text-fg tabular-nums">
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
                onClick={async () => {
                  if (await ask({ title: `Stoppen met "${c.title}"?`, body: 'Je verdwijnt uit de ranglijst. Later opnieuw meedoen kan zolang de uitdaging loopt.', confirm: 'Stoppen' }))
                    run(() => onLeave(c.id))
                }}
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
                onClick={async () => {
                  if (
                    await ask({
                      title: `Uitdaging "${c.title}" verwijderen?`,
                      body: 'Dit kan niet ongedaan gemaakt worden en geldt voor alle deelnemers.',
                      confirm: 'Verwijderen',
                      danger: true,
                    })
                  )
                    run(() => onRemove(c.id))
                }}
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

/** Prognose en plaats onder je eigen voortgangsbalk. */
function MyStanding({
  challenge: c,
  value,
  meId,
  today,
  status,
  done,
}: {
  challenge: Challenge
  value: number
  meId: string
  today: string
  status: ChallengeStatus
  done: boolean
}) {
  const rank = myRank(c, meId)
  const place = rank && rank.of > 1 ? `${rank.rank}e van ${rank.of}` : null

  if (status === 'upcoming') return <p className="mt-2 text-xs text-fg-3">Trainingen tellen mee vanaf de startdatum.</p>

  if (status === 'ended' || done) {
    return (
      <p className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-fg-3">
        <span>{done ? (status === 'ended' ? 'Doel gehaald.' : 'Doel gehaald, alles extra telt voor de ranglijst.') : `${formatAmount(c.metric, c.target - value)} tekort.`}</span>
        {place && <span className="tabular-nums">{status === 'ended' ? `Eindigde ${place}` : `Plaats ${place}`}</span>}
      </p>
    )
  }

  const f = forecast(c, value, today)
  const gap = Math.abs(value - f.expected)
  // Kleine verschillen niet opblazen: binnen 2% van het doel ben je "op schema".
  const even = gap < c.target * 0.02
  return (
    <div className="mt-3 space-y-1 text-xs">
      <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-fg-3">
        <span className="tabular-nums">
          Dag {elapsedDays(c, today)} van {periodDays(c)} ·{' '}
          <span className={even ? 'text-fg-2' : f.onTrack ? 'text-success' : 'text-fg-2'}>
            {even ? 'op schema' : `${formatAmount(c.metric, c.metric === 'sessions' ? Math.round(gap) || 1 : gap)} ${f.onTrack ? 'voor' : 'achter'} op schema`}
          </span>
        </span>
        {place && <span className="tabular-nums">Plaats {place}</span>}
      </p>
      <p className="text-fg-2">
        {f.finishOn === today
          ? 'Aan dit tempo haal je het vandaag nog.'
          : f.finishOn
            ? `Aan dit tempo haal je het op ${formatShortDate(f.finishOn)}.`
            : `${neededLabel(c, f)}.`}
      </p>
    </div>
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
      <div className={`grid gap-0.5 rounded-lg bg-subtle p-0.5 ${className}`}>
        {options.map((o) => {
          const active = value === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              disabled={o.disabled}
              aria-pressed={active}
              className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                active ? 'bg-surface font-medium text-fg ring-1 ring-line' : 'text-fg-3 hover:text-fg'
              }`}
            >
              {o.dot && <span className={`size-1.5 shrink-0 rounded-full ${o.dot}`} />}
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
                  className={`h-9 rounded-lg border px-3 text-sm transition ${
                    active ? 'border-fg-3 bg-subtle font-medium text-fg' : 'border-line-strong text-fg-2 hover:bg-hover'
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
