import { formatDuration, parseISODate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type Workout } from '../lib/types'

export function WorkoutList({ workouts, onDelete }: { workouts: Workout[]; onDelete?: (id: string) => void }) {
  if (!workouts.length) return <p className="text-sm text-stone-500">Nog geen trainingen gelogd.</p>

  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {workouts.map((w) => (
        <li key={w.id} className="flex items-center gap-3 py-2.5 text-sm">
          <span className={`size-2.5 shrink-0 rounded-full ${SPORT_BG[w.sport]}`} />
          <span className="w-20 shrink-0 text-stone-500">
            {parseISODate(w.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
          </span>
          <span className="w-20 shrink-0 font-medium">{SPORT_LABEL[w.sport]}</span>
          <span className="w-16 shrink-0 tabular-nums">{formatDuration(w.duration_min)}</span>
          <span className="w-16 shrink-0 tabular-nums text-stone-500">{w.distance_km ? `${w.distance_km} km` : ''}</span>
          <span className="min-w-0 flex-1 truncate text-stone-500">
            {w.rpe ? `RPE ${w.rpe}` : ''}
            {w.rpe && w.notes ? ' · ' : ''}
            {w.notes}
          </span>
          {onDelete && (
            <button
              onClick={() => confirm('Training verwijderen?') && onDelete(w.id)}
              className="rounded px-2 text-stone-400 hover:bg-stone-100 hover:text-red-600 dark:hover:bg-stone-800"
              aria-label="Verwijderen"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
