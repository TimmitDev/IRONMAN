import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import type { BadgeResult } from '../lib/badges'
import { useLeaderboard } from '../lib/leaderboard'
import { addDays, currentPhase, daysUntilRace, formatDuration, formatPace, formatSessionDuration, formatShortDate, parseISODate, sumKm, sumMinutes } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Workout } from '../lib/types'
import type { Goals } from '../lib/useGoals'
import { usePlan } from '../lib/usePlan'
import { ProgressBar } from './ProgressBar'

function headline(goalPct: number | null, delta: number | null, total: number): [string, string] {
  if (total === 0) return ['Rustweek', 'Geen trainingen gelogd. Soms is rust precies wat je lichaam nodig heeft.']
  if (goalPct !== null) {
    if (goalPct >= 1.1) return ['Monsterweek! 💪', `${Math.round(goalPct * 100)}% van je weekdoel. Denk ook aan herstel.`]
    if (goalPct >= 0.95) return ['Doel gehaald! ✅', `${Math.round(goalPct * 100)}% van je weekdoel. Precies op koers.`]
    if (goalPct >= 0.75) return ['Goede week 👍', `${Math.round(goalPct * 100)}% van je weekdoel. Net niet, maar solide.`]
    if (goalPct >= 0.4) return ['Rustige week', `${Math.round(goalPct * 100)}% van je weekdoel.`]
    return ['Herstelweek?', `${Math.round(goalPct * 100)}% van je weekdoel. Volgende week weer aanvallen.`]
  }
  if (delta !== null && delta >= 0.1) return ['Stijgende lijn 📈', `${Math.round(delta * 100)}% meer dan vorige week.`]
  return ['Week afgerond', 'Stel weekdoelen in voor een scherper rapport.']
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-950/50 p-4">
      <h3 className="mb-3 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">{title}</h3>
      {children}
    </div>
  )
}

export function WeekReport({
  start,
  workouts,
  goals,
  goalMinutes,
  badges,
  onClose,
}: {
  start: string
  workouts: Workout[]
  goals: Goals
  goalMinutes: number
  badges: BadgeResult[]
  onClose?: () => void
}) {
  const { session } = useAuth()
  const end = addDays(start, 6)
  const nextStart = addDays(start, 7)
  const plan = usePlan(start)
  const next = usePlan(nextStart)
  const lb = useLeaderboard(start, end, null)

  const inRange = (w: Workout, from: string, to: string) => w.date >= from && w.date <= to
  const week = workouts.filter((w) => inRange(w, start, end))
  const prev = workouts.filter((w) => inRange(w, addDays(start, -7), addDays(start, -1)))
  const total = sumMinutes(week)
  const prevTotal = sumMinutes(prev)
  const goalPct = goalMinutes ? total / goalMinutes : null
  const delta = prevTotal ? (total - prevTotal) / prevTotal : null
  const [title, subtitle] = headline(goalPct, delta, total)

  const longest = [...week].sort((a, b) => b.duration_min - a.duration_min)[0]
  const missed = plan.planned.filter((p) => !p.workout_id)
  const doneCount = plan.planned.length - missed.length
  const newBadges = badges.filter((b) => b.earnedOn && b.earnedOn >= start && b.earnedOn <= end)

  const ranking = [...lb.rows].sort((a, b) => b.total_min - a.total_min)
  const myRank = ranking.findIndex((r) => r.user_id === session!.user.id)
  let rivalry: string | null = null
  if (ranking.length >= 2 && myRank >= 0) {
    if (myRank === 0) {
      const gap = ranking[0].total_min - ranking[1].total_min
      rivalry = gap > 0 ? `🏆 Je won de week, ${formatDuration(gap)} voor op ${ranking[1].display_name}.` : `🤝 Gelijkspel met ${ranking[1].display_name}!`
    } else {
      const gap = ranking[0].total_min - ranking[myRank].total_min
      rivalry = `${ranking[0].display_name} won de week, ${formatDuration(gap)} meer dan jij. Revanche volgende week?`
    }
  }

  const phaseNow = currentPhase(parseISODate(end))
  const phaseNext = currentPhase(parseISODate(addDays(nextStart, 6)))
  const nextTotal = sumMinutes(next.planned)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-zinc-900/80 to-zinc-900/80 p-5 lg:col-span-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand uppercase">
            Weekrapport · {formatShortDate(start)} – {formatShortDate(end)}
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-1 text-zinc-300">{subtitle}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Sluiten">
            ×
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Totaal" value={formatDuration(total)} sub={goalMinutes ? `doel ${formatDuration(goalMinutes)}` : undefined} />
        <Stat
          label="Vs. vorige week"
          value={delta === null ? '–' : `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`}
          sub={prevTotal ? formatDuration(prevTotal) : 'geen data'}
        />
        <Stat label="Sessies" value={String(week.length)} sub={`${new Set(week.map((w) => w.date)).size} actieve dagen`} />
        <Stat label="Schema" value={plan.planned.length ? `${doneCount}/${plan.planned.length}` : '–'} sub="sessies afgevinkt" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Section title="Per sport">
          <div className="space-y-3">
            {SPORTS.map((s) => {
              const items = week.filter((w) => w.sport === s)
              const min = sumMinutes(items)
              const goal = goals[s]?.minutes ?? 0
              const dist = sumKm(items)
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-zinc-300">{SPORT_LABEL[s]}</span>
                    <span className="text-zinc-400 tabular-nums">
                      <span className="font-semibold text-white">{min ? formatDuration(min) : '0'}</span>
                      {goal ? ` / ${formatDuration(goal)}` : ''}
                      {dist ? ` · ${dist} km` : ''}
                    </span>
                  </div>
                  <ProgressBar value={min} max={goal || min} color={SPORT_BG[s]} />
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Hoogtepunten">
          <ul className="space-y-2.5 text-sm">
            {longest && (
              <li>
                <span className="text-zinc-400">Langste sessie:</span>{' '}
                <span className="font-semibold text-white">
                  {SPORT_LABEL[longest.sport]} {formatSessionDuration(longest.duration_min)}
                  {longest.distance_km
                    ? ` (${[`${longest.distance_km} km`, formatPace(longest.sport, longest.duration_min, longest.distance_km)].filter(Boolean).join(' · ')})`
                    : ''}
                </span>
              </li>
            )}
            {newBadges.length > 0 ? (
              <li>
                <span className="text-zinc-400">Nieuwe badges:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {newBadges.map((b) => (
                    <span key={b.badge.id} className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                      {b.badge.emoji} {b.badge.name}
                    </span>
                  ))}
                </div>
              </li>
            ) : (
              <li className="text-zinc-500">Geen nieuwe badges deze week.</li>
            )}
            {missed.length > 0 && (
              <li>
                <span className="text-zinc-400">Gemist:</span>{' '}
                <span className="text-zinc-300">
                  {missed
                    .slice(0, 3)
                    .map((p) => p.title || SPORT_LABEL[p.sport])
                    .join(', ')}
                  {missed.length > 3 ? ` +${missed.length - 3}` : ''}
                </span>
              </li>
            )}
            {rivalry && <li className="font-medium text-white">{rivalry}</li>}
          </ul>
        </Section>

        <Section title="Volgende week">
          <p className="text-2xl font-black">
            {nextTotal ? formatDuration(nextTotal) : '–'}
            <span className="ml-1 text-sm font-semibold text-zinc-400">gepland</span>
          </p>
          <p className="text-sm text-zinc-400">
            {next.planned.length ? `${next.planned.length} sessies ingepland` : 'Nog niets ingepland. Plan je week!'}
          </p>
          {phaseNext !== phaseNow && (
            <p className="mt-3 rounded-lg bg-brand/15 px-3 py-2 text-sm font-medium text-white">
              Nieuwe fase: <span className="font-bold">{phaseNext.name}</span>. {phaseNext.description}
            </p>
          )}
          <p className="mt-3 text-sm text-zinc-400">
            Nog <span className="font-semibold text-white">{daysUntilRace()}</span> dagen tot race-dag.
          </p>
        </Section>
      </div>
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">{label}</p>
      <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}
