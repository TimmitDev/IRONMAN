import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgesCard } from '../components/Badges'
import { Card } from '../components/Card'
import { WeekReport } from '../components/WeekReport'
import { useBadges } from '../lib/badges'
import { DoneToggle } from '../components/DoneToggle'
import { PhaseTimeline } from '../components/PhaseTimeline'
import { ProgressBar } from '../components/ProgressBar'
import { WeeklyChart } from '../components/WeeklyChart'
import { WorkoutList } from '../components/WorkoutList'
import { RACE, addDays, currentPhase, daysUntilRace, formatDuration, sumKm, sumMinutes, todayISO, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type PlannedWorkout, type Sport } from '../lib/types'
import { errorMessage } from '../lib/ui'
import { useGoals } from '../lib/useGoals'
import { usePlan } from '../lib/usePlan'
import { useWorkouts } from '../lib/useWorkouts'

export function Dashboard() {
  const { workouts, loading, error, refresh } = useWorkouts()
  const thisWeek = weekStart(new Date())
  const plan = usePlan(thisWeek)
  const { goals, totalMinutes: goalMinutes } = useGoals()
  const badges = useBadges(workouts, goals)
  // Het weekrapport verschijnt op zondag; andere dagen kan je dat van vorige week openen.
  const isSunday = new Date().getDay() === 0
  const [showPrevReport, setShowPrevReport] = useState(false)

  const toggle = (p: PlannedWorkout) =>
    plan
      .toggle(p)
      .then(refresh)
      .catch((e) => alert(errorMessage(e)))

  const reportProps = { workouts, goals, goalMinutes, badges }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {!loading && isSunday && <WeekReport start={thisWeek} {...reportProps} />}
      {!loading && !isSunday && showPrevReport && (
        <WeekReport start={addDays(thisWeek, -7)} {...reportProps} onClose={() => setShowPrevReport(false)} />
      )}
      <Hero />
      <TodayCard
        planned={plan.planned.filter((p) => p.date === todayISO())}
        onToggle={toggle}
        onShowReport={isSunday || showPrevReport ? undefined : () => setShowPrevReport(true)}
      />

      {(error || plan.error) && (
        <Card className="lg:col-span-3">
          <p className="text-sm text-red-400">Kon data niet laden: {error ?? plan.error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
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

      <Card title="Volume per week" className="lg:col-span-2">
        {loading ? <p className="text-sm text-zinc-500">Laden…</p> : <WeeklyChart workouts={workouts} goalMinutes={goalMinutes} />}
      </Card>

      <div className="space-y-4">
        <BadgesCard results={badges} />
        <LongestCard workouts={workouts} />
        <Card
          title="Recent"
          action={
            <Link to="/workouts" className="text-xs font-semibold text-brand hover:underline">
              Alles →
            </Link>
          }
        >
          <WorkoutList workouts={workouts.slice(0, 5)} />
        </Card>
      </div>
    </div>
  )
}

function Hero() {
  const days = daysUntilRace()
  const phase = currentPhase()
  return (
    <Card className="relative overflow-hidden lg:col-span-2">
      <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-brand/20 blur-3xl" />
      <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
        {RACE.name} · {RACE.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <span className="text-7xl leading-none font-black tracking-tighter sm:text-8xl">{days}</span>
          <span className="ml-2 text-lg font-semibold text-zinc-400">dagen</span>
        </div>
        <div className="pb-2 text-sm text-zinc-400">
          <p>
            <span className="font-semibold text-white">{Math.floor(days / 7)}</span> weken
          </p>
          <p>
            Fase <span className="font-semibold text-white">{phase.name}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {(['swim', 'bike', 'run'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-zinc-300">
            <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} />
            {RACE.distances[s]} km {SPORT_LABEL[s].toLowerCase()}
          </span>
        ))}
      </div>
      <div className="mt-6">
        <PhaseTimeline />
        <p className="mt-3 text-sm text-zinc-400">{phase.description}</p>
      </div>
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
    <Card
      className="flex flex-col"
      title="Vandaag"
      action={
        <Link to="/plan" className="text-xs font-semibold text-brand hover:underline">
          Schema →
        </Link>
      }
    >
      {planned.length ? (
        <ul className="space-y-2">
          {planned.map((p) => (
            <li key={p.id} className="flex items-start gap-3 rounded-xl bg-zinc-800/60 p-3">
              <DoneToggle sport={p.sport} checked={Boolean(p.workout_id)} onClick={() => onToggle(p)} />
              <div className="min-w-0">
                <p className={`font-semibold ${p.workout_id ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {p.title || SPORT_LABEL[p.sport]}
                </p>
                <p className="text-sm text-zinc-400">
                  {SPORT_LABEL[p.sport]} · {formatDuration(p.duration_min)}
                  {p.distance_km ? ` · ${p.distance_km} km` : ''}
                </p>
                {p.notes && <p className="mt-1 text-xs text-zinc-500">{p.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center">
          <p className="text-2xl font-black text-zinc-300">Rustdag</p>
          <p className="mt-1 text-sm text-zinc-500">Niets gepland voor vandaag.</p>
          <Link to="/plan" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
            Sessie plannen
          </Link>
        </div>
      )}
      {onShowReport && (
        <button
          onClick={onShowReport}
          className="mt-auto flex items-center justify-between rounded-xl border border-white/5 px-3 py-2.5 text-left text-sm text-zinc-300 transition hover:bg-white/5"
        >
          <span>
            📊 Weekrapport van vorige week
            <span className="block text-xs text-zinc-500">Het nieuwe rapport verschijnt zondag</span>
          </span>
          <span className="text-zinc-500">→</span>
        </button>
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
    <Card>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
          <span className={`h-4 w-1 rounded-full ${SPORT_BG[sport]}`} />
          {SPORT_LABEL[sport]}
        </span>
        {pct !== null && <span className="text-sm font-bold text-white tabular-nums">{pct}%</span>}
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight">
        {doneMin ? formatDuration(doneMin) : '0'}
        {goalMin > 0 && <span className="text-base font-semibold text-zinc-500"> / {formatDuration(goalMin)}</span>}
      </p>
      <div className="mt-3">
        <ProgressBar value={doneMin} max={goalMin || doneMin + plannedMin} planned={plannedMin} color={SPORT_BG[sport]} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {doneKm > 0 && `${doneKm}${goalKm ? ` / ${goalKm}` : ''} km · `}
        {plannedMin ? `nog ${formatDuration(plannedMin)} gepland` : goalMin ? 'deze week' : (
          <Link to="/goals" className="hover:text-white">Stel een doel in →</Link>
        )}
      </p>
    </Card>
  )
}

function LongestCard({ workouts }: { workouts: { sport: Sport; distance_km: number | null }[] }) {
  return (
    <Card title="Langste sessie vs. race">
      <div className="space-y-4">
        {(['swim', 'bike', 'run'] as const).map((s) => {
          const longest = Math.max(0, ...workouts.filter((w) => w.sport === s).map((w) => Number(w.distance_km ?? 0)))
          const target = RACE.distances[s]
          return (
            <div key={s}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-zinc-300">{SPORT_LABEL[s]}</span>
                <span className="text-zinc-400 tabular-nums">
                  <span className="font-semibold text-white">{longest || 0}</span> / {target} km
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
