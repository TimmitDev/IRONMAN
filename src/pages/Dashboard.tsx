import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActiveChallengesCard } from '../components/ActiveChallengesCard'
import { BadgesCard } from '../components/Badges'
import { Delta, KpiStrip } from '../components/KpiStrip'
import { WeekStrip } from '../components/WeekStrip'
import { toast } from '../lib/feedback'
import { signed, weekStreak, weekSummary } from '../lib/stats'
import { Card } from '../components/Card'
import { CompleteDialog } from '../components/CompleteDialog'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { WeekReport } from '../components/WeekReport'
import { useBadges } from '../lib/badges'
import { DoneToggle } from '../components/DoneToggle'
import { PhaseTimeline } from '../components/PhaseTimeline'
import { ProgressBar } from '../components/ProgressBar'
import { WeeklyChart } from '../components/WeeklyChart'
import { WorkoutList } from '../components/WorkoutList'
import { RACE_TYPES, addDays, currentPhase, daysUntilRace, formatDuration, formatSessionDuration, racePassed, sumKm, sumMinutes, todayISO, weekStart } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { SPORTS, SPORT_BG, SPORT_LABEL, type PlannedWorkout, type Sport, type Workout } from '../lib/types'
import { errorMessage, eyebrowClass, linkClass, primaryButton, secondaryButton } from '../lib/ui'
import { useGoals } from '../lib/useGoals'
import { usePlan } from '../lib/usePlan'
import { useWorkouts } from '../lib/useWorkouts'

/** Tekstlink met pijltje, voor "Alles bekijken" in kaartkoppen. */
function MoreLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className={`${linkClass} inline-flex items-center gap-1`}>
      {children}
      <Icon name="arrow-right" className="size-4" />
    </Link>
  )
}

export function Dashboard() {
  const { workouts, loading, error, refresh } = useWorkouts()
  const thisWeek = weekStart(new Date())
  const plan = usePlan(thisWeek)
  const { goals, totalMinutes: goalMinutes } = useGoals()
  const badges = useBadges(workouts, goals)
  // Het weekrapport verschijnt op zondag; andere dagen kan je dat van vorige week openen.
  const isSunday = new Date().getDay() === 0
  const [showPrevReport, setShowPrevReport] = useState(false)

  const [completing, setCompleting] = useState<PlannedWorkout | null>(null)

  // Afvinken opent het venster met echte waarden; uitvinken gaat meteen.
  const toggle = (p: PlannedWorkout) =>
    p.workout_id
      ? plan
          .uncomplete(p)
          .then(refresh)
          .catch((e) => toast.error(errorMessage(e)))
      : setCompleting(p)

  const reportProps = { workouts, goals, goalMinutes, badges }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Jouw voortgang richting de race: wat er vandaag op het schema staat, hoe je week loopt en hoe ver je al staat."
        actions={
          // Doelen en Records staan op mobiel niet in de tabbalk; hier zijn ze altijd bereikbaar.
          <>
            <Link to="/records" className={secondaryButton}>
              <Icon name="sparkles" className="size-4" />
              Records
            </Link>
            <Link to="/goals" className={secondaryButton}>
              <Icon name="target" className="size-4" />
              Doelen
            </Link>
          </>
        }
      />

      <div className="space-y-6 sm:space-y-8">
        {!loading && isSunday && <WeekReport start={thisWeek} {...reportProps} />}
        {!loading && !isSunday && showPrevReport && (
          <WeekReport start={addDays(thisWeek, -7)} {...reportProps} onClose={() => setShowPrevReport(false)} />
        )}

        {(error || plan.error) && (
          <Card>
            <p className="text-sm text-danger">Kon data niet laden: {error ?? plan.error}</p>
          </Card>
        )}

        {/* Race-countdown + vandaag */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <Hero />
          <TodayCard
            planned={plan.planned.filter((p) => p.date === todayISO())}
            onToggle={toggle}
            onShowReport={isSunday || showPrevReport ? undefined : () => setShowPrevReport(true)}
          />
        </div>

        <WeekKpis workouts={workouts} goalMinutes={goalMinutes} />

        {/* De week per dag, en per sport tegenover je doel */}
        <section aria-labelledby="week-heading" className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="week-heading" className="text-sm font-medium text-fg">
              Deze week
            </h2>
            <span className="text-xs text-fg-3">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-fg-3 align-middle" aria-hidden /> gedaan
              <span className="mr-1 ml-3 inline-block size-1.5 rounded-full border border-fg-3 align-middle" aria-hidden /> gepland
            </span>
          </div>
          <WeekStrip start={thisWeek} done={plan.done} planned={plan.planned} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
            {SPORTS.map((s) => {
              const done = plan.done.filter((w) => w.sport === s)
              const open = plan.planned.filter((p) => p.sport === s && !p.workout_id)
              return (
                <GoalTile
                  key={s}
                  sport={s}
                  doneMin={sumMinutes(done)}
                  doneKm={sumKm(done)}
                  plannedMin={sumMinutes(open)}
                  goalMin={goals[s]?.minutes ?? 0}
                  goalKm={goals[s]?.distance_km ?? null}
                />
              )
            })}
          </div>
        </section>

        {/* Grafiek + zijkolom */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <Card title="Volume per week" description="Trainingsuren van de laatste 12 weken, per sport." className="min-w-0 lg:col-span-2">
            {loading ? <div className="h-60 animate-pulse rounded-lg bg-subtle" /> : <WeeklyChart workouts={workouts} goalMinutes={goalMinutes} />}
          </Card>

          <div className="min-w-0 space-y-4 sm:space-y-6">
            <ActiveChallengesCard />
            <BadgesCard results={badges} />
            <LongestCard workouts={workouts} />
            <Card title="Recente trainingen" action={<MoreLink to="/workouts">Alles</MoreLink>}>
              <WorkoutList workouts={workouts.slice(0, 5)} />
            </Card>
          </div>
        </div>
      </div>

      {completing && (
        <CompleteDialog
          item={completing}
          onComplete={(item, actual) => plan.complete(item, actual).then(refresh)}
          onClose={() => setCompleting(null)}
        />
      )}
    </div>
  )
}

/** Vier kerncijfers voor deze week, telkens tegenover je doel of vorige week. */
function WeekKpis({ workouts, goalMinutes }: { workouts: Workout[]; goalMinutes: number }) {
  const start = weekStart(new Date())
  const now = weekSummary(workouts, start)
  const prev = weekSummary(workouts, addDays(start, -7))
  const streak = weekStreak(workouts)
  const pct = goalMinutes ? Math.round((now.minutes / goalMinutes) * 100) : null

  return (
    <KpiStrip
      items={[
        {
          label: 'Trainingstijd',
          value: now.minutes ? formatDuration(now.minutes) : '0',
          sub: pct !== null ? `${pct}% van ${formatDuration(goalMinutes)}` : 'Nog geen weekdoel',
        },
        {
          label: 'Sessies',
          value: now.sessions,
          sub: <Delta value={now.sessions - prev.sessions}>{signed(now.sessions - prev.sessions)} t.o.v. vorige week</Delta>,
        },
        {
          label: 'Afstand',
          value: `${now.km.toLocaleString('nl-BE')} km`,
          sub: `vorige week ${prev.km.toLocaleString('nl-BE')} km`,
        },
        {
          label: 'Reeks',
          value: `${streak} ${streak === 1 ? 'week' : 'weken'}`,
          sub: streak ? 'op rij actief' : 'Log een training om te starten',
        },
      ]}
    />
  )
}

function Hero() {
  const race = useRace()
  const days = daysUntilRace(race)
  const phase = currentPhase(race)
  const passed = racePassed(race)
  return (
    <Card className="lg:col-span-2">
      <p className={`${eyebrowClass} truncate`}>
        {race.name} · {race.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {passed ? (
        <div className="mt-3">
          <p className="text-2xl font-medium tracking-tight text-fg">Je race is voorbij.</p>
          <p className="mt-1 text-sm text-fg-3">Proficiat met je finish! Kies je volgende race, dan volgen countdown, fase en trainingsplan mee.</p>
          <Link to="/instellingen" className={`${primaryButton} mt-5`}>
            <Icon name="flag" className="size-4" />
            Kies je volgende race
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-x-12 gap-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl leading-none font-light tracking-tight text-fg tabular-nums sm:text-7xl">{days}</span>
            <span className="text-base text-fg-3">{days === 1 ? 'dag' : 'dagen'}</span>
          </div>
          <dl className="flex gap-10 pb-1.5 text-sm">
            <div>
              <dt className="text-xs text-fg-3">Weken</dt>
              <dd className="mt-0.5 text-lg font-medium tracking-tight text-fg tabular-nums">{Math.floor(days / 7)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-3">Fase</dt>
              <dd className="mt-0.5 text-lg font-medium tracking-tight text-fg">{phase.name}</dd>
            </div>
          </dl>
        </div>
      )}
      {/* Afstanden als rustige tekst, met enkel een sportbolletje als kleur. */}
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-3">
        <span className="font-medium text-fg-2">{RACE_TYPES[race.type].label}</span>
        {(['swim', 'bike', 'run'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 tabular-nums">
            <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} aria-hidden />
            {race.distances[s].toLocaleString('nl-BE')} km {SPORT_LABEL[s].toLowerCase()}
          </span>
        ))}
      </p>
      {!passed && (
        <div className="mt-6 border-t border-line pt-6">
          <PhaseTimeline />
          <p className="mt-4 text-sm text-fg-3">{phase.description}</p>
        </div>
      )}
    </Card>
  )
}

function TodayCard({
  planned,
  onToggle,
  onShowReport,
}: {
  planned: PlannedWorkout[]
  onToggle: (p: PlannedWorkout) => void
  onShowReport?: () => void
}) {
  return (
    <Card className="flex flex-col" title="Vandaag" action={<MoreLink to="/plan">Schema</MoreLink>}>
      {planned.length ? (
        <ul className="-my-3 divide-y divide-line">
          {planned.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3">
              <DoneToggle sport={p.sport} checked={Boolean(p.workout_id)} onClick={() => onToggle(p)} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${p.workout_id ? 'text-fg-3 line-through' : 'text-fg'}`}>{p.title || SPORT_LABEL[p.sport]}</p>
                <p className="mt-0.5 text-sm text-fg-3">
                  {SPORT_LABEL[p.sport]} · {formatSessionDuration(p.duration_min)}
                  {p.distance_km ? ` · ${p.distance_km} km` : ''}
                </p>
                {p.notes && <p className="mt-1 text-xs text-fg-3">{p.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="calendar"
          title="Rustdag"
          action={
            <Link to="/plan" className={secondaryButton}>
              <Icon name="plus" className="size-4" />
              Sessie plannen
            </Link>
          }
        >
          Niets gepland voor vandaag.
        </EmptyState>
      )}
      {onShowReport && (
        <div className="mt-auto pt-5">
          <button
            onClick={onShowReport}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left text-sm transition hover:bg-hover"
          >
            <Icon name="chart" className="size-4 shrink-0 text-fg-3" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-fg">Weekrapport van vorige week</span>
              <span className="block text-xs text-fg-3">Het nieuwe rapport verschijnt zondag</span>
            </span>
            <Icon name="chevron-right" className="size-4 text-fg-4" />
          </button>
        </div>
      )}
    </Card>
  )
}

function GoalTile({
  sport,
  doneMin,
  doneKm,
  plannedMin,
  goalMin,
  goalKm,
}: {
  sport: Sport
  doneMin: number
  doneKm: number
  plannedMin: number
  goalMin: number
  goalKm: number | null
}) {
  const pct = goalMin ? Math.round((doneMin / goalMin) * 100) : null
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-fg-2">
          <span className={`size-1.5 shrink-0 rounded-full ${SPORT_BG[sport]}`} aria-hidden />
          <span className="truncate">{SPORT_LABEL[sport]}</span>
        </span>
        {pct !== null && <span className="text-xs text-fg-3 tabular-nums">{pct}%</span>}
      </div>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
        <span className="text-2xl font-medium tracking-tight text-fg">{doneMin ? formatDuration(doneMin) : '0'}</span>
        {goalMin > 0 && <span className="text-sm text-fg-3">/ {formatDuration(goalMin)}</span>}
      </p>
      <div className="mt-4">
        <ProgressBar value={doneMin} max={goalMin || doneMin + plannedMin} planned={plannedMin} color={SPORT_BG[sport]} />
      </div>
      <p className="mt-2.5 text-xs text-fg-3">
        {doneKm > 0 && `${doneKm}${goalKm ? ` / ${goalKm}` : ''} km · `}
        {plannedMin ? (
          `nog ${formatDuration(plannedMin)} gepland`
        ) : goalMin ? (
          'deze week'
        ) : (
          <Link to="/goals" className="font-medium text-fg-2 underline-offset-4 hover:text-fg hover:underline">
            Stel een doel in
          </Link>
        )}
      </p>
    </section>
  )
}

function LongestCard({ workouts }: { workouts: { sport: Sport; distance_km: number | null }[] }) {
  const race = useRace()
  return (
    <Card title="Langste sessie vs. race" description="Je langste afstand tot nu toe, tegenover de race-afstand.">
      <div className="space-y-5">
        {(['swim', 'bike', 'run'] as const).map((s) => {
          const longest = Math.max(0, ...workouts.filter((w) => w.sport === s).map((w) => Number(w.distance_km ?? 0)))
          const target = race.distances[s]
          return (
            <div key={s}>
              <div className="mb-2 flex justify-between gap-2 text-sm">
                <span className="text-fg-2">{SPORT_LABEL[s]}</span>
                <span className="text-fg-3 tabular-nums">
                  <span className="font-medium text-fg">{(longest || 0).toLocaleString('nl-BE')}</span> / {target.toLocaleString('nl-BE')} km
                </span>
              </div>
              <ProgressBar value={longest} max={target} color={SPORT_BG[s]} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
