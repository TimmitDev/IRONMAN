import { useState, type FormEvent } from 'react'
import { BadgesGrid } from '../components/Badges'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { useBadges } from '../lib/badges'
import { useWorkouts } from '../lib/useWorkouts'
import { currentPhase, formatDuration, formatShortDate, phaseHours, sumMinutes, weekStart } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { weekSummary, weeklyMinutes } from '../lib/stats'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport, type Workout } from '../lib/types'
import { errorMessage, eyebrowClass, inputClass, primaryButton } from '../lib/ui'
import { useGoals, type Goals as GoalMap } from '../lib/useGoals'

export function Goals() {
  const { goals, totalMinutes, loading, error, save } = useGoals()
  const { workouts } = useWorkouts()
  const badges = useBadges(workouts, goals)

  return (
    <div>
      <PageHeader title="Doelen" description="Stel per sport in hoeveel je per week wil trainen. Je dashboard en weekrapport meten je voortgang hieraan." />
      <div className="space-y-6 sm:space-y-8">
        {/* Links instellen, rechts zien hoe je ervoor staat. Op mobiel onder elkaar. */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <Card title="Weekdoelen per sport" description="Uren en kilometers per week. Laat leeg als je voor een sport geen doel wil.">
              {error && <p className="mb-3 text-sm text-danger">{error}</p>}
              {loading ? <p className="text-sm text-fg-3">Laden…</p> : <GoalsForm initial={goals} onSave={save} />}
            </Card>
            <GoalHistory workouts={workouts} goalMinutes={totalMinutes} />
          </div>
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <ThisWeek workouts={workouts} goals={goals} />
            <PhaseHint />
          </div>
        </div>
        <BadgesGrid results={badges} />
      </div>
    </div>
  )
}

/** Voortgang deze week per sport tegenover het (opgeslagen) doel. */
function ThisWeek({ workouts, goals }: { workouts: Workout[]; goals: GoalMap }) {
  const week = weekSummary(workouts, weekStart(new Date())).items
  const withGoal = SPORTS.filter((s) => goals[s]?.minutes)

  return (
    <Card title="Deze week" description="Hoe ver je al staat tegenover je doelen.">
      {withGoal.length ? (
        <ul className="space-y-4">
          {withGoal.map((s) => {
            const done = sumMinutes(week.filter((w) => w.sport === s))
            const goal = goals[s]!.minutes
            return (
              <li key={s}>
                <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-fg-2">
                    <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} aria-hidden />
                    {SPORT_LABEL[s]}
                  </span>
                  <span className="text-fg-3 tabular-nums">
                    <span className="text-fg">{done ? formatDuration(done) : '0'}</span> / {formatDuration(goal)}
                  </span>
                </div>
                <ProgressBar value={done} max={goal} color={SPORT_BG[s]} />
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-fg-3">Stel links een doel in; dan zie je hier je voortgang.</p>
      )}
    </Card>
  )
}

/** Laatste 8 weken: totale trainingstijd per week tegenover je huidige weekdoel. */
function GoalHistory({ workouts, goalMinutes }: { workouts: Workout[]; goalMinutes: number }) {
  const weeks = weeklyMinutes(workouts, 8)
  const max = Math.max(goalMinutes, ...weeks.map((w) => w.minutes), 60)
  const hit = goalMinutes ? weeks.slice(0, -1).filter((w) => w.minutes >= goalMinutes).length : 0

  return (
    <Card
      title="Laatste 8 weken"
      description={goalMinutes ? `Doel gehaald in ${hit} van de 7 afgeronde weken.` : 'Je trainingstijd per week. Met een doel zie je hier ook of je het haalde.'}
    >
      <div className="relative flex h-32 items-end gap-2 sm:gap-3">
        {goalMinutes > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fg-3" style={{ bottom: `${(goalMinutes / max) * 100}%` }}>
            <span className="absolute -top-5 right-0 text-[11px] text-fg-3 tabular-nums">doel {formatDuration(goalMinutes)}</span>
          </div>
        )}
        {weeks.map((w, i) => {
          const current = i === weeks.length - 1
          const reached = goalMinutes > 0 && w.minutes >= goalMinutes
          return (
            <div key={w.start} className="flex h-full flex-1 flex-col justify-end" title={`Week van ${formatShortDate(w.start)}: ${formatDuration(w.minutes)}`}>
              <div
                className={`min-h-px rounded-t-[3px] ${current ? 'bg-fg' : reached ? 'bg-fg-2' : 'bg-line-strong'}`}
                style={{ height: `${(w.minutes / max) * 100}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-fg-4 sm:gap-3">
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 truncate text-center tabular-nums">
            {i === weeks.length - 1 ? 'nu' : formatShortDate(w.start)}
          </span>
        ))}
      </div>
    </Card>
  )
}

function PhaseHint() {
  const race = useRace()
  const phase = currentPhase(race)
  const [min, max] = phaseHours(phase, race)
  return (
    <Card>
      <p className={eyebrowClass}>Richtlijn · fase {phase.name}</p>
      <p className="mt-2 text-3xl font-light tracking-tight text-fg tabular-nums">
        {min}–{max} <span className="text-sm font-normal text-fg-3">uur per week</span>
      </p>
      <p className="mt-2 text-sm text-fg-3">{phase.description}</p>
      <p className="mt-5 border-t border-line pt-4 text-sm text-fg-2">
        Typische verdeling: ±15% zwemmen, ±50% fietsen, ±30% lopen, rest kracht.
      </p>
    </Card>
  )
}

type FormState = Record<Sport, { hours: string; km: string }>

function GoalsForm({ initial, onSave }: { initial: GoalMap; onSave: (g: { sport: Sport; minutes: number; distance_km: number | null }[]) => Promise<void> }) {
  const [form, setForm] = useState<FormState>(() =>
    Object.fromEntries(
      SPORTS.map((s) => [
        s,
        {
          hours: initial[s]?.minutes ? String(Math.round((initial[s]!.minutes / 60) * 100) / 100) : '',
          km: initial[s]?.distance_km ? String(initial[s]!.distance_km) : '',
        },
      ]),
    ) as FormState,
  )
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const totalMinutes = SPORTS.reduce((a, s) => a + Math.round(Number(form[s].hours || 0) * 60), 0)
  const set = (s: Sport, field: 'hours' | 'km', value: string) => setForm((f) => ({ ...f, [s]: { ...f[s], [field]: value } }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      await onSave(
        SPORTS.map((s) => ({
          sport: s,
          minutes: Math.round(Number(form[s].hours || 0) * 60),
          distance_km: form[s].km ? Number(form[s].km) : null,
        })),
      )
      setStatus({ type: 'ok', text: 'Doelen opgeslagen.' })
    } catch (err) {
      setStatus({ type: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Kolomkoppen één keer bovenaan (vanaf sm); op mobiel staat het label bij elk veld. */}
      <div className="hidden grid-cols-[1fr_8rem_8rem] gap-4 pb-2 text-xs font-medium text-fg-3 sm:grid">
        <span>Sport</span>
        <span>Uren / week</span>
        <span>Km / week</span>
      </div>
      <div className="divide-y divide-line border-y border-line sm:border-t-0">
        {SPORTS.map((s) => (
          <div key={s} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[1fr_8rem_8rem] sm:gap-4">
            <span className="col-span-2 inline-flex items-center gap-2.5 text-sm font-medium text-fg sm:col-span-1">
              <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} aria-hidden />
              {SPORT_LABEL[s]}
            </span>
            <label className="min-w-0">
              <span className="mb-1 block text-xs text-fg-3 sm:sr-only">Uren / week</span>
              <input
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                className={inputClass}
                value={form[s].hours}
                onChange={(e) => set(s, 'hours', e.target.value)}
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs text-fg-3 sm:sr-only">Km / week</span>
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                className={inputClass}
                value={form[s].km}
                onChange={(e) => set(s, 'km', e.target.value)}
                disabled={s === 'strength'}
                placeholder={s === 'strength' ? '–' : ''}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? 'Opslaan…' : 'Doelen opslaan'}
          </button>
          {status && <span className={`text-sm ${status.type === 'ok' ? 'text-success' : 'text-danger'}`}>{status.text}</span>}
        </div>
        <span className="text-sm text-fg-3">
          Totaal: <span className="font-medium text-fg tabular-nums">{formatDuration(totalMinutes)}</span> per week
        </span>
      </div>
    </form>
  )
}
