import { formatPace, formatSessionDuration, formatShortDate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type Workout } from '../lib/types'

/** Lijst met trainingen; met `onEdit` is elke rij aanklikbaar om te bewerken. */
export function WorkoutList({ workouts, onEdit }: { workouts: Workout[]; onEdit?: (w: Workout) => void }) {
  if (!workouts.length) return <p className="text-sm text-zinc-500">Nog geen trainingen gelogd.</p>

  return (
    <ul className="divide-y divide-white/5">
      {workouts.map((w) => {
        const pace = formatPace(w.sport, w.duration_min, w.distance_km)
        const content = (
          <>
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
              <div className="font-semibold text-white">{formatSessionDuration(w.duration_min)}</div>
              {w.distance_km ? (
                <div className="text-xs text-zinc-400">
                  {w.distance_km} km
                  {pace && <span className="text-zinc-500"> · {pace}</span>}
                </div>
              ) : null}
            </div>
          </>
        )
        return (
          <li key={w.id}>
            {onEdit ? (
              <button
                onClick={() => onEdit(w)}
                className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition hover:bg-white/5"
                aria-label={`${SPORT_LABEL[w.sport]} ${formatShortDate(w.date)} bewerken`}
              >
                {content}
                <span className="text-zinc-600" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3 py-2.5 text-sm">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
