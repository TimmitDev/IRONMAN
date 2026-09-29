import { Link } from 'react-router-dom'
import { addDays, formatDuration, parseISODate, sumMinutes, todayISO } from '../lib/race'
import { SPORT_BG, SPORT_BORDER, SPORT_LABEL, type PlannedWorkout, type Workout } from '../lib/types'

/**
 * De week in één oogopslag: per dag een gevuld bolletje per gedane training (in de sportkleur)
 * en een open bolletje per geplande sessie die nog open staat. Klik gaat naar het schema.
 */
export function WeekStrip({ start, done, planned }: { start: string; done: Workout[]; planned: PlannedWorkout[] }) {
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <Link to="/plan" className="grid grid-cols-7 overflow-hidden rounded-xl border border-line bg-surface transition hover:border-line-strong" aria-label="Deze week in je schema">
      {days.map((d, i) => {
        const dayDone = done.filter((w) => w.date === d)
        const dayOpen = planned.filter((p) => p.date === d && !p.workout_id)
        const isToday = d === today
        const past = d < today
        const min = sumMinutes(dayDone)
        return (
          <div key={d} className={`flex min-w-0 flex-col items-center gap-2 px-1 py-3 sm:py-4 ${i ? 'border-l border-line' : ''} ${isToday ? 'bg-subtle' : ''}`}>
            <span className={`text-[11px] ${isToday ? 'font-medium text-fg' : 'text-fg-3'}`}>
              {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short' }).replace('.', '')}
            </span>
            <span className={`relative text-sm tabular-nums ${isToday ? 'font-medium text-fg' : past ? 'text-fg-3' : 'text-fg-2'}`}>
              {parseISODate(d).getDate()}
              {isToday && <span className="absolute -top-0.5 -right-2 size-1.5 rounded-full bg-brand" aria-hidden />}
            </span>
            <span className="flex min-h-2 flex-wrap justify-center gap-1" aria-hidden>
              {dayDone.map((w) => (
                <span key={w.id} className={`size-2 rounded-full ${SPORT_BG[w.sport]}`} title={SPORT_LABEL[w.sport]} />
              ))}
              {dayOpen.map((p) => (
                <span key={p.id} className={`size-2 rounded-full border ${SPORT_BORDER[p.sport]} ${past ? 'opacity-40' : ''}`} title={`${SPORT_LABEL[p.sport]} (gepland)`} />
              ))}
            </span>
            <span className="hidden text-[11px] text-fg-4 tabular-nums sm:block">{min ? formatDuration(min) : '–'}</span>
          </div>
        )
      })}
    </Link>
  )
}
