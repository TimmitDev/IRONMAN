import { useState, type FormEvent } from 'react'
import { formatPace, formatSessionDuration, formatShortDate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type NewWorkout, type PlannedWorkout } from '../lib/types'
import { errorMessage, ghostButton, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, fromMinutes, toMinutes, type DurationValue } from './DurationFields'
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
    <Modal title="Sessie afvinken" onClose={onClose}>
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-zinc-800/60 p-3">
        <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${SPORT_BG[item.sport]}`} />
        <div className="min-w-0">
          <p className="font-semibold">{item.title || SPORT_LABEL[item.sport]}</p>
          <p className="text-sm text-zinc-400">
            Gepland {formatShortDate(item.date)}: {formatSessionDuration(item.duration_min)}
            {item.distance_km ? ` · ${item.distance_km} km` : ''}
            {plannedPace ? ` · ${plannedPace}` : ''}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
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
          <p className="col-span-2 rounded-lg bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
            Tempo: <span className="font-bold text-white">{pace}</span>
            {plannedPace && plannedPace !== pace && <span className="text-zinc-500"> (gepland {plannedPace})</span>}
          </p>
        )}
        <label className="col-span-2">
          <span className={labelClass}>Notities</span>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="col-span-2 flex items-center gap-2 pt-1">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? 'Opslaan…' : '✓ Gedaan'}
          </button>
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuleren
          </button>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </form>
    </Modal>
  )
}
