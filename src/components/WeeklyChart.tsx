import { useMemo, useState } from 'react'
import { parseISODate, toISODate, weekStart, formatDuration } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport, type Workout } from '../lib/types'

interface Week {
  start: string
  minutes: Record<Sport, number>
  total: number
}

function buildWeeks(workouts: Workout[], count: number): Week[] {
  const weeks: Week[] = []
  const monday = parseISODate(weekStart(new Date()))
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(d.getDate() - i * 7)
    weeks.push({ start: toISODate(d), minutes: { swim: 0, bike: 0, run: 0, strength: 0 }, total: 0 })
  }
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

const fmtWeek = (iso: string) =>
  parseISODate(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })

export function WeeklyChart({ workouts, weeks: count = 12 }: { workouts: Workout[]; weeks?: number }) {
  const weeks = useMemo(() => buildWeeks(workouts, count), [workouts, count])
  const [hover, setHover] = useState<number | null>(null)
  const maxH = niceMax(Math.max(...weeks.map((w) => w.total / 60)))
  const ticks = [0, maxH / 2, maxH]

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
        {SPORTS.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${SPORT_BG[s]}`} />
            {SPORT_LABEL[s]}
          </span>
        ))}
      </div>

      <div className="relative flex h-56 gap-2 pl-8">
        {/* Gridlines + y-as */}
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute right-0 left-8 border-t border-stone-200 dark:border-stone-800"
            style={{ bottom: `${(t / maxH) * 100}%` }}
          >
            <span className="absolute -top-2 -left-8 w-6 text-right text-xs tabular-nums text-stone-400">{t}u</span>
          </div>
        ))}

        {weeks.map((w, i) => (
          <div
            key={w.start}
            className="relative flex flex-1 cursor-default flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className={`flex flex-col-reverse gap-[2px] overflow-hidden rounded-t transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
              style={{ height: `${(w.total / 60 / maxH) * 100}%` }}
            >
              {SPORTS.filter((s) => w.minutes[s] > 0).map((s) => (
                <div key={s} className={SPORT_BG[s]} style={{ flexGrow: w.minutes[s], minHeight: 2 }} />
              ))}
            </div>

            {hover === i && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-2.5 text-xs shadow-lg dark:border-stone-700 dark:bg-stone-900">
                <div className="mb-1 font-medium">Week van {fmtWeek(w.start)}</div>
                {SPORTS.map((s) => (
                  <div key={s} className="flex items-center justify-between gap-2 text-stone-600 dark:text-stone-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-medium dark:border-stone-700">
                  <span>Totaal</span>
                  <span className="tabular-nums">{formatDuration(w.total)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex gap-2 pl-8 text-[10px] text-stone-400">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 text-center">
            {i % 2 === count % 2 ? '' : fmtWeek(w.start)}
          </span>
        ))}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-stone-500">Toon als tabel</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-stone-500">
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
              <tr key={w.start} className="border-t border-stone-200 dark:border-stone-800">
                <td className="py-1">{fmtWeek(w.start)}</td>
                {SPORTS.map((s) => (
                  <td key={s} className="py-1">{w.minutes[s] ? formatDuration(w.minutes[s]) : '–'}</td>
                ))}
                <td className="py-1 font-medium">{formatDuration(w.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
