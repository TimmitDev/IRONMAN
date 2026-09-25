import { useState, type FormEvent } from 'react'
import { formatPace, todayISO } from '../lib/race'
import type { NewWorkout, Sport } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, emptyDuration, fromMinutes, toMinutes, type DurationValue } from './DurationFields'
import { SportPicker } from './SportPicker'

/**
 * Training loggen (leeg, op de pagina) of bewerken (`initial`, in een venster).
 * In een venster is het altijd twee kolommen breed; op de pagina zes vanaf lg.
 */
export function WorkoutForm({
  initial,
  inDialog = false,
  onSubmit,
}: {
  initial?: NewWorkout
  inDialog?: boolean
  onSubmit: (w: NewWorkout) => Promise<void>
}) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'run')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [duration, setDuration] = useState<DurationValue>(initial ? fromMinutes(initial.duration_min) : emptyDuration)
  const [distance, setDistance] = useState(initial?.distance_km ? String(initial.distance_km) : '')
  const [rpe, setRpe] = useState(initial?.rpe ? String(initial.rpe) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lg = (cls: string) => (inDialog ? '' : cls)
  const minutes = toMinutes(duration)
  const pace = formatPace(sport, minutes, distance ? Number(distance) : null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
      if (!initial) {
        setDuration(emptyDuration)
        setDistance('')
        setRpe('')
        setNotes('')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`grid grid-cols-2 gap-3 ${lg('lg:grid-cols-6')}`}>
      <div className={`col-span-2 ${lg('lg:col-span-3')}`}>
        <SportPicker value={sport} onChange={setSport} />
      </div>
      <label className={`col-span-2 ${lg('lg:col-span-3')}`}>
        <span className={labelClass}>Datum</span>
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <DurationFields value={duration} onChange={setDuration} className={`col-span-2 ${lg('lg:col-span-3')}`} />
      <label className={lg('lg:col-span-2')}>
        <span className={labelClass}>Afstand (km)</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} />
      </label>
      <label>
        <span className={labelClass}>RPE (1–10)</span>
        <input type="number" min="1" max="10" inputMode="numeric" className={inputClass} value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </label>
      {pace && (
        <p className={`col-span-2 -mt-1 text-xs text-zinc-400 ${lg('lg:col-span-6')}`}>
          Tempo: <span className="font-semibold text-zinc-200">{pace}</span>
        </p>
      )}
      <label className={`col-span-2 ${lg('lg:col-span-6')}`}>
        <span className={labelClass}>Notities</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. 4x8' op FTP" />
      </label>
      <div className={`col-span-2 flex items-center gap-3 ${lg('lg:col-span-6')}`}>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : initial ? 'Opslaan' : 'Training toevoegen'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  )
}
