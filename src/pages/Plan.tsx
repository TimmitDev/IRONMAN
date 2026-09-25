import { useState } from 'react'
import { Card } from '../components/Card'
import { DoneToggle } from '../components/DoneToggle'
import { PlanForm } from '../components/PlanForm'
import { ProgressBar } from '../components/ProgressBar'
import { addDays, formatDuration, formatSessionDuration, formatShortDate, parseISODate, sumMinutes, todayISO, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type PlannedWorkout } from '../lib/types'
import { errorMessage, ghostButton } from '../lib/ui'
import { usePlan } from '../lib/usePlan'

export function Plan() {
  const [start, setStart] = useState(() => weekStart(new Date()))
  const { planned, done, loading, error, add, remove, toggle, copyPreviousWeek } = usePlan(start)
  const [addDate, setAddDate] = useState<string | null>(null)

  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const linked = new Set(planned.map((p) => p.workout_id))
  const extras = done.filter((w) => !linked.has(w.id))
  const isCurrentWeek = start === weekStart(new Date())

  const run = (fn: () => Promise<unknown>) => fn().catch((e) => alert(errorMessage(e)))

  async function handleCopy() {
    if (planned.length && !confirm('Deze week heeft al sessies. Toch de vorige week erbij kopiëren?')) return
    const count = await copyPreviousWeek()
    if (count === 0) alert('Vorige week had geen geplande sessies.')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-white/5 bg-zinc-900/70">
          <button onClick={() => setStart(addDays(start, -7))} className="px-3 py-2 text-zinc-400 hover:text-white" aria-label="Vorige week">
            ‹
          </button>
          <span className="min-w-40 text-center text-sm font-semibold">
            {formatShortDate(start)} – {formatShortDate(addDays(start, 6))}
          </span>
          <button onClick={() => setStart(addDays(start, 7))} className="px-3 py-2 text-zinc-400 hover:text-white" aria-label="Volgende week">
            ›
          </button>
        </div>
        {!isCurrentWeek && (
          <button onClick={() => setStart(weekStart(new Date()))} className={ghostButton}>
            Deze week
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => run(handleCopy)} className={ghostButton}>
            Vorige week kopiëren
          </button>
          <button
            onClick={() => setAddDate(start <= today && today <= days[6] ? today : start)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
          >
            + Sessie plannen
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {addDate && (
        <Card title="Sessie plannen">
          <PlanForm key={addDate} defaultDate={addDate} onSubmit={add} onCancel={() => setAddDate(null)} />
        </Card>
      )}

      <Card title="Gepland vs. gedaan">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {SPORTS.map((s) => {
            const plannedMin = sumMinutes(planned.filter((p) => p.sport === s))
            const doneMin = sumMinutes(done.filter((w) => w.sport === s))
            return (
              <div key={s}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-zinc-300">
                    <span className={`size-2 rounded-full ${SPORT_BG[s]}`} />
                    {SPORT_LABEL[s]}
                  </span>
                  <span className="whitespace-nowrap text-zinc-400 tabular-nums">
                    <span className="font-semibold text-white">{doneMin ? formatDuration(doneMin) : '0'}</span>
                    {plannedMin ? ` / ${formatDuration(plannedMin)}` : ''}
                  </span>
                </div>
                <ProgressBar value={doneMin} max={Math.max(plannedMin, doneMin)} color={SPORT_BG[s]} />
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm text-zinc-400">
          Totaal <span className="font-semibold text-white">{formatDuration(sumMinutes(done))}</span> gedaan van{' '}
          {formatDuration(sumMinutes(planned))} gepland
        </p>
      </Card>

      <div className={`grid grid-cols-1 gap-3 md:grid-cols-7 ${loading ? 'opacity-50' : ''}`}>
        {days.map((d) => {
          const dayPlanned = planned.filter((p) => p.date === d)
          const dayExtras = extras.filter((w) => w.date === d)
          const isToday = d === today
          return (
            <div
              key={d}
              className={`flex flex-col rounded-2xl border p-3 ${
                isToday ? 'border-brand/60 bg-brand/5' : 'border-white/5 bg-zinc-900/70'
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className={`text-xs font-semibold tracking-wider uppercase ${isToday ? 'text-brand' : 'text-zinc-500'}`}>
                  {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short' })}
                </span>
                <span className="text-lg font-bold">{parseISODate(d).getDate()}</span>
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                {dayPlanned.map((p) => (
                  <PlannedItem key={p.id} item={p} onToggle={() => run(() => toggle(p))} onRemove={() => run(() => remove(p.id))} />
                ))}
                {dayExtras.map((w) => (
                  <div key={w.id} className="rounded-lg border border-dashed border-zinc-700 p-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <span className={`size-2 rounded-full ${SPORT_BG[w.sport]}`} />
                      {SPORT_LABEL[w.sport]}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatSessionDuration(w.duration_min)} · niet gepland
                    </p>
                  </div>
                ))}
                {!dayPlanned.length && !dayExtras.length && <p className="text-xs text-zinc-600 md:py-2">Rust</p>}
              </div>

              <button
                onClick={() => setAddDate(d)}
                className="mt-2 w-full rounded-lg border border-dashed border-zinc-700 py-1 text-xs text-zinc-500 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                + plannen
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlannedItem({ item, onToggle, onRemove }: { item: PlannedWorkout; onToggle: () => void; onRemove: () => void }) {
  const isDone = Boolean(item.workout_id)
  return (
    <div className="group rounded-lg bg-zinc-800/60 p-2">
      <div className="flex items-start gap-2">
        <DoneToggle sport={item.sport} checked={isDone} onClick={onToggle} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-tight font-medium break-words ${isDone ? 'text-zinc-500 line-through' : 'text-white'}`}>
            {item.title || SPORT_LABEL[item.sport]}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            <span className="whitespace-nowrap">{formatSessionDuration(item.duration_min)}</span>
            {item.distance_km ? <span className="whitespace-nowrap"> · {item.distance_km} km</span> : null}
          </p>
          {item.notes && <p className="mt-0.5 text-xs text-zinc-500">{item.notes}</p>}
        </div>
        <button
          onClick={() => confirm('Geplande sessie verwijderen?') && onRemove()}
          className="text-zinc-500 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
          aria-label="Verwijderen"
        >
          ×
        </button>
      </div>
    </div>
  )
}
