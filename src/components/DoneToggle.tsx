import { SPORT_BG, SPORT_BORDER, type Sport } from '../lib/types'

export function DoneToggle({ sport, checked, onClick }: { sport: Sport; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
      onClick={onClick}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${SPORT_BORDER[sport]} ${
        checked ? SPORT_BG[sport] : 'hover:bg-white/10'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
