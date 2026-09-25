import { inputClass, labelClass } from '../lib/ui'

/** Uren + minuten naast elkaar; gedeeld door het trainings- en het planformulier. */
export function DurationFields({
  hours,
  minutes,
  onHours,
  onMinutes,
}: {
  hours: string
  minutes: string
  onHours: (v: string) => void
  onMinutes: (v: string) => void
}) {
  return (
    <>
      <label>
        <span className={labelClass}>Uren</span>
        <input type="number" min="0" inputMode="numeric" className={inputClass} value={hours} onChange={(e) => onHours(e.target.value)} />
      </label>
      <label>
        <span className={labelClass}>Minuten</span>
        <input type="number" min="0" max="59" inputMode="numeric" className={inputClass} value={minutes} onChange={(e) => onMinutes(e.target.value)} />
      </label>
    </>
  )
}

export const toMinutes = (hours: string, minutes: string) => Number(hours || 0) * 60 + Number(minutes || 0)
