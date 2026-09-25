import { useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/Card'
import { ClearScheduleDialog } from '../components/ClearScheduleDialog'
import { CompleteDialog } from '../components/CompleteDialog'
import { DoneToggle } from '../components/DoneToggle'
import { Modal } from '../components/Modal'
import { PlanForm } from '../components/PlanForm'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { IronmanPlan } from './IronmanPlan'
import {
  addDays,
  formatDuration,
  formatPace,
  formatSessionDuration,
  formatShortDate,
  parseISODate,
  sumMinutes,
  todayISO,
  weekStart,
} from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL, type PlannedWorkout, type Workout } from '../lib/types'
import { errorMessage, ghostButton } from '../lib/ui'
import { usePlan } from '../lib/usePlan'

const TABS = [
  { key: 'week', label: 'Weekschema' },
  { key: 'ironman', label: 'IRONMAN-plan' },
] as const

type Tab = (typeof TABS)[number]['key']

export function Plan() {
  // Tab staat in de URL (#/plan?tab=ironman), zodat terugknop en links werken.
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'ironman' ? 'ironman' : 'week'
  const setTab = (t: Tab) => setParams(t === 'week' ? {} : { tab: t })

  return (
    <div className="space-y-4">
      <Segmented options={[...TABS]} value={tab} onChange={setTab} />
      {tab === 'week' ? <WeekSchedule /> : <IronmanPlan onShowSchedule={() => setTab('week')} />}
    </div>
  )
}

function WeekSchedule() {
  const [start, setStart] = useState(() => weekStart(new Date()))
  const { planned, done, loading, error, add, update, remove, complete, uncomplete, copyPreviousWeek, reload } = usePlan(start)
  const [clearing, setClearing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [addDate, setAddDate] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlannedWorkout | null>(null)
  const [completing, setCompleting] = useState<PlannedWorkout | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overDay, setOverDay] = useState<string | null>(null)

  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const doneById = new Map(done.map((w) => [w.id, w]))
  const linked = new Set(planned.map((p) => p.workout_id))
  const extras = done.filter((w) => !linked.has(w.id))
  const isCurrentWeek = start === weekStart(new Date())

  const run = (fn: () => Promise<unknown>) => fn().catch((e) => alert(errorMessage(e)))

  async function handleCopy() {
    if (planned.length && !confirm('Deze week heeft al sessies. Toch de vorige week erbij kopiëren?')) return
    const count = await copyPreviousWeek()
    if (count === 0) alert('Vorige week had geen geplande sessies.')
  }

  const toggle = (p: PlannedWorkout) => (p.workout_id ? run(() => uncomplete(p)) : setCompleting(p))

  // Slepen tussen dagen (desktop). Op mobiel verplaats je via bewerken → datum.
  const dropHandlers = (d: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId) return
      e.preventDefault()
      setOverDay(d)
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverDay(null)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const item = planned.find((p) => p.id === dragId)
      if (item && item.date !== d) run(() => update(item, { date: d }))
      setDragId(null)
      setOverDay(null)
    },
  })

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
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <button onClick={() => setClearing(true)} className={`${ghostButton} text-zinc-400 hover:text-red-400`}>
            Leegmaken
          </button>
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
      {notice && (
        <p className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-zinc-900/70 px-4 py-2.5 text-sm text-zinc-300">
          {notice}
          <button onClick={() => setNotice(null)} className="text-zinc-500 hover:text-white" aria-label="Sluiten">
            ×
          </button>
        </p>
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
          <span className="hidden text-zinc-600 md:inline"> · sleep een sessie naar een andere dag om te verplaatsen</span>
        </p>
      </Card>

      <div className={`grid grid-cols-1 gap-3 md:grid-cols-7 ${loading ? 'opacity-50' : ''}`}>
        {days.map((d) => {
          const dayPlanned = planned.filter((p) => p.date === d)
          const dayExtras = extras.filter((w) => w.date === d)
          const isToday = d === today
          const isOver = overDay === d
          return (
            <div
              key={d}
              {...dropHandlers(d)}
              className={`flex flex-col rounded-2xl border p-3 transition ${
                isOver ? 'border-white/40 bg-white/5' : isToday ? 'border-brand/60 bg-brand/5' : 'border-white/5 bg-zinc-900/70'
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
                  <PlannedItem
                    key={p.id}
                    item={p}
                    actual={p.workout_id ? doneById.get(p.workout_id) : undefined}
                    dragging={dragId === p.id}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverDay(null)
                    }}
                    onToggle={() => toggle(p)}
                    onEdit={() => setEditing(p)}
                  />
                ))}
                {dayExtras.map((w) => {
                  const pace = formatPace(w.sport, w.duration_min, w.distance_km)
                  return (
                    <div key={w.id} className="rounded-lg border border-dashed border-zinc-700 p-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <span className={`size-2 rounded-full ${SPORT_BG[w.sport]}`} />
                        {SPORT_LABEL[w.sport]}
                      </p>
                      <SessionMeta parts={[formatSessionDuration(w.duration_min), pace, 'niet gepland']} />
                    </div>
                  )
                })}
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

      {addDate && (
        <Modal title="Sessie plannen" onClose={() => setAddDate(null)}>
          <PlanForm defaultDate={addDate} onSubmit={add} onCancel={() => setAddDate(null)} />
        </Modal>
      )}

      {editing && (
        <Modal title="Sessie bewerken" onClose={() => setEditing(null)}>
          <PlanForm defaultDate={editing.date} initial={editing} onSubmit={(patch) => update(editing, patch)} onCancel={() => setEditing(null)} />
          <button
            onClick={() => {
              if (!confirm('Geplande sessie verwijderen?')) return
              run(() => remove(editing.id))
              setEditing(null)
            }}
            className="mt-4 w-full rounded-lg border border-red-500/30 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Sessie verwijderen
          </button>
        </Modal>
      )}

      {completing && <CompleteDialog item={completing} onComplete={complete} onClose={() => setCompleting(null)} />}

      {clearing && (
        <ClearScheduleDialog
          onClose={() => setClearing(false)}
          onCleared={(count) => {
            setNotice(`${count} ${count === 1 ? 'sessie' : 'sessies'} verwijderd uit je schema.`)
            reload()
          }}
        />
      )}
    </div>
  )
}

/** Duur, afstand, tempo: elk deel blijft heel en breekt als geheel af in smalle dagkolommen. */
function SessionMeta({ parts }: { parts: (string | null)[] }) {
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-zinc-400">
      {parts.filter(Boolean).map((part, i) => (
        <span key={i} className="whitespace-nowrap">
          {part}
        </span>
      ))}
    </p>
  )
}

function PlannedItem({
  item,
  actual,
  dragging,
  onDragStart,
  onDragEnd,
  onToggle,
  onEdit,
}: {
  item: PlannedWorkout
  actual?: Workout
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onToggle: () => void
  onEdit: () => void
}) {
  const isDone = Boolean(item.workout_id)
  // Afgevinkt: toon wat er echt gedaan is; anders het plan.
  const shown = actual ?? item
  const pace = formatPace(item.sport, shown.duration_min, shown.distance_km)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`overflow-hidden rounded-lg bg-zinc-800/60 p-2 transition md:cursor-grab md:active:cursor-grabbing ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <DoneToggle sport={item.sport} checked={isDone} onClick={onToggle} />
        <button onClick={onEdit} className="min-w-0 flex-1 text-left" aria-label={`${item.title || SPORT_LABEL[item.sport]} bewerken`}>
          <p className={`text-sm leading-tight font-medium break-words ${isDone ? 'text-zinc-500 line-through' : 'text-white'}`}>
            {item.title || SPORT_LABEL[item.sport]}
          </p>
          <SessionMeta parts={[formatSessionDuration(shown.duration_min), shown.distance_km ? `${shown.distance_km} km` : null, pace]} />
          {isDone && actual && actual.duration_min !== item.duration_min && (
            <p className="mt-0.5 text-[11px] text-zinc-500">gepland {formatSessionDuration(item.duration_min)}</p>
          )}
          {item.notes && <p className="mt-0.5 text-xs text-zinc-500">{item.notes}</p>}
        </button>
      </div>
    </div>
  )
}
