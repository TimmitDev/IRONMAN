import { addDays, parseISODate, sumKm, sumMinutes, weekStart } from './race'
import type { Workout } from './types'

type Item = Pick<Workout, 'date' | 'sport' | 'duration_min' | 'distance_km'>

/** Trainingen tussen twee datums (YYYY-MM-DD, inclusief). */
export const between = <T extends Item>(items: T[], from: string, to: string) => items.filter((w) => w.date >= from && w.date <= to)

/** Totalen voor de week die begint op `start` (maandag). Kilometers zonder kracht. */
export function weekSummary<T extends Item>(items: T[], start: string) {
  const week = between(items, start, addDays(start, 6))
  return {
    items: week,
    minutes: sumMinutes(week),
    sessions: week.length,
    km: sumKm(week.filter((w) => w.sport !== 'strength')),
  }
}

/**
 * Aantal weken op rij met minstens één training, tot en met deze week.
 * Is er deze week nog niets, dan telt de reeks vanaf vorige week (de week is nog niet om).
 */
export function weekStreak(items: Item[], today = new Date()) {
  const weeks = new Set(items.map((w) => weekStart(parseISODate(w.date))))
  let start = weekStart(today)
  if (!weeks.has(start)) start = addDays(start, -7)
  let n = 0
  while (weeks.has(start)) {
    n++
    start = addDays(start, -7)
  }
  return n
}

/** Minuten per week voor de laatste `count` weken (oudste eerst), inclusief deze week. */
export function weeklyMinutes(items: Item[], count: number, today = new Date()) {
  const current = weekStart(today)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(current, (i - count + 1) * 7)
    return { start, minutes: sumMinutes(between(items, start, addDays(start, 6))) }
  })
}

/** "+2", "−1", "±0": verschil als leesbare tekst, met het juiste minteken. */
export const signed = (n: number, fmt: (v: number) => string = String) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : `±${fmt(0)}`)
