import { useState, type FormEvent } from 'react'
import { toISODate } from '../lib/race'
import { SPORTS, SPORT_LABEL, type NewWorkout, type Sport } from '../lib/types'

const input =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950'

export function WorkoutForm({ onSubmit }: { onSubmit: (w: NewWorkout) => Promise<void> }) {
  const [sport, setSport] = useState<Sport>('run')
  const [date, setDate] = useState(toISODate(new Date()))
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const duration = Number(hours || 0) * 60 + Number(minutes || 0)
    if (duration <= 0) return setError('Vul een duur in.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        sport,
        date,
        duration_min: duration,
        distance_km: distance ? Number(distance) : null,
        rpe: rpe ? Number(rpe) : null,
        notes: notes.trim() || null,
      })
      setHours('')
      setMinutes('')
      setDistance('')
      setRpe('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs text-stone-500">Sport</span>
        <select className={input} value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
          {SPORTS.map((s) => (
            <option key={s} value={s}>{SPORT_LABEL[s]}</option>
          ))}
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs text-stone-500">Datum</span>
        <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        <span className="mb-1 block text-xs text-stone-500">Uren</span>
        <input type="number" min="0" className={input} value={hours} onChange={(e) => setHours(e.target.value)} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-stone-500">Minuten</span>
        <input type="number" min="0" max="59" className={input} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs text-stone-500">Afstand (km)</span>
        <input type="number" min="0" step="0.01" className={input} value={distance} onChange={(e) => setDistance(e.target.value)} />
      </label>
      <label>
        <span className="mb-1 block text-xs text-stone-500">RPE (1–10)</span>
        <input type="number" min="1" max="10" className={input} value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </label>
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="mb-1 block text-xs text-stone-500">Notities</span>
        <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. 4x8' op FTP" />
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-6">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? 'Opslaan…' : 'Training toevoegen'}
        </button>
        {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
      </div>
    </form>
  )
}
