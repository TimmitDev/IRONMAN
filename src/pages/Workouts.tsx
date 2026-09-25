import { Card } from '../components/Card'
import { WorkoutForm } from '../components/WorkoutForm'
import { WorkoutList } from '../components/WorkoutList'
import { errorMessage } from '../lib/ui'
import { useWorkouts } from '../lib/useWorkouts'

export function Workouts() {
  const { workouts, loading, error, add, remove } = useWorkouts()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card title="Training loggen" className="lg:col-span-3 lg:self-start">
        <WorkoutForm onSubmit={add} />
      </Card>
      <Card title={`Alle trainingen · ${workouts.length}`} className="lg:col-span-2">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-sm text-zinc-500">Laden…</p>
        ) : (
          <WorkoutList workouts={workouts} onDelete={(id) => remove(id).catch((e) => alert(errorMessage(e)))} />
        )}
      </Card>
    </div>
  )
}
