import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { KpiStrip } from '../components/KpiStrip'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { RouteMap } from '../components/RouteMap'
import { Segmented } from '../components/Segmented'
import { WorkoutForm } from '../components/WorkoutForm'
import { WorkoutList } from '../components/WorkoutList'
import { ask, toast } from '../lib/feedback'
import { formatDuration, formatSessionDuration, formatShortDate, parseISODate, sumMinutes, todayISO } from '../lib/race'
import { weeklyMinutes } from '../lib/stats'
import { SPORTS, SPORT_LABEL, type Sport, type Workout } from '../lib/types'
import { dangerOutlineButton, errorMessage, secondaryButton } from '../lib/ui'
import { useWorkouts } from '../lib/useWorkouts'

type Filter = 'all' | Sport
const FILTERS: { key: Filter; label: string }[] = [{ key: 'all', label: 'Alle' }, ...SPORTS.map((s) => ({ key: s as Filter, label: SPORT_LABEL[s] }))]

/** Hoeveel trainingen de lijst eerst toont; "Meer tonen" voegt er telkens zoveel bij. */
const PAGE = 40

export function Workouts() {
  const { workouts, loading, error, add, update, remove } = useWorkouts()
  const [editing, setEditing] = useState<Workout | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(() => (filter === 'all' ? workouts : workouts.filter((w) => w.sport === filter)), [workouts, filter])

  async function handleDelete(w: Workout) {
    if (!(await ask({ title: 'Training verwijderen?', body: 'Dit kan niet ongedaan gemaakt worden.', confirm: 'Verwijderen', danger: true }))) return
    try {
      await remove(w.id)
      setEditing(null)
      toast.success('Training verwijderd.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader title="Trainingen" description="Log je trainingen en bewerk ze achteraf. Tik op een training in de lijst om ze aan te passen." />

      <div className="space-y-6 sm:space-y-8">
        {!loading && workouts.length > 0 && <WorkoutKpis workouts={workouts} />}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          {/* Smal en blijvend in beeld op desktop: loggen kan terwijl je door de lijst scrolt. */}
          <Card title="Training loggen" description="Sport, duur en eventueel afstand en hoe zwaar het voelde." className="lg:sticky lg:top-20">
            {/* Tweekoloms opbouw (zoals in het bewerkvenster) past in deze smalle kolom. */}
            <WorkoutForm
              inDialog
              onSubmit={async (w) => {
                await add(w)
                toast.success('Training toegevoegd.')
              }}
            />
          </Card>

          <Card
            title="Alle trainingen"
            action={!loading && <span className="text-sm text-fg-3 tabular-nums">{filtered.length}</span>}
            className="min-w-0"
          >
            <div className="-mt-1 mb-5">
              <Segmented
                options={FILTERS}
                value={filter}
                onChange={(f) => {
                  setFilter(f)
                  setShown(PAGE)
                }}
              />
            </div>
            {error && <p className="mb-3 text-sm text-danger">{error}</p>}
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-subtle" />
                ))}
              </div>
            ) : filtered.length ? (
              <>
                <MonthGroups workouts={filtered.slice(0, shown)} onEdit={setEditing} />
                {filtered.length > shown && (
                  <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${secondaryButton} mt-5 w-full`}>
                    Meer tonen ({filtered.length - shown})
                  </button>
                )}
              </>
            ) : (
              <EmptyState icon="activity" title={filter === 'all' ? 'Nog geen trainingen' : `Nog geen ${SPORT_LABEL[filter as Sport].toLowerCase()}`}>
                Log je eerste training links, of koppel Strava in Instellingen.
              </EmptyState>
            )}
          </Card>
        </div>
      </div>

      {editing && (
        <Modal title="Training bewerken" onClose={() => setEditing(null)}>
          {editing.route_polyline && <RouteMap polyline={editing.route_polyline} sport={editing.sport} interactive className="mb-5 h-56 sm:h-64" />}
          <WorkoutForm
            key={editing.id}
            initial={editing}
            inDialog
            onSubmit={async (patch) => {
              await update(editing.id, patch)
              setEditing(null)
            }}
          />
          <div className="mt-5 border-t border-line pt-5">
            <button onClick={() => handleDelete(editing)} className={`${dangerOutlineButton} w-full`}>
              Training verwijderen
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Totaal, deze maand, gemiddelde per week (laatste 8 weken) en langste sessie. */
function WorkoutKpis({ workouts }: { workouts: Workout[] }) {
  const month = todayISO().slice(0, 7)
  const thisMonth = workouts.filter((w) => w.date.startsWith(month))
  const weeks = weeklyMinutes(workouts, 8)
  const avg = weeks.reduce((a, w) => a + w.minutes, 0) / weeks.length
  const longest = workouts.reduce<Workout | null>((best, w) => (!best || w.duration_min > best.duration_min ? w : best), null)
  const first = workouts[workouts.length - 1]

  return (
    <KpiStrip
      items={[
        { label: 'Totaal', value: `${workouts.length} ${workouts.length === 1 ? 'sessie' : 'sessies'}`, sub: first ? `sinds ${formatShortDate(first.date)}` : undefined },
        {
          label: 'Deze maand',
          value: thisMonth.length ? formatDuration(sumMinutes(thisMonth)) : '0',
          sub: `${thisMonth.length} ${thisMonth.length === 1 ? 'sessie' : 'sessies'}`,
        },
        { label: 'Gemiddeld per week', value: avg ? formatDuration(avg) : '0', sub: 'laatste 8 weken' },
        {
          label: 'Langste sessie',
          value: longest ? formatSessionDuration(longest.duration_min) : '–',
          sub: longest ? `${SPORT_LABEL[longest.sport]} · ${formatShortDate(longest.date)}` : undefined,
        },
      ]}
    />
  )
}

/** Trainingen per maand, met per maand het aantal en de totale tijd. */
function MonthGroups({ workouts, onEdit }: { workouts: Workout[]; onEdit: (w: Workout) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of workouts) map.set(w.date.slice(0, 7), [...(map.get(w.date.slice(0, 7)) ?? []), w])
    return [...map.entries()]
  }, [workouts])

  return (
    <div className="space-y-6">
      {groups.map(([month, items]) => (
        <section key={month}>
          <div className="mb-1 flex items-baseline justify-between gap-2 border-b border-line pb-2">
            <h3 className="text-xs font-medium text-fg-2 first-letter:uppercase">
              {parseISODate(`${month}-01`).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })}
            </h3>
            <span className="text-xs text-fg-3 tabular-nums">
              {items.length} · {formatDuration(sumMinutes(items))}
            </span>
          </div>
          <WorkoutList workouts={items} onEdit={onEdit} />
        </section>
      ))}
    </div>
  )
}
