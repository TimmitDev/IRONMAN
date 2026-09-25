import { useState, type FormEvent } from 'react'
import { todayISO } from '../lib/race'
import type { NewWorkout, Sport } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, emptyDuration, toMinutes, type DurationValue } from './DurationFields'
import { SportPicker } from './SportPicker'

export function WorkoutForm({ onSubmit }: { onSubmit: (w: NewWorkout) => Promise<void> }) {
  const [sport, setSport] = useState<Sport>('run')
  const [date, setDate] = useState(todayISO)
  const [duration, setDuration] = useState<DurationValue>(emptyDuration)
  const [distance, setDistance] = useState('')
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const minutes = toMinutes(duration)
    if (minutes <= 0) return setError('Vul een duur in.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        sport,
        date,
        duration_min: minutes,
        distance_km: distance ? Number(distance) : null,
        rpe: rpe ? Number(rpe) : null,
        notes: notes.trim() || null,
      })
      setDuration(emptyDuration)
      setDistance('')
      setRpe('')
      setNotes('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <div className="col-span-2 lg:col-span-3">
        <SportPicker value={sport} onChange={setSport} />
      </div>
      <label className="col-span-2 lg:col-span-3">
        <span className={labelClass}>Datum</span>
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <DurationFields value={duration} onChange={setDuration} className="col-span-2 lg:col-span-3" />
      <label className="lg:col-span-2">
        <span className={labelClass}>Afstand (km)</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} />
      </label>
      <label>
        <span className={labelClass}>RPE (1–10)</span>
        <input type="number" min="1" max="10" inputMode="numeric" className={inputClass} value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </label>
      <label className="col-span-2 lg:col-span-6">
        <span className={labelClass}>Notities</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. 4x8' op FTP" />
      </label>
      <div className="col-span-2 flex items-center gap-3 lg:col-span-6">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : 'Training toevoegen'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  )
}
