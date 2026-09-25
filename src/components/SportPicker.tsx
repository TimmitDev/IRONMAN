import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { labelClass } from '../lib/ui'

export function SportPicker({ value, onChange }: { value: Sport; onChange: (s: Sport) => void }) {
  return (
    <fieldset>
      <legend className={labelClass}>Sport</legend>
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-1">
        {SPORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              value === s ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[s]}`} />
            <span className="truncate">{SPORT_LABEL[s]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
