import { SPORTS, SPORT_LABEL, SPORT_SOFT, SPORT_TEXT, type Sport } from '../lib/types'
import { labelClass } from '../lib/ui'
import { Icon } from './Icon'

/** Sportkeuze als tegels met icoon; de gekozen sport krijgt zijn kleur. */
export function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>Sport</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {SPORTS.map((s) => {
          const active = value === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className={`flex h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border px-1 text-xs transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none active:scale-[0.97] ${
                active ? `border-transparent font-medium text-fg ring-2 ring-current ${SPORT_TEXT[s]} ${SPORT_SOFT[s]}` : 'border-line-strong text-fg-3 hover:bg-hover hover:text-fg'
              }`}
            >
              <Icon name={s} className="size-5" />
              <span className={`max-w-full truncate ${active ? 'text-fg' : ''}`}>{SPORT_LABEL[s]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
