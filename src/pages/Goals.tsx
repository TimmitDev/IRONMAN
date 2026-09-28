import { useState, type FormEvent } from 'react'
import { BadgesGrid } from '../components/Badges'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useBadges } from '../lib/badges'
import { useWorkouts } from '../lib/useWorkouts'
import { currentPhase, formatDuration, phaseHours } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { errorMessage, eyebrowClass, inputClass, primaryButton } from '../lib/ui'
import { useGoals, type Goals as GoalMap } from '../lib/useGoals'

export function Goals() {
  const { goals, loading, error, save } = useGoals()
  const { workouts } = useWorkouts()
  const badges = useBadges(workouts, goals)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Doelen" description="Stel per sport in hoeveel je per week wil trainen. Je dashboard en weekrapport meten je voortgang hieraan." />
      <div className="space-y-6">
        <PhaseHint />
        <Card title="Weekdoelen per sport" description="Uren en kilometers per week. Laat leeg als je voor een sport geen doel wil.">
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          {loading ? <p className="text-sm text-fg-3">Laden…</p> : <GoalsForm initial={goals} onSave={save} />}
        </Card>
        <BadgesGrid results={badges} />
      </div>
    </div>
  )
}

function PhaseHint() {
  const race = useRace()
  const phase = currentPhase(race)
  const [min, max] = phaseHours(phase, race)
  return (
    <Card>
      <p className={eyebrowClass}>Richtlijn · fase {phase.name}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-fg tabular-nums">
        {min}–{max} <span className="text-base font-medium text-fg-3">uur per week</span>
      </p>
      <p className="mt-2 text-sm text-fg-3">{phase.description}</p>
      <p className="mt-3 rounded-xl bg-subtle px-3 py-2.5 text-sm text-fg-2">
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
            <span className="col-span-2 inline-flex items-center gap-2.5 font-medium text-fg sm:col-span-1">
              <span className={`h-5 w-1 rounded-full ${SPORT_BG[s]}`} />
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
          Totaal: <span className="font-semibold text-fg tabular-nums">{formatDuration(totalMinutes)}</span> per week
        </span>
      </div>
    </form>
  )
}
