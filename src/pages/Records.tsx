import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon, type IconName } from '../components/Icon'
import { Delta, KpiStrip } from '../components/KpiStrip'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { Skeleton, SkeletonRows } from '../components/Skeleton'
import { Stat } from '../components/Stat'
import { addDays, formatPace, formatSessionDuration, formatShortDate, parseISODate, sumKm, todayISO, toISODate } from '../lib/race'
import {
  RECORD_SPORTS,
  higherIsFaster,
  paceSeries,
  paceTrend,
  recordHistory,
  useRecords,
  type BucketRecord,
  type Milestone,
  type MilestoneTrack,
  type PacePoint,
  type RecordEvent,
  type RecordSport,
  type SportRecords,
} from '../lib/records'
import { useProgress } from '../lib/progress'
import { SPORT_BG, SPORT_HEX, SPORT_LABEL, SPORT_NOUN, isTriSport, type Workout } from '../lib/types'
import { useWorkouts } from '../lib/useWorkouts'
import { eyebrowClass, pillClass, primaryButton } from '../lib/ui'

/** Korte datum, met jaartal als het niet dit jaar is. */
function formatDate(iso: string) {
  const d = parseISODate(iso)
  if (d.getFullYear() === new Date().getFullYear()) return formatShortDate(iso)
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatKm = (km: number) => `${km.toLocaleString('nl-BE', { maximumFractionDigits: 2 })} km`

export function Records() {
  const { workouts, loading, error } = useWorkouts()
  const { sports, milestones, reached } = useRecords(workouts)
  const history = useMemo(() => recordHistory(workouts), [workouts])

  return (
    <div>
      <PageHeader
        title="Records"
        description="Je snelste tijden per afstand, hoe je tempo evolueert, je langste sessies en de mijlpalen die je onderweg haalde."
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading && workouts.length === 0 ? (
        <RecordsSkeleton />
      ) : workouts.length === 0 ? (
        <Card>
          <EmptyState
            icon="trophy"
            title="Nog geen records"
            action={
              <Link to="/workouts" className={primaryButton}>
                <Icon name="plus" className="size-4" />
                Training loggen
              </Link>
            }
          >
            Log je eerste training met afstand, dan verschijnen hier je records en mijlpalen.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <RecordKpis workouts={workouts} sports={sports} tracks={milestones} reached={reached} history={history} />

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:items-start">
            <ProgressCard workouts={workouts} />
            <RecentPrs events={history} />
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sports.map((s) => (
              <SportCard key={s.sport} records={s} />
            ))}
          </div>

          <MilestonesCard tracks={milestones} reached={reached} />

          <p className="text-xs text-fg-3">
            Records zijn schattingen. Trainingen hebben geen tussentijden, dus we nemen het gemiddelde tempo van een hele sessie die
            minstens de afstand haalde (vanaf 99%) en rekenen dat om naar die afstand. Een loop van 12 km aan 5:00 /km telt zo als
            50:00 op de 10 km.
          </p>
        </div>
      )}
    </div>
  )
}

function RecordsSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" role="status" aria-label="Laden">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      </div>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <SkeletonRows rows={3} />
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Kerncijfers: records, mijlpalen, totale afstand en je reeks. */
function RecordKpis({
  workouts,
  sports,
  tracks,
  reached,
  history,
}: {
  workouts: Workout[]
  sports: SportRecords[]
  tracks: MilestoneTrack[]
  reached: Milestone[]
  history: RecordEvent[]
}) {
  const buckets = sports.flatMap((s) => s.buckets)
  const records = buckets.filter((b) => b.best).length
  const recent = history.filter((e) => e.date >= addDays(todayISO(), -30)).length
  const endurance = workouts.filter((w) => isTriSport(w.sport))
  const km = sumKm(endurance)
  const { streak } = useProgress()
  // De mijlpaal die het dichtst bij is.
  const next = tracks.filter((t) => t.next).sort((a, b) => b.progress - a.progress)[0]

  return (
    <KpiStrip
      items={[
        {
          label: 'Persoonlijke records',
          value: records,
          sub: recent ? <Delta value={recent}>{recent} nieuw in 30 dagen</Delta> : `van ${buckets.length} afstanden`,
        },
        { label: 'Mijlpalen', value: reached.length, sub: next?.next ? `volgende: ${next.next.label}` : 'Alles gehaald' },
        {
          label: 'Afstand sinds start',
          value: `${Math.round(km).toLocaleString('nl-BE')} km`,
          sub: 'zwemmen, fietsen en lopen',
        },
        {
          label: 'Streak',
          value: `${streak.days} ${streak.days === 1 ? 'dag' : 'dagen'}`,
          sub: `langste: ${streak.best} ${streak.best === 1 ? 'dag' : 'dagen'}`,
        },
      ]}
    />
  )
}

/** Tempo als leesbare waarde: "5:02" (min/km of min/100 m) of "28,4" (km/u). */
function formatPaceValue(sport: RecordSport, v: number) {
  if (sport === 'bike') return v.toFixed(1).replace('.', ',')
  const sec = Math.round(v * 60)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const PACE_UNIT: Record<RecordSport, string> = { run: 'min/km', swim: 'min/100m', bike: 'km/u' }
const SPORT_TABS = RECORD_SPORTS.map((s) => ({ key: s, label: SPORT_LABEL[s] }))
/** Venster van de grafiek, in dagen (±6 maanden). */
const RANGE_DAYS = 182

/** Tempo per sessie over de laatste 6 maanden, met tabs per sport. */
function ProgressCard({ workouts }: { workouts: Workout[] }) {
  const today = todayISO()
  const from = addDays(today, -RANGE_DAYS)
  const series = useMemo(
    () => Object.fromEntries(RECORD_SPORTS.map((s) => [s, paceSeries(workouts, s, from)])) as Record<RecordSport, PacePoint[]>,
    [workouts, from],
  )
  // Standaard de sport met de meeste sessies in het venster.
  const auto = [...RECORD_SPORTS].sort((a, b) => series[b].length - series[a].length)[0]
  const [tab, setTab] = useState<RecordSport | null>(null)
  const sport = tab ?? auto
  const points = series[sport]
  const trend = paceTrend(points, sport, today)
  const pct = trend === null ? null : Math.round(Math.abs(trend) * 100)

  return (
    <Card title="Ontwikkeling" description="Je tempo per sessie over de laatste 6 maanden." className="min-w-0 lg:col-span-2">
      <div className="-mt-1 mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={SPORT_TABS} value={sport} onChange={setTab} />
        {points.length >= 3 && (
          <p className="text-sm text-fg-3">
            {trend === null || pct === null ? (
              'Nog geen vergelijking met 3 maanden geleden'
            ) : pct === 0 ? (
              'Even snel als 3 maanden geleden'
            ) : (
              <Delta value={trend}>
                {pct}% {trend > 0 ? 'sneller' : 'trager'} dan 3 maanden geleden
              </Delta>
            )}
          </p>
        )}
      </div>

      {points.length < 3 ? (
        <EmptyState icon="chart" title="Te weinig data">
          Log minstens drie keer een {SPORT_NOUN[sport]} met afstand in de laatste 6 maanden, dan zie je hier hoe je tempo evolueert.
        </EmptyState>
      ) : (
        <PaceChart key={sport} sport={sport} points={points} from={from} today={today} />
      )}
    </Card>
  )
}

function PaceChart({ sport, points, from, today }: { sport: RecordSport; points: PacePoint[]; from: string; today: string }) {
  const [active, setActive] = useState(points.length - 1)
  const up = higherIsFaster(sport)
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.12 || max * 0.05 || 1
  const lo = min - pad
  const hi = max + pad

  const span = Date.parse(today) - Date.parse(from)
  const xPct = (iso: string) => ((Date.parse(iso) - Date.parse(from)) / span) * 100
  // Sneller staat altijd bovenaan: bij min/km draait de as om.
  const yPct = (v: number) => (up ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo)) * 100
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * (k + 0.5)) / 4)

  // Maandlabels: de eerste van elke maand binnen het venster.
  const months: string[] = []
  const d = parseISODate(from)
  for (let m = new Date(d.getFullYear(), d.getMonth() + 1, 1); toISODate(m) <= today; m = new Date(m.getFullYear(), m.getMonth() + 1, 1))
    months.push(toISODate(m))

  const best = up ? Math.max(...values) : Math.min(...values)
  const avg = values.reduce((a, v) => a + v, 0) / values.length
  const p = points[Math.min(active, points.length - 1)]

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs text-fg-3">
        <span>{PACE_UNIT[sport]}</span>
        <span>{up ? '↑ sneller' : '↑ sneller (as omgekeerd: minder tijd staat hoger)'}</span>
      </div>

      <div className="mt-3 grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2">
        {/* Y-as */}
        <div className="relative h-48">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-[11px] text-fg-4 tabular-nums" style={{ top: `${yPct(t)}%` }}>
              {formatPaceValue(sport, t)}
            </span>
          ))}
        </div>

        <div className="min-w-0">
          <div className="relative h-48">
            <svg className="absolute inset-0 size-full animate-fade-in overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {ticks.map((t) => (
                <line key={t} x1="0" x2="100" y1={yPct(t)} y2={yPct(t)} className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <polyline
                points={points.map((q) => `${xPct(q.date)},${yPct(q.value)}`).join(' ')}
                fill="none"
                stroke={SPORT_HEX[sport]}
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {points.map((q, i) => (
              <button
                key={q.workoutId}
                type="button"
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-label={`${formatDate(q.date)}: ${formatPaceValue(sport, q.value)} ${PACE_UNIT[sport]}`}
                className="group absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ left: `${xPct(q.date)}%`, top: `${yPct(q.value)}%` }}
              >
                <span
                  className={`animate-pop rounded-full transition-[width,height] ${SPORT_BG[sport]} ${
                    i === active ? 'size-3 ring-2 ring-surface' : 'size-2 group-hover:size-2.5'
                  }`}
                  style={{ animationDelay: `${Math.min(i * 12, 400)}ms` }}
                />
              </button>
            ))}
          </div>

          {/* X-as */}
          <div className="relative mt-2 h-4 overflow-hidden">
            {months
              .filter((m) => xPct(m) > 4 && xPct(m) < 96)
              .map((m) => (
                <span key={m} className="absolute -translate-x-1/2 text-[11px] text-fg-4" style={{ left: `${xPct(m)}%` }}>
                  {parseISODate(m).toLocaleDateString('nl-BE', { month: 'short' })}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Detail van het gekozen punt (tik of hover op een punt) */}
      <p className="mt-4 flex min-h-5 flex-wrap items-baseline gap-x-2 text-sm text-fg-3" aria-live="polite">
        <span className="font-medium text-fg">{formatDate(p.date)}</span>
        <span>
          {formatKm(p.km)} in {formatSessionDuration(p.minutes)}
        </span>
        <span className="text-fg tabular-nums">{formatPace(sport, p.minutes, p.km)}</span>
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-5">
        <div className="min-w-0">
          <dt className="truncate text-xs text-fg-3">Sessies</dt>
          <dd className="mt-1 text-lg font-medium tracking-tight text-fg tabular-nums">{points.length}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-xs text-fg-3">Snelste</dt>
          <dd className="mt-1 truncate text-lg font-medium tracking-tight text-fg tabular-nums">{formatPaceValue(sport, best)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-xs text-fg-3">Gemiddeld</dt>
          <dd className="mt-1 truncate text-lg font-medium tracking-tight text-fg tabular-nums">{formatPaceValue(sport, avg)}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Tijdlijn van de laatst gezette records, nieuwste eerst. */
function RecentPrs({ events }: { events: RecordEvent[] }) {
  const shown = events.slice(0, 8)
  const weekAgo = addDays(todayISO(), -7)
  return (
    <Card title="Recente PR's" description="De laatst gezette of verbeterde records." className="min-w-0">
      {shown.length ? (
        <ol className="ml-1 space-y-5 border-l border-line pl-5">
          {shown.map((e) => {
            const pace = formatPace(e.sport, e.minutes, e.km)
            return (
              <li key={`${e.sport}-${e.km}-${e.workoutId}`} className="relative animate-fade-up">
                <span className={`absolute top-1.5 -left-[24.5px] size-2 rounded-full ring-4 ring-surface ${SPORT_BG[e.sport]}`} aria-hidden />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
                    {e.date >= weekAgo && <span className="size-1.5 shrink-0 rounded-full bg-brand" title="Deze week" aria-hidden />}
                    <span className="truncate">
                      {e.label} <span className="font-normal text-fg-3">· {SPORT_LABEL[e.sport].toLowerCase()}</span>
                    </span>
                  </p>
                  <p className="shrink-0 text-sm font-medium tracking-tight text-fg tabular-nums">{formatSessionDuration(e.minutes)}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-3">
                  {formatDate(e.date)}
                  {pace ? ` · ${pace}` : ''}
                  {' · '}
                  {e.previous === null ? (
                    'eerste keer'
                  ) : (
                    <span className="text-success">{formatSessionDuration(e.previous - e.minutes)} sneller</span>
                  )}
                </p>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState icon="sparkles" title="Nog geen PR's">
          Haal een afstandsklasse (bv. 5 km lopen of 1 km zwemmen), dan verschijnt hier je eerste record.
        </EmptyState>
      )}
    </Card>
  )
}

function SportCard({ records }: { records: SportRecords }) {
  const { sport, buckets, longest, sessions } = records
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className={`size-1.5 shrink-0 rounded-full ${SPORT_BG[sport]}`} aria-hidden />
          {SPORT_LABEL[sport]}
        </span>
      }
      description={`${sessions} ${sessions === 1 ? 'sessie' : 'sessies'}`}
    >
      <ul className="-mt-3 divide-y divide-line">
        {buckets.map((b) => (
          <BucketRow key={b.km} sport={sport} bucket={b} />
        ))}
      </ul>

      <div className="mt-2 grid grid-cols-2 gap-4 border-t border-line pt-5">
        <Stat
          label="Langste afstand"
          value={longest.distance ? formatKm(longest.distance.km) : '—'}
          sub={longest.distance ? formatDate(longest.distance.date) : 'Nog geen afstand'}
        />
        <Stat
          label="Langste duur"
          value={longest.duration ? formatSessionDuration(longest.duration.minutes) : '—'}
          sub={longest.duration ? formatDate(longest.duration.date) : 'Nog geen sessie'}
        />
      </div>
    </Card>
  )
}

function BucketRow({ sport, bucket }: { sport: SportRecords['sport']; bucket: BucketRecord }) {
  const { best } = bucket
  if (!best)
    return (
      <li className="flex items-center justify-between gap-3 py-3">
        <p className="min-w-0 truncate text-sm text-fg-3">{bucket.label}</p>
        <p className="shrink-0 text-sm text-fg-4">Nog niet gehaald</p>
      </li>
    )

  const pace = formatPace(sport, best.minutes, bucket.km)
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">{bucket.label}</p>
        <p className="truncate text-xs text-fg-3">
          {pace ? `${pace} · ` : ''}
          {formatDate(best.date)}
        </p>
        {bucket.firstDate && bucket.firstDate !== best.date && (
          <p className="truncate text-xs text-fg-4">Eerst gehaald op {formatDate(bucket.firstDate)}</p>
        )}
      </div>
      <p className="shrink-0 text-lg font-medium tracking-tight text-fg tabular-nums">{formatSessionDuration(best.minutes)}</p>
    </li>
  )
}

const KIND_ICON: Record<Milestone['kind'], IconName> = { km: 'flag', hours: 'calendar', sessions: 'activity' }

function formatTotal(t: MilestoneTrack, n: number) {
  const value = Math.floor(n).toLocaleString('nl-BE')
  if (t.kind === 'km') return `${value} km`
  if (t.kind === 'hours') return `${value} uur`
  return value
}

function MilestonesCard({ tracks, reached }: { tracks: MilestoneTrack[]; reached: Milestone[] }) {
  const total = tracks.reduce((a, t) => a + t.milestones.length, 0)
  return (
    <Card
      title="Mijlpalen"
      description="Totalen sinds je eerste gelogde training."
      action={
        <span className={pillClass}>
          {reached.length} / {total}
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <section className="min-w-0">
          <h3 className={eyebrowClass}>Volgende</h3>
          <ul className="mt-3 space-y-5">
            {tracks.map((t) => (
              <li key={t.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-fg">{t.next ? t.next.label : t.title}</p>
                  <p className="shrink-0 text-xs text-fg-3 tabular-nums">
                    {t.next ? `${formatTotal(t, t.total)} / ${formatTotal(t, t.next.target)}` : 'Alles gehaald'}
                  </p>
                </div>
                <div className="mt-2">
                  <ProgressBar value={t.progress} max={1} color={t.sport ? SPORT_BG[t.sport] : 'bg-fg-3'} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <h3 className={eyebrowClass}>Gehaald</h3>
          {reached.length ? (
            <ul className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {reached.map((m) => (
                <li key={`${m.kind}-${m.sport}-${m.target}`} className="flex items-center gap-3">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-fg-3">
                    <Icon name={KIND_ICON[m.kind]} className="size-4" />
                    {m.sport && <span className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface ${SPORT_BG[m.sport]}`} aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{m.label}</p>
                    {m.date && <p className="text-xs text-fg-3">{formatDate(m.date)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-fg-3">Nog geen mijlpalen gehaald. De eerste komt eraan.</p>
          )}
        </section>
      </div>
    </Card>
  )
}
