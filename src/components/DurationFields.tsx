import { labelClass } from '../lib/ui'

export interface DurationValue {
  hours: string
  minutes: string
  seconds: string
}

export const emptyDuration: DurationValue = { hours: '', minutes: '', seconds: '' }

const partClass =
  'w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 py-2 pr-8 pl-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand focus:outline-none'

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
      <div className="grid grid-cols-3 gap-1.5">
        {parts.map((p) => (
          <label key={p.key} className="relative">
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
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-zinc-500">{p.suffix}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Totale duur in minuten (decimaal), afgerond op 4 decimalen zoals de database opslaat. */
export const toMinutes = ({ hours, minutes, seconds }: DurationValue) =>
  Math.round((Number(hours || 0) * 60 + Number(minutes || 0) + Number(seconds || 0) / 60) * 10000) / 10000
