import { useState } from 'react'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { WorkoutForm } from '../components/WorkoutForm'
import { WorkoutList } from '../components/WorkoutList'
import type { Workout } from '../lib/types'
import { dangerOutlineButton, errorMessage } from '../lib/ui'
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
    <div>
      <PageHeader title="Trainingen" description="Log je trainingen en bewerk ze achteraf. Tik op een training in de lijst om ze aan te passen." />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <Card title="Training loggen" description="Sport, duur en eventueel afstand en hoe zwaar het voelde." className="lg:col-span-3 lg:self-start">
          <WorkoutForm onSubmit={add} />
        </Card>
        <Card title="Alle trainingen" action={!loading && <span className="text-sm text-fg-3 tabular-nums">{workouts.length}</span>} className="lg:col-span-2">
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <WorkoutList workouts={workouts} onEdit={setEditing} />
          )}
        </Card>
      </div>

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
          <div className="mt-5 border-t border-line pt-5">
            <button onClick={() => handleDelete(editing)} className={`${dangerOutlineButton} w-full`}>
              Training verwijderen
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
