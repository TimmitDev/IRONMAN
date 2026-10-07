import { formatPace, formatSessionDuration, formatShortDate } from '../lib/race'
import { workoutKcal } from '../lib/kcal'
import { useProfile } from '../lib/profile'
import { SPORT_SOFT, SPORT_TEXT, workoutLabel, type Workout } from '../lib/types'
import { EmptyState } from './EmptyState'
import { Icon } from './Icon'
import { RouteThumb } from './RouteThumb'

/** Zwaardere sessies vallen meer op: neutraal tot 6, waarschuwingskleur vanaf 7, rood vanaf 9. */
const rpeClass = (rpe: number) => (rpe >= 9 ? 'bg-danger/10 text-danger' : rpe >= 7 ? 'bg-warning/10 text-warning' : 'bg-subtle text-fg-2')

/**
 * Lijst met trainingen; met `onEdit` is elke rij aanklikbaar om te bewerken.
 * `showKcal` alleen voor je eigen trainingen: kcal van anderen is privé.
 */
export function WorkoutList({ workouts, onEdit, showKcal = false }: { workouts: Workout[]; onEdit?: (w: Workout) => void; showKcal?: boolean }) {
  const weight = useProfile().profile?.weight_kg ?? null
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
        const kcal = showKcal ? workoutKcal(w, weight) : null
        const content = (
          <>
            {w.route_polyline ? (
              <RouteThumb polyline={w.route_polyline} sport={w.sport} />
            ) : (
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-md ${SPORT_SOFT[w.sport]} ${SPORT_TEXT[w.sport]}`}>
                <Icon name={w.sport} className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate font-medium text-fg">{workoutLabel(w)}</span>
                {w.strava_activity_id ? (
                  <span className="shrink-0 rounded-md px-1 text-[10px] font-medium tracking-wide text-fg-3 ring-1 ring-line ring-inset" title="Geïmporteerd uit Strava">
                    STRAVA
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-fg-3">
                <span className="shrink-0">{formatShortDate(w.date)}</span>
                {w.rpe ? (
                  <span className={`shrink-0 rounded px-1 font-medium tabular-nums ${rpeClass(w.rpe)}`} title={`RPE ${w.rpe} van 10`}>
                    RPE {w.rpe}
                  </span>
                ) : null}
                {w.notes && <span className="truncate">{w.notes}</span>}
              </p>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="font-semibold tracking-tight text-fg">{formatSessionDuration(w.duration_min)}</div>
              {w.distance_km || kcal ? (
                <div className="mt-0.5 text-xs text-fg-3">
                  {w.distance_km ? `${w.distance_km} km` : ''}
                  {pace && <span className="hidden text-fg-4 sm:inline"> · {pace}</span>}
                  {w.distance_km && kcal ? ' · ' : ''}
                  {kcal ? `${kcal.toLocaleString('nl-BE')} kcal` : ''}
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
                aria-label={`${workoutLabel(w)} ${formatShortDate(w.date)} bewerken`}
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
