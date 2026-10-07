import { useState, type FormEvent } from 'react'
import { addDays, formatDuration, formatPace, todayISO } from '../lib/race'
import { CARDIO_LABEL, CARDIO_TYPES, type CardioType, type NewWorkout, type Sport } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton } from '../lib/ui'
import { DurationFields, emptyDuration, fromMinutes, toMinutes, type DurationValue } from './DurationFields'
import { Icon } from './Icon'
import { SportPicker } from './SportPicker'

/** Snelkeuzes voor de duur, in minuten. */
const DURATION_PRESETS = [30, 45, 60, 90, 120]

/** Hoe zwaar een RPE-score voelt, voor het bijschrift onder de knoppen. */
const RPE_TEXT: Record<number, string> = {
  1: 'Heel licht',
  2: 'Heel licht',
  3: 'Licht',
  4: 'Licht',
  5: 'Gemiddeld',
  6: 'Gemiddeld',
  7: 'Zwaar',
  8: 'Zwaar',
  9: 'Heel zwaar',
  10: 'Maximaal',
}

const NOTES_PLACEHOLDER: Record<Sport, string> = {
  swim: 'bv. 10x100 m, 15" rust',
  bike: "bv. 4x8' op FTP",
  run: 'bv. 6x1 km op 10k-tempo',
  strength: 'bv. squats 4x6, planken',
  cardio: "bv. 5x4' op 2:00 /500 m",
}

/** Kleine pilknop voor snelkeuzes; `activeClass` kleurt de gekozen. */
const chipClass = (active: boolean, activeClass = 'border-fg bg-fg text-canvas') =>
  `inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none active:scale-[0.97] ${
    active ? `${activeClass} font-medium` : 'border-line-strong text-fg-2 hover:bg-hover hover:text-fg'
  }`

/** Training loggen (leeg) of bewerken (`initial`). Eén kolom breed, zodat het in de zijkolom en in een venster past. */
export function WorkoutForm({ initial, onSubmit }: { initial?: NewWorkout; onSubmit: (w: NewWorkout) => Promise<void> }) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? 'run')
  const [cardioType, setCardioType] = useState<CardioType | null>(initial?.cardio_type ?? null)
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [duration, setDuration] = useState<DurationValue>(initial ? fromMinutes(initial.duration_min) : emptyDuration)
  const [distance, setDistance] = useState(initial?.distance_km ? String(initial.distance_km) : '')
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = todayISO()
  const yesterday = addDays(today, -1)
  const minutes = toMinutes(duration)
  // Krachttraining heeft geen afstand.
  const hasDistance = sport !== 'strength'
  const pace = hasDistance ? formatPace(sport, minutes, distance ? Number(distance) : null) : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sport === 'cardio' && !cardioType) return setError('Kies welke cardiotraining je deed.')
    if (minutes <= 0) return setError('Vul een duur in.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        sport,
        cardio_type: sport === 'cardio' ? cardioType : null,
        date,
        duration_min: minutes,
        distance_km: hasDistance && distance ? Number(distance) : null,
        rpe,
        notes: notes.trim() || null,
      })
      if (!initial) {
        setDuration(emptyDuration)
        setDistance('')
        setRpe(null)
        setNotes('')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SportPicker value={sport} onChange={setSport} />

      {sport === 'cardio' && (
        <fieldset className="animate-fade-in">
          <legend className={labelClass}>Soort cardio</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {CARDIO_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCardioType(t)}
                aria-pressed={cardioType === t}
                className={`${chipClass(cardioType === t, 'border-cardio bg-cardio/15 text-fg')} h-10 justify-center rounded-lg`}
              >
                {CARDIO_LABEL[t]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className={labelClass}>Datum</legend>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setDate(today)} aria-pressed={date === today} className={`${chipClass(date === today)} h-10 rounded-lg`}>
            Vandaag
          </button>
          <button type="button" onClick={() => setDate(yesterday)} aria-pressed={date === yesterday} className={`${chipClass(date === yesterday)} h-10 rounded-lg`}>
            Gisteren
          </button>
          <input type="date" aria-label="Datum" className={`${inputClass} min-w-0 flex-1`} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </fieldset>

      <div>
        <DurationFields value={duration} onChange={setDuration} />
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {DURATION_PRESETS.map((m) => (
            <button key={m} type="button" onClick={() => setDuration(fromMinutes(m))} aria-pressed={minutes === m} className={chipClass(minutes === m)}>
              {formatDuration(m)}
            </button>
          ))}
        </div>
      </div>

      {hasDistance && (
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={labelClass}>Afstand</span>
            <span className="relative block">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                className={`${inputClass} pr-10 tabular-nums`}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-3">km</span>
            </span>
          </label>
          <div>
            <span className={labelClass}>{sport === 'bike' ? 'Snelheid' : 'Tempo'}</span>
            <p className={`flex h-10 items-center rounded-lg bg-subtle px-3 text-sm tabular-nums ${pace ? 'font-medium text-fg' : 'text-fg-4'}`} aria-live="polite">
              {pace ?? '–'}
            </p>
          </div>
        </div>
      )}

      <fieldset>
        <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-sm text-fg-2">
          <span>Hoe zwaar voelde het?</span>
          <span className="text-xs text-fg-3">{rpe ? `RPE ${rpe} · ${RPE_TEXT[rpe]}` : 'optioneel'}</span>
        </legend>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              // Nog eens tikken op de gekozen score wist ze.
              onClick={() => setRpe(rpe === n ? null : n)}
              aria-pressed={rpe === n}
              aria-label={`RPE ${n}: ${RPE_TEXT[n]}`}
              className={`h-9 min-w-0 rounded-md text-sm tabular-nums transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none active:scale-[0.95] ${
                rpe === n ? 'bg-fg font-medium text-canvas' : rpe && n < rpe ? 'bg-muted text-fg-2' : 'bg-subtle text-fg-3 hover:bg-muted hover:text-fg'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-fg-4">
          <span>licht</span>
          <span>maximaal</span>
        </div>
      </fieldset>

      <label className="block">
        <span className={labelClass}>Notities</span>
        <textarea
          rows={2}
          className={`${inputClass} h-auto resize-none py-2`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={NOTES_PLACEHOLDER[sport]}
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryButton} h-10 w-full`}>
        {!busy && !initial && <Icon name="plus" className="size-4" />}
        {busy ? 'Opslaan…' : initial ? 'Opslaan' : 'Training toevoegen'}
      </button>
    </form>
  )
}
