import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon, type IconName } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { Stat } from '../components/Stat'
import { formatPace, formatSessionDuration, formatShortDate, parseISODate } from '../lib/race'
import { useRecords, type BucketRecord, type Milestone, type MilestoneTrack, type SportRecords } from '../lib/records'
import { SPORT_BG, SPORT_LABEL, SPORT_SOFT, SPORT_TEXT } from '../lib/types'
import { useWorkouts } from '../lib/useWorkouts'
import { eyebrowClass, primaryButton } from '../lib/ui'

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

  return (
    <div>
      <PageHeader
        title="Records"
        description="Je snelste tijden per afstand, je langste sessies en de mijlpalen die je onderweg haalde."
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading && workouts.length === 0 ? (
        <p className="text-sm text-fg-3">Laden…</p>
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
        <div className="space-y-6">
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

function SportCard({ records }: { records: SportRecords }) {
  const { sport, buckets, longest, sessions } = records
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className={`size-2.5 shrink-0 rounded-full ${SPORT_BG[sport]}`} aria-hidden />
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat
          tile
          label="Langste afstand"
          value={longest.distance ? formatKm(longest.distance.km) : '—'}
          sub={longest.distance ? formatDate(longest.distance.date) : 'Nog geen afstand'}
        />
        <Stat
          tile
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
      <li className="flex items-center justify-between gap-3 py-3 opacity-60">
        <p className="min-w-0 truncate text-sm font-medium text-fg-2">{bucket.label}</p>
        <p className="shrink-0 text-sm text-fg-3">Nog niet gehaald</p>
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
      <p className="shrink-0 text-xl font-semibold tracking-tight text-fg tabular-nums">{formatSessionDuration(best.minutes)}</p>
    </li>
  )
}

const KIND_ICON: Record<Milestone['kind'], IconName> = { km: 'flag', hours: 'calendar', sessions: 'activity' }

function iconTint(m: { sport: Milestone['sport'] }) {
  return m.sport ? `${SPORT_SOFT[m.sport]} ${SPORT_TEXT[m.sport]}` : 'bg-brand/10 text-brand'
}

function formatTotal(t: MilestoneTrack, n: number) {
  const value = Math.floor(n).toLocaleString('nl-BE')
  if (t.kind === 'km') return `${value} km`
  if (t.kind === 'hours') return `${value} uur`
  return value
}

function MilestonesCard({ tracks, reached }: { tracks: MilestoneTrack[]; reached: Milestone[] }) {
  return (
    <Card title="Mijlpalen" description="Totalen sinds je eerste gelogde training.">
      <div className="space-y-6">
        <section>
          <h3 className={eyebrowClass}>Gehaald</h3>
          {reached.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {reached.map((m) => (
                <li key={`${m.kind}-${m.sport}-${m.target}`} className="flex items-center gap-3 rounded-xl bg-subtle p-3">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconTint(m)}`}>
                    <Icon name={KIND_ICON[m.kind]} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{m.label}</p>
                    {m.date && <p className="text-xs text-fg-3">{formatDate(m.date)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-fg-3">Nog geen mijlpalen gehaald. De eerste komt eraan.</p>
          )}
        </section>

        <section>
          <h3 className={eyebrowClass}>Volgende</h3>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <li key={t.key} className="min-w-0 rounded-xl border border-line p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-fg">{t.next ? t.next.label : t.title}</p>
                  <p className="shrink-0 text-xs text-fg-3 tabular-nums">
                    {t.next ? `${formatTotal(t, t.total)} / ${formatTotal(t, t.next.target)}` : 'Alles gehaald'}
                  </p>
                </div>
                <div className="mt-2">
                  <ProgressBar value={t.progress} max={1} color={t.sport ? SPORT_BG[t.sport] : 'bg-brand'} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Card>
  )
}
