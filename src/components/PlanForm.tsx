import { useState, type FormEvent } from 'react'
import { formatPace } from '../lib/race'
import type { NewPlanned, Sport } from '../lib/types'
import { errorMessage, ghostButton, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, emptyDuration, fromMinutes, toMinutes, type DurationValue } from './DurationFields'
import { SportPicker } from './SportPicker'

/** Formulier voor een geplande sessie: nieuw (met `defaultDate`) of bewerken (met `initial`). */
export function PlanForm({
  defaultDate,
  initial,
  onSubmit,
  onCancel,
}: {
  defaultDate: string
  initial?: NewPlanned
  onSubmit: (p: NewPlanned) => Promise<void>
  onCancel: () => void
}) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'run')
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [duration, setDuration] = useState<DurationValue>(initial ? fromMinutes(initial.duration_min) : emptyDuration)
  const [distance, setDistance] = useState(initial?.distance_km ? String(initial.distance_km) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        title: title.trim() || null,
        duration_min: minutes,
        distance_km: distance ? Number(distance) : null,
        notes: notes.trim() || null,
      })
      onCancel()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <SportPicker value={sport} onChange={setSport} />
      </div>
      <label className="col-span-2">
        <span className={labelClass}>Titel</span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bv. Lange duurloop Z2" autoFocus={!initial} />
      </label>
      <label>
        <span className={labelClass}>Datum</span>
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        <span className={labelClass}>Afstand (km)</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} />
      </label>
      <DurationFields value={duration} onChange={setDuration} className="col-span-2" />
      {pace && <p className="col-span-2 -mt-1 text-xs text-zinc-400">Doeltempo: <span className="font-semibold text-zinc-200">{pace}</span></p>}
      <label className="col-span-2">
        <span className={labelClass}>Notities</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. 3x10' tempo, 5' rust" />
      </label>
      <div className="col-span-2 flex items-center gap-2 pt-1">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : initial ? 'Opslaan' : 'Inplannen'}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          Annuleren
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  )
}
