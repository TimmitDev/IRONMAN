import { useMemo, useState } from 'react'
import { addDays, formatDuration, formatShortDate, parseISODate, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport, type Workout } from '../lib/types'

interface Week {
  start: string
  minutes: Record<Sport, number>
  total: number
}

function buildWeeks(workouts: Workout[], count: number): Week[] {
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
  workouts: Workout[]
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
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
        {SPORTS.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${SPORT_BG[s]}`} />
            {SPORT_LABEL[s]}
          </span>
        ))}
        {goalH > 0 && (
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className="w-4 border-t-2 border-dashed border-zinc-300" />
            Weekdoel
          </span>
        )}
      </div>

      <div className="relative flex h-60 gap-1.5 pl-8 sm:gap-2">
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute right-0 left-8 border-t border-zinc-800"
            style={{ bottom: `${(t / maxH) * 100}%` }}
          >
            <span className="absolute -top-2 -left-8 w-6 text-right text-xs text-zinc-500 tabular-nums">{t}u</span>
          </div>
        ))}

        {goalH > 0 && (
          <div
            className="pointer-events-none absolute right-0 left-8 z-[5] border-t-2 border-dashed border-zinc-300/70"
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
              className={`flex flex-col-reverse gap-[2px] overflow-hidden rounded-t transition-opacity ${
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
                className={`absolute bottom-full z-10 mb-2 w-44 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-2xl ${
                  i < 2 ? 'left-0' : i > count - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}
              >
                <div className="mb-1.5 font-semibold text-white">Week van {formatShortDate(w.start)}</div>
                {SPORTS.map((s) => (
                  <div key={s} className="flex items-center justify-between gap-2 text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex justify-between border-t border-zinc-700 pt-1.5 font-semibold text-white">
                  <span>Totaal</span>
                  <span className="tabular-nums">
                    {formatDuration(w.total)}
                    {goalMinutes > 0 && <span className="font-normal text-zinc-400"> / {formatDuration(goalMinutes)}</span>}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex gap-1.5 pl-8 text-[10px] text-zinc-500 sm:gap-2">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 text-center">
            {(count - 1 - i) % 2 === 0 ? formatShortDate(w.start) : ''}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">Toon als tabel</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-left tabular-nums">
            <thead className="text-zinc-500">
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
                <tr key={w.start} className="border-t border-zinc-800">
                  <td className="py-1">{formatShortDate(w.start)}</td>
                  {SPORTS.map((s) => (
                    <td key={s} className="py-1">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</td>
                  ))}
                  <td className="py-1 font-medium">{formatDuration(w.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
