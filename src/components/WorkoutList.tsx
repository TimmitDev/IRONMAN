import { formatDuration, formatShortDate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type Workout } from '../lib/types'

export function WorkoutList({ workouts, onDelete }: { workouts: Workout[]; onDelete?: (id: string) => void }) {
  if (!workouts.length) return <p className="text-sm text-zinc-500">Nog geen trainingen gelogd.</p>

  return (
    <ul className="divide-y divide-white/5">
      {workouts.map((w) => (
        <li key={w.id} className="group flex items-center gap-3 py-2.5 text-sm">
          <span className={`h-8 w-1 shrink-0 rounded-full ${SPORT_BG[w.sport]}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-white">{SPORT_LABEL[w.sport]}</span>
              <span className="text-xs text-zinc-500">{formatShortDate(w.date)}</span>
            </div>
            {(w.rpe || w.notes) && (
              <p className="truncate text-xs text-zinc-400">
                {w.rpe ? `RPE ${w.rpe}` : ''}
                {w.rpe && w.notes ? ' · ' : ''}
                {w.notes}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right tabular-nums">
            <div className="font-semibold text-white">{formatDuration(w.duration_min)}</div>
            {w.distance_km ? <div className="text-xs text-zinc-400">{w.distance_km} km</div> : null}
          </div>
          {onDelete && (
            <button
              onClick={() => confirm('Training verwijderen?') && onDelete(w.id)}
              className="rounded px-2 py-1 text-zinc-500 transition hover:bg-white/5 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
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
