import { labelClass } from '../lib/ui'

export interface DurationValue {
  hours: string
  minutes: string
  seconds: string
}

export const emptyDuration: DurationValue = { hours: '', minutes: '', seconds: '' }

// Zelfde look als inputClass, met ruimte rechts voor het achtervoegsel (u/min/s).
const partClass =
  'block h-11 w-full min-w-0 rounded-xl border border-line-strong bg-surface pr-10 pl-3.5 text-base text-fg tabular-nums placeholder:text-fg-4 transition focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none sm:text-sm'

/** Duur als uren/minuten/seconden in één veld; gedeeld door het trainings- en het planformulier. */
export function DurationFields({
  value,
  onChange,
  className = '',
}: {
  value: DurationValue
  onChange: (v: DurationValue) => void
  className?: string
}) {
  const parts: { key: keyof DurationValue; suffix: string; label: string; max?: number }[] = [
    { key: 'hours', suffix: 'u', label: 'Uren' },
    { key: 'minutes', suffix: 'min', label: 'Minuten', max: 59 },
    { key: 'seconds', suffix: 's', label: 'Seconden', max: 59 },
  ]
  return (
    <fieldset className={className}>
      <legend className={labelClass}>Duur</legend>
      <div className="grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <label key={p.key} className="relative block">
            <input
              type="number"
              min="0"
              max={p.max}
              inputMode="numeric"
              placeholder="0"
              aria-label={p.label}
              className={partClass}
              value={value[p.key]}
              onChange={(e) => onChange({ ...value, [p.key]: e.target.value })}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-3">{p.suffix}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Omgekeerd: minuten (decimaal) naar invulvelden; lege velden voor nul. */
export function fromMinutes(min: number): DurationValue {
  const total = Math.round(min * 60)
  const part = (n: number) => (n ? String(n) : '')
  return { hours: part(Math.floor(total / 3600)), minutes: part(Math.floor((total % 3600) / 60)), seconds: part(total % 60) }
}

/** Totale duur in minuten (decimaal), afgerond op 4 decimalen zoals de database opslaat. */
export const toMinutes = ({ hours, minutes, seconds }: DurationValue) =>
  Math.round((Number(hours || 0) * 60 + Number(minutes || 0) + Number(seconds || 0) / 60) * 10000) / 10000
