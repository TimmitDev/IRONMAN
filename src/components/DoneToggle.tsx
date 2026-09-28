import { SPORT_BG, SPORT_BORDER, type Sport } from '../lib/types'
import { Icon } from './Icon'

export function DoneToggle({ sport, checked, onClick }: { sport: Sport; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
      onClick={onClick}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none ${SPORT_BORDER[sport]} ${
        checked ? SPORT_BG[sport] : 'hover:bg-hover'
      }`}
    >
      {checked && <Icon name="check" className="size-3 text-white" strokeWidth={3} />}
    </button>
  )
}
