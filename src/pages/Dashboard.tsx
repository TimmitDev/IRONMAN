import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { WeeklyChart } from '../components/WeeklyChart'
import { WorkoutList } from '../components/WorkoutList'
import { PHASES, RACE, currentPhase, daysUntilRace, formatDuration, parseISODate, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL } from '../lib/types'
import { useWorkouts } from '../lib/useWorkouts'

export function Dashboard() {
  const { workouts, loading, error } = useWorkouts()
  const days = daysUntilRace()
  const phase = currentPhase()
  const thisWeek = weekStart(new Date())
  const weekWorkouts = workouts.filter((w) => weekStart(parseISODate(w.date)) === thisWeek)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <p className="text-sm text-stone-500">
          {RACE.name} ·{' '}
          {RACE.date.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-6xl font-bold tracking-tight">{days}</span>
          <span className="text-lg text-stone-500">dagen te gaan</span>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          ≈ {Math.floor(days / 7)} weken · {RACE.distances.swim} km zwemmen · {RACE.distances.bike} km fietsen ·{' '}
          {RACE.distances.run} km lopen
        </p>
      </Card>

      <Card title="Huidige fase">
        <p className="text-2xl font-semibold">{phase.name}</p>
        <p className="mt-1 text-sm text-stone-500">{phase.description}</p>
        <ol className="mt-4 flex gap-1">
          {PHASES.map((p) => (
            <li key={p.name} className="flex-1">
              <div className={`h-1.5 rounded-full ${p === phase ? 'bg-red-600' : 'bg-stone-200 dark:bg-stone-700'}`} />
              <span className={`mt-1 block text-[10px] ${p === phase ? 'font-medium' : 'text-stone-400'}`}>{p.name}</span>
            </li>
          ))}
        </ol>
      </Card>

      {error && (
        <Card className="lg:col-span-3">
          <p className="text-sm text-red-600">Kon trainingen niet laden: {error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:col-span-3">
        {SPORTS.map((s) => {
          const items = weekWorkouts.filter((w) => w.sport === s)
          const min = items.reduce((a, w) => a + w.duration_min, 0)
          const km = items.reduce((a, w) => a + (w.distance_km ?? 0), 0)
          return (
            <Card key={s}>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span className={`size-2.5 rounded-full ${SPORT_BG[s]}`} />
                {SPORT_LABEL[s]} deze week
              </div>
              <p className="mt-2 text-2xl font-semibold">{min ? formatDuration(min) : '–'}</p>
              <p className="text-sm text-stone-500">
                {items.length} {items.length === 1 ? 'sessie' : 'sessies'}
                {km ? ` · ${Math.round(km * 10) / 10} km` : ''}
              </p>
            </Card>
          )
        })}
      </div>

      <Card title="Trainingsvolume per week (uren)" className="lg:col-span-2">
        {loading ? <p className="text-sm text-stone-500">Laden…</p> : <WeeklyChart workouts={workouts} />}
      </Card>

      <Card title="Recente trainingen">
        <WorkoutList workouts={workouts.slice(0, 6)} />
        <Link to="/workouts" className="mt-3 inline-block text-sm font-medium text-red-600 hover:underline">
          Training loggen →
        </Link>
      </Card>
    </div>
  )
}
