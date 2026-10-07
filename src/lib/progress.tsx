import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { evaluateBadges } from './badges'
import { toast } from './feedback'
import { addDays, parseISODate, todayISO, weekStart } from './race'
import { recordHistory } from './records'
import { supabase } from './supabase'
import type { Workout } from './types'
import { useGoals } from './useGoals'
import { useWorkouts, useWorkoutsChanged } from './useWorkouts'

// --- XP ---
// Tijd × intensiteit: 1 XP per minuut, ×0,76 bij RPE 1 tot ×1,3 bij RPE 10 (zonder RPE ×1).
// Bonussen belonen wat niet in minuten zit: je schema volgen, records en badges.

export const XP_PLANNED = 25
export const XP_RECORD = 50
export const XP_BADGE = 100

export const workoutXp = (w: Pick<Workout, 'duration_min' | 'rpe'>) => Math.round(w.duration_min * (w.rpe ? 0.7 + w.rpe * 0.06 : 1))

// --- Levels ---
// Level L vraagt in totaal 50 × L × (L − 1) XP: level 2 bij 100, level 10 bij 4.500, level 20 bij 19.000.
// Ruwweg: 100 uur training ≈ level 11, een volledig IRONMAN-seizoen ≈ level 25.

export const levelStart = (level: number) => 50 * level * (level - 1)
export const levelFor = (xp: number) => Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2))

/** Titels per niveau, naar de triatlonafstanden. */
const TITLES: [number, string][] = [
  [1, 'Rookie'],
  [5, 'Sprinter'],
  [10, 'Olympiër'],
  [15, 'Halve Ironman'],
  [20, 'Ironman'],
  [30, 'Kona-legende'],
]
export const levelTitle = (level: number) => TITLES.filter(([from]) => level >= from).at(-1)![1]

// --- Streak ---
// In dagen, met ruimte voor herstel: per week (ma–zo) mag je 2 rustdagen nemen. De derde rustdag breekt de streak.
// Vandaag telt pas als rustdag als de dag om is; zolang je nog kan trainen, loopt de streak door.

export const REST_DAYS_PER_WEEK = 2

export interface Streak {
  /** Dagen sinds de eerste training van de huidige reeks, tot en met vandaag; 0 = geen reeks. */
  days: number
  best: number
  trainedToday: boolean
  /** Rustdagen die je deze week nog mag nemen zonder de reeks te breken. */
  restLeft: number
  /** Reeks loopt, je rustdagen van deze week zijn op en je trainde vandaag nog niet: zonder training vandaag breekt ze. */
  atRisk: boolean
}

export function computeStreak(dates: Iterable<string>, today = todayISO()): Streak {
  const trained = new Set(dates)
  const first = [...trained].sort()[0]
  const trainedToday = trained.has(today)
  const thisWeek = weekStart(parseISODate(today))
  /** Rustdagen deze week vanaf `from` (tot gisteren): wat vóór het begin van je reeks lag, telt niet mee. */
  const restLeftFrom = (from: string) => {
    let n = 0
    for (let d = from > thisWeek ? from : thisWeek; d < today; d = addDays(d, 1)) if (!trained.has(d)) n++
    return Math.max(0, REST_DAYS_PER_WEEK - n)
  }
  if (!first) return { days: 0, best: 0, trainedToday, restLeft: REST_DAYS_PER_WEEK, atRisk: false }

  // Huidige reeks: terug in de tijd tot een week te veel rustdagen heeft.
  const rest = new Map<string, number>()
  let start: string | null = null
  for (let d = today; d >= first; d = addDays(d, -1)) {
    if (trained.has(d)) {
      start = d
      continue
    }
    if (d === today) continue
    const wk = weekStart(parseISODate(d))
    const n = (rest.get(wk) ?? 0) + 1
    rest.set(wk, n)
    if (n > REST_DAYS_PER_WEEK) break
  }
  const span = (from: string, to: string) => Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000) + 1
  const days = start ? span(start, today) : 0

  // Langste reeks: vooruit door de tijd met dezelfde regel; een reeks eindigt op haar laatste trainingsdag.
  let best = days
  let chainStart: string | null = null
  let lastTrained: string | null = null
  const fwd = new Map<string, number>()
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (trained.has(d)) {
      chainStart ??= d
      lastTrained = d
      continue
    }
    if (!chainStart) continue
    const wk = weekStart(parseISODate(d))
    const n = (fwd.get(wk) ?? 0) + 1
    fwd.set(wk, n)
    if (n > REST_DAYS_PER_WEEK) {
      best = Math.max(best, span(chainStart, lastTrained!))
      chainStart = null
      fwd.clear()
    }
  }

  const restLeft = start ? restLeftFrom(start) : REST_DAYS_PER_WEEK
  return { days, best, trainedToday, restLeft, atRisk: days > 0 && !trainedToday && restLeft === 0 }
}

// --- Alles samen ---

export interface Progress {
  xp: number
  level: number
  title: string
  /** XP binnen het huidige level, en hoeveel dat level in totaal vraagt. */
  levelXp: number
  levelSize: number
  /** 0–1 */
  levelProgress: number
  streak: Streak
  breakdown: { training: number; planned: number; records: number; badges: number }
  loading: boolean
}

export function computeProgress(workouts: Workout[], plannedDone: number, badgesEarned: number, records: number): Omit<Progress, 'streak' | 'loading'> {
  const training = workouts.reduce((a, w) => a + workoutXp(w), 0)
  const breakdown = { training, planned: plannedDone * XP_PLANNED, records: records * XP_RECORD, badges: badgesEarned * XP_BADGE }
  const xp = breakdown.training + breakdown.planned + breakdown.records + breakdown.badges
  const level = levelFor(xp)
  const levelSize = levelStart(level + 1) - levelStart(level)
  const levelXp = xp - levelStart(level)
  return { xp, level, title: levelTitle(level), levelXp, levelSize, levelProgress: levelXp / levelSize, breakdown }
}

const ProgressContext = createContext<(Progress & { levelUp: number | null; dismissLevelUp: () => void }) | null>(null)

/** Level, XP en streak voor de hele app; meldt XP-winst en level-ups zodra er trainingen bijkomen. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { workouts, loading } = useWorkouts()
  const { goals, loading: goalsLoading } = useGoals()
  const [plannedDone, setPlannedDone] = useState<number | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)

  const loadPlanned = useCallback(() => {
    supabase
      .from('planned_workouts')
      .select('id', { count: 'exact', head: true })
      .not('workout_id', 'is', null)
      .then(({ count }) => setPlannedDone(count ?? 0))
  }, [])
  useEffect(loadPlanned, [loadPlanned])
  useWorkoutsChanged(loadPlanned)

  const ready = !loading && !goalsLoading && plannedDone !== null
  const progress = useMemo(() => {
    const badges = evaluateBadges(workouts, goals, plannedDone ?? 0).filter((b) => b.earned).length
    return { ...computeProgress(workouts, plannedDone ?? 0, badges, recordHistory(workouts).length), streak: computeStreak(workouts.map((w) => w.date)) }
  }, [workouts, goals, plannedDone])

  // Pas na de eerste volledige lading vergelijken: anders is elke paginalading een "level-up".
  const prev = useRef<{ xp: number; level: number } | null>(null)
  useEffect(() => {
    if (!ready) return
    const before = prev.current
    prev.current = { xp: progress.xp, level: progress.level }
    if (!before || progress.xp <= before.xp) return
    if (progress.level > before.level) setLevelUp(progress.level)
    else toast.success(`+${progress.xp - before.xp} XP · nog ${(progress.levelSize - progress.levelXp).toLocaleString('nl-BE')} tot level ${progress.level + 1}`)
  }, [ready, progress])

  const value = useMemo(() => ({ ...progress, loading: !ready, levelUp, dismissLevelUp: () => setLevelUp(null) }), [progress, ready, levelUp])
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress buiten ProgressProvider')
  return ctx
}
