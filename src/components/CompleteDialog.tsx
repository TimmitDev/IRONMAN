import { useState, type FormEvent } from 'react'
import { formatPace, formatSessionDuration, formatShortDate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type NewWorkout, type PlannedWorkout } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton, secondaryButton } from '../lib/ui'
import { DurationFields, fromMinutes, toMinutes, type DurationValue } from './DurationFields'
import { Icon } from './Icon'
import { Modal } from './Modal'

type Actual = Pick<NewWorkout, 'duration_min' | 'distance_km' | 'rpe' | 'notes'>

/** Afvinken van een geplande sessie: vooraf ingevuld met het plan, aan te passen naar wat je echt deed. */
export function CompleteDialog({
  item,
  onComplete,
  onClose,
}: {
  item: PlannedWorkout
  onComplete: (item: PlannedWorkout, actual: Actual) => Promise<void>
  onClose: () => void
}) {
  const [duration, setDuration] = useState<DurationValue>(fromMinutes(item.duration_min))
  const [distance, setDistance] = useState(item.distance_km ? String(item.distance_km) : '')
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState(item.title ?? item.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minutes = toMinutes(duration)
  const km = distance ? Number(distance) : null
  const pace = formatPace(item.sport, minutes, km)
  const plannedPace = formatPace(item.sport, item.duration_min, item.distance_km)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (minutes <= 0) return setError('Vul een duur in.')
    setBusy(true)
    setError(null)
    try {
      await onComplete(item, { duration_min: minutes, distance_km: km, rpe: rpe ? Number(rpe) : null, notes: notes.trim() || null })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal title="Sessie afvinken" description="Vul in wat je echt deed; het plan staat al klaar." onClose={onClose}>
      <div className="mb-6 flex items-start gap-3 border-b border-line pb-5">
        <span className={`mt-0.5 h-9 w-0.5 shrink-0 rounded-full ${SPORT_BG[item.sport]}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg break-words">{item.title || SPORT_LABEL[item.sport]}</p>
          <p className="mt-0.5 text-sm text-fg-3">
            Gepland {formatShortDate(item.date)}: {formatSessionDuration(item.duration_min)}
            {item.distance_km ? ` · ${item.distance_km} km` : ''}
            {plannedPace ? ` · ${plannedPace}` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-3 gap-y-4">
        <DurationFields value={duration} onChange={setDuration} className="col-span-2" />
        <label>
          <span className={labelClass}>Afstand (km)</span>
          <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>RPE (1–10)</span>
          <input type="number" min="1" max="10" inputMode="numeric" className={inputClass} value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="hoe zwaar?" />
        </label>
        {pace && (
          <p className="col-span-2 -mt-1 text-sm text-fg-2">
            Tempo: <span className="font-medium text-fg tabular-nums">{pace}</span>
            {plannedPace && plannedPace !== pace && <span className="text-fg-3"> (gepland {plannedPace})</span>}
          </p>
        )}
        <label className="col-span-2">
          <span className={labelClass}>Notities</span>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <p className="col-span-2 text-sm text-danger">{error}</p>}
        <div className="col-span-2 flex flex-wrap items-center gap-2 pt-2">
          <button type="submit" disabled={busy} className={primaryButton}>
            {!busy && <Icon name="check" className="size-4" />}
            {busy ? 'Opslaan…' : 'Gedaan'}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Annuleren
          </button>
        </div>
      </form>
    </Modal>
  )
}
