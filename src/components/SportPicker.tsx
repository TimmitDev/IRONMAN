import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { labelClass } from '../lib/ui'

/** Sportkeuze als segmentknoppen (zelfde stijl als Segmented), met het kleurbolletje van de sport. */
export function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>Sport</legend>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
        {SPORTS.map((s) => {
          const active = value === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none ${
                active ? 'bg-surface text-fg shadow-sm' : 'text-fg-3 hover:text-fg'
              }`}
            >
              <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[s]}`} />
              <span className="truncate">{SPORT_LABEL[s]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
