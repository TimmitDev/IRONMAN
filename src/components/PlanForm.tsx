import { useState, type FormEvent } from 'react'
import type { NewPlanned, Sport } from '../lib/types'
import { errorMessage, ghostButton, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, toMinutes } from './DurationFields'
import { SportPicker } from './SportPicker'

export function PlanForm({
  defaultDate,
  onSubmit,
  onCancel,
}: {
  defaultDate: string
  onSubmit: (p: NewPlanned) => Promise<void>
  onCancel: () => void
}) {
  const [sport, setSport] = useState<Sport>('run')
  const [date, setDate] = useState(defaultDate)
  const [title, setTitle] = useState('')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const duration = toMinutes(hours, minutes)
    if (duration <= 0) return setError('Vul een duur in.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        sport,
        date,
        title: title.trim() || null,
        duration_min: duration,
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
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <div className="col-span-2 lg:col-span-3">
        <SportPicker value={sport} onChange={setSport} />
      </div>
      <label className="col-span-2 lg:col-span-3">
        <span className={labelClass}>Datum</span>
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label className="col-span-2 lg:col-span-3">
        <span className={labelClass}>Titel</span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bv. Lange duurloop Z2" autoFocus />
      </label>
      <DurationFields hours={hours} minutes={minutes} onHours={setHours} onMinutes={setMinutes} />
      <label>
        <span className={labelClass}>Afstand (km)</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} />
      </label>
      <label className="col-span-2 lg:col-span-6">
        <span className={labelClass}>Notities</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. 3x10' tempo, 5' rust" />
      </label>
      <div className="col-span-2 flex items-center gap-2 lg:col-span-6">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : 'Inplannen'}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          Annuleren
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </form>
  )
}
