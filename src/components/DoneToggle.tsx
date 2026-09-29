import type { Sport } from '../lib/types'
import { Icon } from './Icon'

/** Afvinkrondje: neutraal. De sportkleur staat als klein bolletje bij de titel, niet hier. */
export function DoneToggle({ checked, onClick }: { sport: Sport; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
      onClick={onClick}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none ${
        checked ? 'border-fg bg-fg' : 'border-line-strong hover:border-fg-3 hover:bg-hover'
      }`}
    >
      {checked && <Icon name="check" className="size-3 text-canvas" strokeWidth={2.5} />}
    </button>
  )
}
