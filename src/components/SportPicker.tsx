import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { labelClass } from '../lib/ui'

/** Sportkeuze als segmentknoppen (zelfde stijl als Segmented), met het kleurbolletje van de sport. */
export function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>Sport</legend>
      <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-subtle p-0.5">
        {SPORTS.map((s) => {
          const active = value === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-1 text-[13px] transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none sm:px-2 sm:text-sm ${
                active ? 'bg-surface font-medium text-fg ring-1 ring-line' : 'text-fg-3 hover:text-fg'
              }`}
            >
              {/* Vijf knoppen op een smal scherm: het bolletje valt weg zodat de namen passen. */}
              <span className={`hidden size-1.5 shrink-0 rounded-full sm:block ${SPORT_BG[s]}`} />
              <span className="truncate">{SPORT_LABEL[s]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
