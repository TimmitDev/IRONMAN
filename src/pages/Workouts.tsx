import { Card } from '../components/Card'
import { WorkoutForm } from '../components/WorkoutForm'
import { WorkoutList } from '../components/WorkoutList'
import { useWorkouts } from '../lib/useWorkouts'

export function Workouts() {
  const { workouts, loading, error, add, remove } = useWorkouts()

  return (
    <div className="space-y-4">
      <Card title="Nieuwe training">
        <WorkoutForm onSubmit={add} />
      </Card>
      <Card title={`Alle trainingen (${workouts.length})`}>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-stone-500">Laden…</p>
        ) : (
          <WorkoutList workouts={workouts} onDelete={(id) => remove(id).catch((e) => alert(e.message))} />
        )}
      </Card>
    </div>
  )
}
