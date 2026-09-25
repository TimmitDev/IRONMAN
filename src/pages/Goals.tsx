import { useState, type FormEvent } from 'react'
import { BadgesGrid } from '../components/Badges'
import { Card } from '../components/Card'
import { useBadges } from '../lib/badges'
import { useWorkouts } from '../lib/useWorkouts'
import { currentPhase, formatDuration } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton } from '../lib/ui'
import { useGoals, type Goals as GoalMap } from '../lib/useGoals'

export function Goals() {
  const { goals, loading, error, save } = useGoals()
  const { workouts } = useWorkouts()
  const badges = useBadges(workouts, goals)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PhaseHint />
      <Card title="Weekdoelen per sport">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {loading ? <p className="text-sm text-zinc-500">Laden…</p> : <GoalsForm initial={goals} onSave={save} />}
      </Card>
      <BadgesGrid results={badges} />
    </div>
  )
}

function PhaseHint() {
  const phase = currentPhase()
  const [min, max] = phase.hoursHint
  return (
    <Card>
      <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Richtlijn · {phase.name}</p>
      <p className="mt-2 text-3xl font-black">
        {min}–{max} <span className="text-lg font-semibold text-zinc-400">uur per week</span>
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {phase.description} Typische verdeling: ±15% zwemmen, ±50% fietsen, ±30% lopen, rest kracht.
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {SPORTS.map((s) => (
        <div key={s} className="grid grid-cols-[1fr_6rem_6rem] items-end gap-3 sm:grid-cols-[1fr_8rem_8rem]">
          <span className="inline-flex items-center gap-2 pb-2 font-medium">
            <span className={`h-5 w-1 rounded-full ${SPORT_BG[s]}`} />
            {SPORT_LABEL[s]}
          </span>
          <label>
            <span className={labelClass}>Uren / week</span>
            <input type="number" min="0" step="0.25" inputMode="decimal" className={inputClass} value={form[s].hours} onChange={(e) => set(s, 'hours', e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Km / week</span>
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

      <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : 'Doelen opslaan'}
        </button>
        <span className="text-sm text-zinc-400">
          Totaal: <span className="font-semibold text-white">{formatDuration(totalMinutes)}</span> per week
        </span>
        {status && <span className={`text-sm ${status.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{status.text}</span>}
      </div>
    </form>
  )
}
