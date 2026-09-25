import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { todayISO } from '../lib/race'
import { errorMessage, ghostButton } from '../lib/ui'
import { clearSchedule, countClearable, type ClearMode } from '../lib/usePlan'
import { Modal } from './Modal'

const MODES: { key: ClearMode; label: string; description: string }[] = [
  { key: 'plan', label: 'Alleen IRONMAN-plan', description: 'Open sessies uit het gegenereerde plan. Je eigen sessies blijven staan.' },
  { key: 'open', label: 'Alle open sessies', description: 'Alles wat je nog niet afvinkte, ook je eigen sessies.' },
  { key: 'all', label: 'Alles', description: 'Ook afgevinkte sessies. Je gelogde trainingen blijven wel bewaard.' },
]

export function ClearScheduleDialog({ onClose, onCleared }: { onClose: () => void; onCleared: (count: number) => void }) {
  const { session } = useAuth()
  const userId = session!.user.id
  const [mode, setMode] = useState<ClearMode>('plan')
  const [fromToday, setFromToday] = useState(true)
  const [counts, setCounts] = useState<Partial<Record<ClearMode, number>>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromDate = fromToday ? todayISO() : null

  // Per keuze tonen hoeveel sessies verdwijnen, zodat er geen verrassingen zijn.
  useEffect(() => {
    let stale = false
    Promise.all(MODES.map((m) => countClearable(userId, m.key, fromDate)))
      .then((values) => !stale && setCounts(Object.fromEntries(MODES.map((m, i) => [m.key, values[i]]))))
      .catch((e) => !stale && setError(errorMessage(e)))
    return () => {
      stale = true
    }
  }, [userId, fromDate])

  const selected = counts[mode]

  async function handleClear() {
    setBusy(true)
    setError(null)
    try {
      const count = await clearSchedule(userId, mode, fromDate)
      onCleared(count)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal title="Schema leegmaken" onClose={onClose}>
      <div className="space-y-2" role="radiogroup" aria-label="Wat verwijderen">
        {MODES.map((m) => {
          const active = mode === m.key
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m.key)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                active ? 'border-red-500/60 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-red-400' : 'border-zinc-500'}`}>
                {active && <span className="size-1.5 rounded-full bg-red-400" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-sm text-zinc-400 tabular-nums">{counts[m.key] ?? '…'}</span>
                </span>
                <span className="block text-xs text-zinc-400">{m.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={fromToday} onChange={(e) => setFromToday(e.target.checked)} className="size-4 accent-brand" />
        Alleen vanaf vandaag (verleden blijft staan voor je schema-trouw)
      </label>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={handleClear}
          disabled={busy || !selected}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
        >
          {busy ? 'Bezig…' : selected ? `${selected} ${selected === 1 ? 'sessie' : 'sessies'} verwijderen` : 'Niets te verwijderen'}
        </button>
        <button onClick={onClose} className={ghostButton}>
          Annuleren
        </button>
      </div>
    </Modal>
  )
}
