import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { todayISO } from '../lib/race'
import { dangerButton, errorMessage, secondaryButton } from '../lib/ui'
import { clearSchedule, countClearable, type ClearMode } from '../lib/usePlan'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { Switch } from './Switch'

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
    <Modal title="Schema leegmaken" description="Kies welke geplande sessies uit je schema verdwijnen." onClose={onClose}>
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
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none ${
                active ? 'border-danger/50 bg-danger/10' : 'border-line hover:bg-hover'
              }`}
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-danger' : 'border-line-strong'}`}
              >
                {active && <span className="size-1.5 rounded-full bg-danger" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">{m.label}</span>
                  <span className="text-sm font-semibold text-fg-2 tabular-nums">{counts[m.key] ?? '…'}</span>
                </span>
                <span className="mt-0.5 block text-xs text-fg-3">{m.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Switch checked={fromToday} onChange={setFromToday} label="Alleen vanaf vandaag" description="Het verleden blijft staan voor je schema-trouw." />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={handleClear} disabled={busy || !selected} className={dangerButton}>
          {!busy && selected ? <Icon name="trash" className="size-4" /> : null}
          {busy ? 'Bezig…' : selected ? `${selected} ${selected === 1 ? 'sessie' : 'sessies'} verwijderen` : 'Niets te verwijderen'}
        </button>
        <button onClick={onClose} className={secondaryButton}>
          Annuleren
        </button>
      </div>
    </Modal>
  )
}
