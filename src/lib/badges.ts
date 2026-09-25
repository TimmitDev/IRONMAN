import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { RACE, addDays, todayISO, weekStart, parseISODate } from './race'
import type { Sport, Workout } from './types'
import type { Goals } from './useGoals'

interface Context {
  /** Chronologisch oplopend. */
  workouts: Workout[]
  plannedDone: number
  goals: Goals
}

interface Evaluation {
  /** Datum waarop de badge verdiend werd; null = (nog) niet, of datum onbekend bij `earned`. */
  earnedOn: string | null
  earned: boolean
  /** Voortgang 0–1 richting de badge. */
  progress: number
  progressLabel: string
}

export interface Badge {
  id: string
  emoji: string
  name: string
  description: string
  evaluate: (ctx: Context) => Evaluation
}

export type BadgeResult = Evaluation & { badge: Badge }

const km = (w: Workout) => Number(w.distance_km ?? 0)
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('nl-BE')

/** Eén sessie van `sport` met minstens `target` (km of minuten). */
function singleSession(sport: Sport | null, target: number, unit: 'km' | 'min'): Badge['evaluate'] {
  return ({ workouts }) => {
    const value = (w: Workout) => (unit === 'km' ? km(w) : w.duration_min)
    const relevant = workouts.filter((w) => !sport || w.sport === sport)
    const hit = relevant.find((w) => value(w) >= target)
    const best = Math.max(0, ...relevant.map(value))
    return {
      earned: Boolean(hit),
      earnedOn: hit?.date ?? null,
      progress: Math.min(1, best / target),
      progressLabel: unit === 'km' ? `langste: ${fmt(best)} / ${fmt(target)} km` : `langste: ${Math.round(best / 6) / 10} / ${target / 60} u`,
    }
  }
}

/** Opgeteld over alle sessies (van `sport`) minstens `target`. */
function cumulative(sport: Sport | null, target: number, unit: 'km' | 'uur'): Badge['evaluate'] {
  return ({ workouts }) => {
    let total = 0
    let earnedOn: string | null = null
    for (const w of workouts) {
      if (sport && w.sport !== sport) continue
      total += unit === 'km' ? km(w) : w.duration_min / 60
      if (!earnedOn && total >= target) earnedOn = w.date
    }
    return {
      earned: Boolean(earnedOn),
      earnedOn,
      progress: Math.min(1, total / target),
      progressLabel: `${fmt(total)} / ${target.toLocaleString('nl-BE')} ${unit}`,
    }
  }
}

/** Loopt per week door de workouts en meldt de eerste datum waarop `check` voor die week waar wordt. */
function perWeek<S>(init: () => S, add: (s: S, w: Workout) => void, check: (s: S) => boolean, score: (s: S) => number, label: (best: number) => string): Badge['evaluate'] {
  return ({ workouts }) => {
    const weeks = new Map<string, S>()
    let earnedOn: string | null = null
    let best = 0
    for (const w of workouts) {
      const key = weekStart(parseISODate(w.date))
      if (!weeks.has(key)) weeks.set(key, init())
      const s = weeks.get(key)!
      add(s, w)
      best = Math.max(best, score(s))
      if (!earnedOn && check(s)) earnedOn = w.date
    }
    return { earned: Boolean(earnedOn), earnedOn, progress: Math.min(1, best), progressLabel: label(best) }
  }
}

/** `n` weken op rij met minstens `minSessions` trainingen. */
function weekStreak(n: number, minSessions: number): Badge['evaluate'] {
  return ({ workouts }) => {
    if (!workouts.length) return { earned: false, earnedOn: null, progress: 0, progressLabel: `0 / ${n} weken` }
    const counts = new Map<string, number>()
    for (const w of workouts) {
      const key = weekStart(parseISODate(w.date))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const current = weekStart(new Date())
    let run = 0
    let best = 0
    let earnedOn: string | null = null
    for (let week = weekStart(parseISODate(workouts[0].date)); week <= current; week = addDays(week, 7)) {
      const ok = (counts.get(week) ?? 0) >= minSessions
      // De lopende week breekt een reeks niet zolang ze nog niet voorbij is.
      if (!ok && week === current) break
      run = ok ? run + 1 : 0
      best = Math.max(best, run)
      if (!earnedOn && run >= n) earnedOn = week === current ? todayISO() : addDays(week, 6)
    }
    return { earned: Boolean(earnedOn), earnedOn, progress: Math.min(1, best / n), progressLabel: `beste reeks: ${best} / ${n} weken` }
  }
}

export const BADGES: Badge[] = [
  {
    id: 'first',
    emoji: '👟',
    name: 'Eerste stap',
    description: 'Je eerste training gelogd.',
    evaluate: ({ workouts }) => ({ earned: workouts.length > 0, earnedOn: workouts[0]?.date ?? null, progress: workouts.length ? 1 : 0, progressLabel: '' }),
  },
  {
    id: 'brick',
    emoji: '🧱',
    name: 'Brick',
    description: 'Fietsen en lopen op dezelfde dag.',
    evaluate: ({ workouts }) => {
      const days = new Map<string, Set<Sport>>()
      for (const w of workouts) {
        const set = days.get(w.date) ?? new Set<Sport>()
        set.add(w.sport)
        days.set(w.date, set)
        if (set.has('bike') && set.has('run')) return { earned: true, earnedOn: w.date, progress: 1, progressLabel: '' }
      }
      return { earned: false, earnedOn: null, progress: 0, progressLabel: 'fiets + loop op één dag' }
    },
  },
  {
    id: 'triathlete',
    emoji: '🔱',
    name: 'Triatleet',
    description: 'Zwemmen, fietsen én lopen in één week.',
    evaluate: perWeek(
      () => new Set<Sport>(),
      (s, w) => w.sport !== 'strength' && s.add(w.sport),
      (s) => s.size >= 3,
      (s) => s.size / 3,
      (best) => `${Math.round(best * 3)} / 3 disciplines in één week`,
    ),
  },
  { id: 'swim38', emoji: '🐟', name: 'Waterrat', description: '3,8 km zwemmen in één sessie.', evaluate: singleSession('swim', RACE.distances.swim, 'km') },
  { id: 'bike100', emoji: '🚴', name: 'Century', description: '100 km fietsen in één rit.', evaluate: singleSession('bike', 100, 'km') },
  { id: 'bike180', emoji: '🛣️', name: 'Volle 180', description: '180 km fietsen in één rit.', evaluate: singleSession('bike', RACE.distances.bike, 'km') },
  { id: 'run21', emoji: '🏃', name: 'Halve marathon', description: '21,1 km lopen in één sessie.', evaluate: singleSession('run', 21.1, 'km') },
  { id: 'run42', emoji: '🏅', name: 'Marathon', description: '42,2 km lopen in één sessie.', evaluate: singleSession('run', RACE.distances.run, 'km') },
  { id: 'long4h', emoji: '⏱️', name: 'Lange adem', description: 'Een training van 4 uur of langer.', evaluate: singleSession(null, 240, 'min') },
  { id: 'hours100', emoji: '💯', name: '100 uur', description: '100 trainingsuren in totaal.', evaluate: cumulative(null, 100, 'uur') },
  { id: 'swimTotal', emoji: '🌊', name: 'Kanaalzwemmer', description: '50 km zwemmen in totaal.', evaluate: cumulative('swim', 50, 'km') },
  { id: 'bikeTotal', emoji: '🌍', name: 'Wereldfietser', description: '2.500 km fietsen in totaal.', evaluate: cumulative('bike', 2500, 'km') },
  { id: 'runTotal', emoji: '🦵', name: 'Kilometervreter', description: '500 km lopen in totaal.', evaluate: cumulative('run', 500, 'km') },
  { id: 'streak4', emoji: '🔥', name: 'Op dreef', description: '4 weken op rij minstens 3 trainingen.', evaluate: weekStreak(4, 3) },
  { id: 'streak12', emoji: '⚙️', name: 'Machine', description: '12 weken op rij minstens 3 trainingen.', evaluate: weekStreak(12, 3) },
  {
    id: 'imweek',
    emoji: '🦾',
    name: 'IRONMAN-week',
    description: 'De volledige IRONMAN-afstand (3,8 + 180 + 42,2 km) in één week.',
    evaluate: perWeek(
      () => ({ swim: 0, bike: 0, run: 0 }),
      (s, w) => {
        if (w.sport !== 'strength') s[w.sport] += km(w)
      },
      (s) => s.swim >= RACE.distances.swim && s.bike >= RACE.distances.bike && s.run >= RACE.distances.run,
      (s) => (Math.min(1, s.swim / RACE.distances.swim) + Math.min(1, s.bike / RACE.distances.bike) + Math.min(1, s.run / RACE.distances.run)) / 3,
      (best) => `beste week: ${Math.round(best * 100)}% van de afstand`,
    ),
  },
  {
    id: 'goals',
    emoji: '🎯',
    name: 'Doelgericht',
    description: 'Al je weekdoelen (uren) gehaald in één week.',
    evaluate: (ctx) => {
      const targets = Object.values(ctx.goals).filter((g) => g && g.minutes > 0)
      if (!targets.length) return { earned: false, earnedOn: null, progress: 0, progressLabel: 'stel eerst weekdoelen in' }
      return perWeek(
        () => ({ swim: 0, bike: 0, run: 0, strength: 0 }) as Record<Sport, number>,
        (s, w) => {
          s[w.sport] += w.duration_min
        },
        (s) => targets.every((g) => s[g!.sport] >= g!.minutes),
        (s) => Math.min(...targets.map((g) => Math.min(1, s[g!.sport] / g!.minutes))),
        (best) => `beste week: ${Math.round(best * 100)}% van je zwakste doel`,
      )(ctx)
    },
  },
  {
    id: 'plan25',
    emoji: '📋',
    name: 'Schema-held',
    description: '25 geplande sessies afgevinkt.',
    evaluate: ({ plannedDone }) => ({
      earned: plannedDone >= 25,
      earnedOn: null,
      progress: Math.min(1, plannedDone / 25),
      progressLabel: `${plannedDone} / 25 afgevinkt`,
    }),
  },
]

export function evaluateBadges(workouts: Workout[], goals: Goals, plannedDone: number): BadgeResult[] {
  const ctx: Context = {
    workouts: [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)),
    goals,
    plannedDone,
  }
  return BADGES.map((badge) => ({ badge, ...badge.evaluate(ctx) }))
}

export function useBadges(workouts: Workout[], goals: Goals) {
  const [plannedDone, setPlannedDone] = useState(0)

  useEffect(() => {
    supabase
      .from('planned_workouts')
      .select('id', { count: 'exact', head: true })
      .not('workout_id', 'is', null)
      .then(({ count }) => setPlannedDone(count ?? 0))
  }, [])

  return useMemo(() => evaluateBadges(workouts, goals, plannedDone), [workouts, goals, plannedDone])
}
