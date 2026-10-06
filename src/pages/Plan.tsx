import { useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/Card'
import { ClearScheduleDialog } from '../components/ClearScheduleDialog'
import { CompleteDialog } from '../components/CompleteDialog'
import { DoneToggle } from '../components/DoneToggle'
import { Icon } from '../components/Icon'
import { KpiStrip } from '../components/KpiStrip'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { PlanForm } from '../components/PlanForm'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import { ask, toast } from '../lib/feedback'
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
import { dangerOutlineButton, errorMessage, ghostButton, iconButton, primaryButton, secondaryButton } from '../lib/ui'
import { usePlan } from '../lib/usePlan'

const TABS = [
  { key: 'week', label: 'Weekschema' },
  { key: 'ironman', label: 'Raceplan' },
] as const

type Tab = (typeof TABS)[number]['key']

export function Plan() {
  // Tab staat in de URL (#/plan?tab=ironman), zodat terugknop en links werken.
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'ironman' ? 'ironman' : 'week'
  const setTab = (t: Tab) => setParams(t === 'week' ? {} : { tab: t })

  return (
    <div>
      <PageHeader title="Schema" description="Plan je sessies per week en vink ze af, of volg een opbouwschema richting je race." />
      <div className="space-y-6">
        <Segmented options={[...TABS]} value={tab} onChange={setTab} />
        {tab === 'week' ? <WeekSchedule onShowRacePlan={() => setTab('ironman')} /> : <IronmanPlan onShowSchedule={() => setTab('week')} />}
      </div>
    </div>
  )
}

function WeekSchedule({ onShowRacePlan }: { onShowRacePlan: () => void }) {
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
  const firstLoad = loading && !planned.length && !done.length
  const isEmpty = !loading && !planned.length && !done.length

  const run = (fn: () => Promise<unknown>) => fn().catch((e) => toast.error(errorMessage(e)))

  async function handleCopy() {
    if (planned.length && !(await ask({ title: 'Vorige week erbij kopiëren?', body: 'Deze week heeft al sessies; de sessies van vorige week komen erbij.', confirm: 'Kopiëren' }))) return
    const count = await copyPreviousWeek()
    if (count === 0) toast.info('Vorige week had geen geplande sessies.')
    else toast.success(`${count} ${count === 1 ? 'sessie' : 'sessies'} gekopieerd.`)
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
    <div className="space-y-6">
      {/* Werkbalk: weeknavigatie links, acties rechts (op mobiel eronder). */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            <button onClick={() => setStart(addDays(start, -7))} className={iconButton} aria-label="Vorige week">
              <Icon name="chevron-left" />
            </button>
            <span className="min-w-36 px-1 text-center text-sm font-medium text-fg tabular-nums">
              {formatShortDate(start)} – {formatShortDate(addDays(start, 6))}
            </span>
            <button onClick={() => setStart(addDays(start, 7))} className={iconButton} aria-label="Volgende week">
              <Icon name="chevron-right" />
            </button>
          </div>
          {!isCurrentWeek && (
            <button onClick={() => setStart(weekStart(new Date()))} className={ghostButton}>
              Deze week
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setClearing(true)} className={`${ghostButton} hover:text-danger`}>
            <Icon name="trash" className="size-4" />
            Leegmaken
          </button>
          <button onClick={() => run(handleCopy)} className={secondaryButton}>
            <Icon name="refresh" className="size-4" />
            Vorige week kopiëren
          </button>
          <button onClick={() => setAddDate(start <= today && today <= days[6] ? today : start)} className={primaryButton}>
            <Icon name="plus" className="size-4" />
            Sessie plannen
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line py-1.5 pr-1.5 pl-4 text-sm text-fg-2">
          <span className="inline-flex items-center gap-2">
            <Icon name="check" className="size-4 text-success" />
            {notice}
          </span>
          <button onClick={() => setNotice(null)} className={iconButton} aria-label="Sluiten">
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {firstLoad ? <Skeleton className="h-[98px] w-full rounded-xl sm:h-[106px]" /> : <ScheduleKpis planned={planned} done={done} today={today} />}

      {isEmpty && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-4 text-sm text-fg-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Nog niets gepland deze week. Plan een sessie, kopieer vorige week of neem sessies over uit je raceplan.</p>
          <button onClick={onShowRacePlan} className={`${secondaryButton} shrink-0`}>
            <Icon name="flag" className="size-4" />
            Naar raceplan
          </button>
        </div>
      )}

      <Card title="Per sport" description={<span className="hidden md:inline">Sleep een sessie naar een andere dag om ze te verplaatsen.</span>}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {SPORTS.map((s) => {
            const plannedMin = sumMinutes(planned.filter((p) => p.sport === s))
            const doneMin = sumMinutes(done.filter((w) => w.sport === s))
            return (
              <div key={s} className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-fg-2">
                    <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[s]}`} />
                    <span className="truncate">{SPORT_LABEL[s]}</span>
                  </span>
                  <span className="whitespace-nowrap text-fg-3 tabular-nums">
                    <span className="font-medium text-fg">{doneMin ? formatDuration(doneMin) : '0'}</span>
                    {plannedMin ? ` / ${formatDuration(plannedMin)}` : ''}
                  </span>
                </div>
                <ProgressBar value={doneMin} max={Math.max(plannedMin, doneMin)} color={SPORT_BG[s]} />
              </div>
            )
          })}
        </div>
      </Card>

      <div className={`grid grid-cols-1 gap-3 transition-opacity md:grid-cols-7 md:gap-2 lg:gap-3 ${loading ? 'opacity-50' : ''}`}>
        {days.map((d) => {
          const dayPlanned = planned.filter((p) => p.date === d)
          const dayExtras = extras.filter((w) => w.date === d)
          const isToday = d === today
          const isOver = overDay === d
          const isRest = !dayPlanned.length && !dayExtras.length
          // Dagtotaal: gepland, en wat er effectief gedaan is (afgevinkt of los gelogd).
          const dayPlanMin = sumMinutes(dayPlanned)
          const dayDoneMin = sumMinutes(done.filter((w) => w.date === d))
          return (
            <div
              key={d}
              {...dropHandlers(d)}
              className={`flex min-w-0 flex-col rounded-xl border p-3 transition ${
                isOver ? 'border-dashed border-fg-3 bg-subtle' : 'border-line bg-surface'
              }`}
            >
              <div className="mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${isToday ? 'font-medium text-fg' : 'text-fg-3'}`}>
                    {isToday && <span className="size-1.5 rounded-full bg-brand" aria-label="Vandaag" />}
                    {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short' })}
                  </span>
                  <span className={`text-sm tabular-nums ${isToday ? 'font-medium text-fg' : 'text-fg-2'}`}>
                    {parseISODate(d).getDate()}
                  </span>
                </div>
                {(dayPlanMin > 0 || dayDoneMin > 0) && (
                  <p className="mt-0.5 truncate text-[11px] text-fg-4 tabular-nums" title="Gedaan / gepland">
                    {dayDoneMin > 0 && dayPlanMin > 0
                      ? `${formatDuration(dayDoneMin)} / ${formatDuration(dayPlanMin)}`
                      : formatDuration(dayPlanMin || dayDoneMin)}
                  </p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                {firstLoad && <Skeleton className="h-14 w-full" />}
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
                    <div key={w.id} className="rounded-lg border border-dashed border-line-strong p-2.5">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                        <span className={`size-2 shrink-0 rounded-full ${SPORT_BG[w.sport]}`} />
                        {SPORT_LABEL[w.sport]}
                      </p>
                      <SessionMeta parts={[formatSessionDuration(w.duration_min), pace, 'niet gepland']} />
                    </div>
                  )
                })}
                {isRest && !firstLoad && <p className="text-xs text-fg-4 md:py-2">Rust</p>}
              </div>

              <button
                onClick={() => setAddDate(d)}
                className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-xs text-fg-3 transition hover:border-fg-3 hover:text-fg focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none md:h-8"
              >
                <Icon name="plus" className="size-3.5" />
                plannen
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
          <div className="mt-5 border-t border-line pt-5">
            <button
              onClick={async () => {
                if (!(await ask({ title: 'Geplande sessie verwijderen?', confirm: 'Verwijderen', danger: true }))) return
                run(() => remove(editing.id))
                setEditing(null)
              }}
              className={`${dangerOutlineButton} w-full`}
            >
              Sessie verwijderen
            </button>
          </div>
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

/** Kerncijfers van de getoonde week: volume, uitvoering en wat er nog openstaat. */
function ScheduleKpis({ planned, done, today }: { planned: PlannedWorkout[]; done: Workout[]; today: string }) {
  const planMin = sumMinutes(planned)
  const doneMin = sumMinutes(done)
  // Schema-trouw telt enkel de sessies tot en met vandaag: de rest kon nog niet.
  const due = planned.filter((p) => p.date <= today)
  const ticked = due.filter((p) => p.workout_id).length
  const open = planned.filter((p) => !p.workout_id && p.date >= today)
  const missed = due.filter((p) => !p.workout_id && p.date < today).length
  const sessions = (n: number) => `${n} ${n === 1 ? 'sessie' : 'sessies'}`

  return (
    <KpiStrip
      items={[
        { label: 'Gepland', value: planMin ? formatDuration(planMin) : '0', sub: sessions(planned.length) },
        {
          label: 'Gedaan',
          value: doneMin ? formatDuration(doneMin) : '0',
          sub: planMin ? `${Math.round((doneMin / planMin) * 100)}% van gepland` : sessions(done.length),
        },
        {
          label: 'Schema-trouw',
          value: due.length ? `${Math.round((ticked / due.length) * 100)}%` : '–',
          sub: due.length ? `${ticked} van ${due.length} afgevinkt` : planned.length ? 'Nog niets te doen' : 'Niets gepland',
        },
        {
          label: 'Nog te doen',
          value: open.length ? formatDuration(sumMinutes(open)) : '0',
          sub: `${sessions(open.length)}${missed ? ` · ${missed} gemist` : ''}`,
        },
      ]}
    />
  )
}

/** Duur, afstand, tempo: elk deel blijft heel en breekt als geheel af in smalle dagkolommen. */
function SessionMeta({ parts }: { parts: (string | null)[] }) {
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-fg-3 tabular-nums">
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
      className={`overflow-hidden rounded-lg border border-line p-2.5 transition hover:border-line-strong md:cursor-grab md:active:cursor-grabbing ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <DoneToggle sport={item.sport} checked={isDone} onClick={onToggle} />
        <button
          onClick={onEdit}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none"
          aria-label={`${item.title || SPORT_LABEL[item.sport]} bewerken`}
        >
          <p className={`flex items-start gap-1.5 text-sm leading-tight font-medium break-words ${isDone ? 'text-fg-3 line-through' : 'text-fg'}`}>
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${SPORT_BG[item.sport]}`} aria-hidden />
            <span className="min-w-0">{item.title || SPORT_LABEL[item.sport]}</span>
          </p>
          <SessionMeta parts={[formatSessionDuration(shown.duration_min), shown.distance_km ? `${shown.distance_km} km` : null, pace]} />
          {isDone && actual && actual.duration_min !== item.duration_min && (
            <p className="mt-0.5 text-[11px] text-fg-4">gepland {formatSessionDuration(item.duration_min)}</p>
          )}
          {item.notes && <p className="mt-1 text-xs text-fg-3">{item.notes}</p>}
        </button>
      </div>
    </div>
  )
}
