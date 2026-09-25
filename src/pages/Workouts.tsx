import { useState } from 'react'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { WorkoutForm } from '../components/WorkoutForm'
import { WorkoutList } from '../components/WorkoutList'
import type { Workout } from '../lib/types'
import { errorMessage } from '../lib/ui'
import { useWorkouts } from '../lib/useWorkouts'

export function Workouts() {
  const { workouts, loading, error, add, update, remove } = useWorkouts()
  const [editing, setEditing] = useState<Workout | null>(null)

  async function handleDelete(w: Workout) {
    if (!confirm('Training verwijderen?')) return
    try {
      await remove(w.id)
      setEditing(null)
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card title="Training loggen" className="lg:col-span-3 lg:self-start">
        <WorkoutForm onSubmit={add} />
      </Card>
      <Card title={`Alle trainingen · ${workouts.length}`} className="lg:col-span-2">
        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
        {loading ? <p className="text-sm text-zinc-500">Laden…</p> : <WorkoutList workouts={workouts} onEdit={setEditing} />}
      </Card>

      {editing && (
        <Modal title="Training bewerken" onClose={() => setEditing(null)}>
          <WorkoutForm
            key={editing.id}
            initial={editing}
            inDialog
            onSubmit={async (patch) => {
              await update(editing.id, patch)
              setEditing(null)
            }}
          />
          <button
            onClick={() => handleDelete(editing)}
            className="mt-4 w-full rounded-lg border border-red-500/30 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Training verwijderen
          </button>
        </Modal>
      )}
    </div>
  )
}
