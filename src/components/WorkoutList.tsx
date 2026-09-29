import { formatPace, formatSessionDuration, formatShortDate } from '../lib/race'
import { SPORT_BG, SPORT_LABEL, type Workout } from '../lib/types'
import { EmptyState } from './EmptyState'
import { Icon } from './Icon'
import { RouteThumb } from './RouteThumb'

/** Lijst met trainingen; met `onEdit` is elke rij aanklikbaar om te bewerken. */
export function WorkoutList({ workouts, onEdit }: { workouts: Workout[]; onEdit?: (w: Workout) => void }) {
  if (!workouts.length)
    return (
      <EmptyState icon="activity" title="Nog geen trainingen">
        Gelogde trainingen verschijnen hier.
      </EmptyState>
    )

  return (
    <ul className="divide-y divide-line">
      {workouts.map((w) => {
        const pace = formatPace(w.sport, w.duration_min, w.distance_km)
        const content = (
          <>
            {w.route_polyline ? (
              <RouteThumb polyline={w.route_polyline} sport={w.sport} />
            ) : (
              <span className={`h-9 w-0.5 shrink-0 rounded-full ${SPORT_BG[w.sport]}`} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-medium text-fg">{SPORT_LABEL[w.sport]}</span>
                <span className="shrink-0 text-xs text-fg-3">{formatShortDate(w.date)}</span>
                {w.strava_activity_id ? (
                  <span className="shrink-0 rounded-md px-1 text-[10px] font-medium tracking-wide text-fg-3 ring-1 ring-line ring-inset" title="Geïmporteerd uit Strava">
                    STRAVA
                  </span>
                ) : null}
              </div>
              {(w.rpe || w.notes) && (
                <p className="mt-0.5 truncate text-xs text-fg-3">
                  {w.rpe ? `RPE ${w.rpe}` : ''}
                  {w.rpe && w.notes ? ' · ' : ''}
                  {w.notes}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="font-medium tracking-tight text-fg">{formatSessionDuration(w.duration_min)}</div>
              {w.distance_km ? (
                <div className="mt-0.5 text-xs text-fg-3">
                  {w.distance_km} km
                  {pace && <span className="text-fg-4"> · {pace}</span>}
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
                className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition hover:bg-hover focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none"
                aria-label={`${SPORT_LABEL[w.sport]} ${formatShortDate(w.date)} bewerken`}
              >
                {content}
                <Icon name="chevron-right" className="size-4 text-fg-4 transition group-hover:text-fg-3" />
              </button>
            ) : (
              <div className="flex items-center gap-3 py-3 text-sm">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
