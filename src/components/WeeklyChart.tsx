import { useMemo, useState } from 'react'
import { addDays, formatDuration, formatShortDate, parseISODate, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport, type Workout } from '../lib/types'

interface Week {
  start: string
  minutes: Record<Sport, number>
  total: number
}

/** Alleen datum, sport en duur zijn nodig; zo kan de grafiek ook weektotalen tonen. */
type ChartItem = Pick<Workout, 'date' | 'sport' | 'duration_min'>

function buildWeeks(workouts: ChartItem[], count: number): Week[] {
  const current = weekStart(new Date())
  const weeks: Week[] = Array.from({ length: count }, (_, i) => ({
    start: addDays(current, (i - count + 1) * 7),
    minutes: { swim: 0, bike: 0, run: 0, strength: 0 },
    total: 0,
  }))
  const byStart = new Map(weeks.map((w) => [w.start, w]))
  for (const w of workouts) {
    const week = byStart.get(weekStart(parseISODate(w.date)))
    if (!week) continue
    week.minutes[w.sport] += w.duration_min
    week.total += w.duration_min
  }
  return weeks
}

function niceMax(hours: number): number {
  if (hours <= 4) return 4
  const step = hours <= 12 ? 2 : 5
  return Math.ceil(hours / step) * step
}

export function WeeklyChart({
  workouts,
  goalMinutes = 0,
  weeks: count = 12,
}: {
  workouts: ChartItem[]
  goalMinutes?: number
  weeks?: number
}) {
  const weeks = useMemo(() => buildWeeks(workouts, count), [workouts, count])
  const [hover, setHover] = useState<number | null>(null)
  const goalH = goalMinutes / 60
  const maxH = niceMax(Math.max(goalH, ...weeks.map((w) => w.total / 60)))
  const ticks = [0, maxH / 2, maxH]

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-3">
        {SPORTS.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${SPORT_BG[s]}`} />
            {SPORT_LABEL[s]}
          </span>
        ))}
        {goalH > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-fg-3" />
            Weekdoel
          </span>
        )}
      </div>

      <div className="relative flex h-60 gap-1.5 pl-8 sm:gap-2">
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute right-0 left-8 border-t border-line"
            style={{ bottom: `${(t / maxH) * 100}%` }}
          >
            <span className="absolute -top-2 -left-8 w-6 text-right text-[11px] text-fg-4 tabular-nums">{t}u</span>
          </div>
        ))}

        {goalH > 0 && (
          <div
            className="pointer-events-none absolute right-0 left-8 z-[5] border-t border-dashed border-fg-3"
            style={{ bottom: `${(goalH / maxH) * 100}%` }}
          />
        )}

        {weeks.map((w, i) => (
          <div
            key={w.start}
            className="relative flex flex-1 cursor-default flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={`flex flex-col-reverse gap-px overflow-hidden rounded-t-[3px] transition-opacity ${
                hover !== null && hover !== i ? 'opacity-40' : ''
              }`}
              style={{ height: `${(w.total / 60 / maxH) * 100}%` }}
            >
              {SPORTS.filter((s) => w.minutes[s] > 0).map((s) => (
                <div key={s} className={SPORT_BG[s]} style={{ flexGrow: w.minutes[s], minHeight: 2 }} />
              ))}
            </div>

            {hover === i && (
              <div
                className={`absolute bottom-full z-10 mb-2 w-44 rounded-lg border border-line bg-surface p-3 text-xs shadow-lg ${
                  i < 2 ? 'left-0' : i > count - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}
              >
                <div className="mb-1.5 font-medium text-fg">Week van {formatShortDate(w.start)}</div>
                {SPORTS.map((s) => (
                  <div key={s} className="flex items-center justify-between gap-2 text-fg-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-medium text-fg">
                  <span>Totaal</span>
                  <span className="tabular-nums">
                    {formatDuration(w.total)}
                    {goalMinutes > 0 && <span className="font-normal text-fg-3"> / {formatDuration(goalMinutes)}</span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5 pl-8 text-[10px] text-fg-4 sm:gap-2">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 text-center">
            {(count - 1 - i) % 2 === 0 ? formatShortDate(w.start) : ''}
          </span>
        ))}
      </div>

      <details className="mt-5 text-sm">
        <summary className="cursor-pointer text-xs text-fg-3 hover:text-fg">Toon als tabel</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left text-fg-2 tabular-nums">
            <thead className="text-fg-3">
              <tr>
                <th className="py-1 font-normal">Week</th>
                {SPORTS.map((s) => (
                  <th key={s} className="py-1 font-normal">{SPORT_LABEL[s]}</th>
                ))}
                <th className="py-1 font-normal">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start} className="border-t border-line">
                  <td className="py-1">{formatShortDate(w.start)}</td>
                  {SPORTS.map((s) => (
                    <td key={s} className="py-1">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</td>
                  ))}
                  <td className="py-1 font-medium text-fg">{formatDuration(w.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
