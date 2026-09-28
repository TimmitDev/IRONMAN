import { useMemo, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { Stat } from '../components/Stat'
import {
  DAY_NAMES,
  DEFAULT_SETTINGS,
  LEVELS,
  applyPlan,
  defaultStartDate,
  generatePlan,
  usePlanSettings,
  type Level,
  type PlanSettings,
  type PlanWeek,
} from '../lib/ironmanPlan'
import { RACE, addDays, formatDuration, formatPace, formatShortDate, parseISODate, weekStart } from '../lib/race'
import { SPORTS, SPORT_BG, SPORT_LABEL } from '../lib/types'
import { errorMessage, inputClass, labelClass, linkClass, pillClass, primaryButton, secondaryButton } from '../lib/ui'

export function IronmanPlan({ onShowSchedule }: { onShowSchedule: () => void }) {
  const { settings, loading, error, save } = usePlanSettings()
  const [editing, setEditing] = useState(false)
  const weeks = useMemo(() => (settings ? generatePlan(settings) : []), [settings])

  if (loading) return <p className="text-sm text-fg-3">Laden…</p>

  if (!settings || editing) {
    return (
      <div className="max-w-3xl space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Card
          title={settings ? 'Plan aanpassen' : 'Stel je IRONMAN-plan samen'}
          description={
            <>
              Een opbouwschema van week tot week richting {RACE.name} op{' '}
              {RACE.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}: basis, opbouw, piek en
              taper, met elke 4e week een herstelweek.
            </>
          }
        >
          <SettingsForm
            initial={settings}
            onCancel={settings ? () => setEditing(false) : undefined}
            onSave={async (s) => {
              await save(s)
              setEditing(false)
            }}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Summary settings={settings} weeks={weeks} onEdit={() => setEditing(true)} />
      <Card title="Uren per week" description="Beweeg over een balk voor de verdeling per sport.">
        <PlanChart weeks={weeks} />
      </Card>
      <ApplyCard weeks={weeks} onShowSchedule={onShowSchedule} />
      <WeekList weeks={weeks} />
      <p className="text-xs text-fg-3">
        Dit plan is een algemene richtlijn op basis van klassieke periodisering, geen vervanging voor een coach of medisch advies.
        Luister naar je lichaam: bij pijn of grote vermoeidheid neem je rust.
      </p>
    </div>
  )
}

function SettingsForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: PlanSettings | null
  onSave: (s: PlanSettings) => Promise<void>
  onCancel?: () => void
}) {
  const [s, setS] = useState<PlanSettings>(initial ?? { ...DEFAULT_SETTINGS, startDate: defaultStartDate() })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof PlanSettings>(key: K, value: PlanSettings[K]) => setS((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (s.longBikeDay === s.longRunDay) return setError('Kies verschillende dagen voor je lange rit en lange loop.')
    if (s.restDay === s.longBikeDay || s.restDay === s.longRunDay) return setError('Je rustdag kan niet samenvallen met een lange sessie.')
    setBusy(true)
    setError(null)
    try {
      await onSave({ ...s, startDate: weekStart(parseISODate(s.startDate)) })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const daySelect = (key: 'restDay' | 'longBikeDay' | 'longRunDay', label: string) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select className={inputClass} value={s[key]} onChange={(e) => set(key, Number(e.target.value))}>
        {DAY_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className={labelClass}>Niveau</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(LEVELS) as Level[]).map((key) => {
            const level = LEVELS[key]
            const active = s.level === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('level', key)}
                aria-pressed={active}
                className={`relative rounded-xl border p-4 text-left transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none ${
                  active ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong hover:bg-hover'
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                    <Icon name="check" className="size-3" strokeWidth={3} />
                  </span>
                )}
                <p className="pr-6 font-semibold text-fg">{level.label}</p>
                <p className="mt-1 text-xs text-fg-3">{level.description}</p>
                <p className="mt-3 text-xs font-semibold text-fg-2 tabular-nums">Piekweek ±{level.peakHours} uur</p>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {daySelect('restDay', 'Rustdag')}
        {daySelect('longBikeDay', 'Lange rit')}
        {daySelect('longRunDay', 'Lange loop')}
      </div>

      <label className="block sm:w-1/3">
        <span className={labelClass}>Start van het plan</span>
        <input type="date" className={inputClass} value={s.startDate} onChange={(e) => set('startDate', e.target.value)} required />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <button type="submit" disabled={busy} className={primaryButton}>
          {!busy && <Icon name="sparkles" className="size-4" />}
          {busy ? 'Opslaan…' : 'Plan genereren'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButton}>
            Annuleren
          </button>
        )}
      </div>
    </form>
  )
}

function Summary({ settings, weeks, onEdit }: { settings: PlanSettings; weeks: PlanWeek[]; onEdit: () => void }) {
  const total = weeks.reduce((a, w) => a + w.minutes, 0)
  const peak = Math.max(...weeks.map((w) => w.minutes))
  const current = weeks.find((w) => w.start === weekStart(new Date()))
  const level = LEVELS[settings.level]
  return (
    <Card
      title={`Jouw IRONMAN-plan · ${level.label}`}
      description={
        <>
          Rust op {DAY_NAMES[settings.restDay].toLowerCase()}, lange rit op {DAY_NAMES[settings.longBikeDay].toLowerCase()}, lange loop
          op {DAY_NAMES[settings.longRunDay].toLowerCase()}.
        </>
      }
      action={
        <button onClick={onEdit} className={secondaryButton}>
          <Icon name="settings" className="size-4" />
          Aanpassen
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tile label="Weken" value={String(weeks.length)} />
        <Stat tile label="Totaal" value={`${Math.round(total / 60)} u`} />
        <Stat tile label="Piekweek" value={formatDuration(peak)} />
        {current && (
          <Stat tile label="Deze week" value={formatDuration(current.minutes)} sub={`${current.phase.name}${current.recovery ? ' · herstel' : ''}`} />
        )}
      </div>
    </Card>
  )
}

function PlanChart({ weeks }: { weeks: PlanWeek[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const thisWeek = weekStart(new Date())
  const maxMin = Math.max(...weeks.map((w) => w.minutes))
  const maxH = Math.ceil(maxMin / 60 / 5) * 5
  const phases = weeks.reduce<{ name: string; count: number }[]>((acc, w) => {
    const last = acc[acc.length - 1]
    if (last?.name === w.phase.name) last.count++
    else acc.push({ name: w.phase.name, count: 1 })
    return acc
  }, [])
  const hovered = hover !== null ? weeks[hover] : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-fg-3" /> Normale week
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-line-strong" /> Herstelweek
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> Deze week
        </span>
      </div>

      <div className="relative">
        <div className="relative flex h-48 items-end gap-[2px] pl-7">
          {[0, maxH / 2, maxH].map((t) => (
            <div key={t} className="pointer-events-none absolute right-0 left-7 border-t border-line" style={{ bottom: `${(t / maxH) * 100}%` }}>
              <span className="absolute -top-2 -left-7 w-5 text-right text-[10px] text-fg-3 tabular-nums">{t}u</span>
            </div>
          ))}
          {weeks.map((w, i) => (
            <div
              key={w.start}
              className="relative flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={`w-full rounded-t-sm transition-opacity ${
                  w.start === thisWeek ? 'bg-brand' : w.recovery ? 'bg-line-strong' : 'bg-fg-3'
                } ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
                style={{ height: `${(w.minutes / 60 / maxH) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {hovered && (
          <div className="pointer-events-none absolute top-0 right-0 z-10 w-52 rounded-xl border border-line bg-surface p-3 text-xs shadow-lg">
            <p className="font-semibold text-fg">
              Week {hovered.index} · {formatShortDate(hovered.start)}
            </p>
            <p className="text-fg-3">
              {hovered.raceWeek ? 'Raceweek 🏁' : hovered.phase.name}
              {hovered.recovery ? ' · herstelweek' : ''}
            </p>
            <div className="mt-2 space-y-1">
              {SPORTS.map((s) => {
                const min = hovered.sessions.filter((x) => x.sport === s).reduce((a, x) => a + x.duration_min, 0)
                return min ? (
                  <div key={s} className="flex justify-between text-fg-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{formatDuration(min)}</span>
                  </div>
                ) : null
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold text-fg">
              <span>Totaal</span>
              <span className="tabular-nums">{formatDuration(hovered.minutes)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Faseband onder de balken */}
      <div className="mt-2 flex gap-[2px] pl-7">
        {phases.map((p, i) => (
          <div key={`${p.name}-${i}`} style={{ flexGrow: p.count, flexBasis: 0 }} className="min-w-0">
            <div className="h-1 rounded-full bg-muted" />
            <span className={`mt-1 block truncate text-[10px] text-fg-3 ${p.count < 4 ? 'hidden sm:block' : ''}`}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const RANGES = [
  { key: '4', label: '4 weken' },
  { key: '8', label: '8 weken' },
  { key: 'all', label: 'Heel het plan' },
] as const

function ApplyCard({ weeks, onShowSchedule }: { weeks: PlanWeek[]; onShowSchedule: () => void }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('4')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const current = weekStart(new Date())
  const until = range === 'all' ? addDays(weeks[weeks.length - 1]?.start ?? current, 6) : addDays(current, Number(range) * 7 - 1)

  async function handleApply() {
    if (!confirm(`Plan-sessies t/m ${formatShortDate(until)} in je schema zetten? Eerder toegepaste plan-sessies die je nog niet deed, worden vervangen. Je eigen sessies blijven staan.`)) return
    setBusy(true)
    setResult(null)
    try {
      const count = await applyPlan(weeks, until)
      setResult(`${count} sessies ingepland t/m ${formatShortDate(until)}.`)
    } catch (err) {
      setResult(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="In je schema zetten"
      description="Zet de sessies in je weekschema om ze af te vinken. Opnieuw toepassen vervangt enkel plan-sessies die je nog niet deed."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Segmented options={[...RANGES]} value={range} onChange={setRange} />
        <button onClick={handleApply} disabled={busy} className={primaryButton}>
          {!busy && <Icon name="calendar" className="size-4" />}
          {busy ? 'Bezig…' : 'In schema zetten'}
        </button>
      </div>
      {result && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-subtle px-4 py-3 text-sm text-fg-2">
          <span>{result}</span>
          <button onClick={onShowSchedule} className={`${linkClass} inline-flex items-center gap-1`}>
            Bekijk weekschema
            <Icon name="arrow-right" className="size-4" />
          </button>
        </p>
      )}
    </Card>
  )
}

function WeekList({ weeks }: { weeks: PlanWeek[] }) {
  const [showAll, setShowAll] = useState(false)
  const current = weekStart(new Date())
  const currentIdx = Math.max(0, weeks.findIndex((w) => w.start >= current))
  const visible = showAll ? weeks : weeks.slice(currentIdx, currentIdx + 4)

  return (
    <Card
      title={showAll ? 'Alle weken' : 'Komende weken'}
      action={
        <button onClick={() => setShowAll(!showAll)} className={`${linkClass} inline-flex items-center gap-1`}>
          {showAll ? 'Toon komende weken' : `Alle ${weeks.length} weken`}
          {!showAll && <Icon name="arrow-right" className="size-4" />}
        </button>
      }
    >
      <div className="space-y-2">
        {visible.map((w) => (
          <WeekCard key={w.start} week={w} open={w.start === current} />
        ))}
      </div>
    </Card>
  )
}

function WeekCard({ week, open }: { week: PlanWeek; open: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i))
  return (
    <details open={open} className="group rounded-xl border border-line bg-subtle">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-3 transition hover:bg-hover sm:p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-sm font-semibold text-fg-2 tabular-nums shadow-sm">
          {week.index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg tabular-nums">
            {formatShortDate(week.start)} – {formatShortDate(addDays(week.start, 6))}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-3">
            <span>{week.raceWeek ? 'Raceweek 🏁' : week.phase.name}</span>
            {week.recovery && <span className={pillClass}>herstelweek</span>}
            <span>· {week.sessions.length} sessies</span>
          </p>
        </div>
        <span className="text-base font-semibold tracking-tight text-fg tabular-nums">{formatDuration(week.minutes)}</span>
        <Icon name="chevron-down" className="size-4 text-fg-3 transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
        {days.map((d) => {
          const sessions = week.sessions.filter((s) => s.date === d)
          const isRace = week.raceWeek && d === addDays(week.start, 6)
          return (
            <div key={d} className={`rounded-lg p-3 ${isRace ? 'bg-brand/10' : sessions.length ? 'border border-line bg-surface' : ''}`}>
              <p className={`mb-1.5 text-[11px] font-semibold tracking-wide uppercase ${isRace ? 'text-brand' : 'text-fg-3'}`}>
                {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {isRace ? (
                <p className="text-sm font-semibold text-fg">🏁 {RACE.name}</p>
              ) : sessions.length ? (
                <ul className="space-y-2.5">
                  {sessions.map((s, i) => {
                    const pace = formatPace(s.sport, s.duration_min, s.distance_km)
                    return (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1 h-3.5 w-1 shrink-0 rounded-full ${SPORT_BG[s.sport]}`} />
                        <div className="min-w-0">
                          <p className="text-sm leading-tight font-medium text-fg">{s.title}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-fg-3 tabular-nums">
                            <span>{formatDuration(s.duration_min)}</span>
                            {s.distance_km ? <span>~{s.distance_km} km</span> : null}
                            {pace && <span className="text-fg-4">{pace}</span>}
                          </p>
                          {s.notes && <p className="mt-0.5 text-xs text-fg-3">{s.notes}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-fg-4">Rust</p>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}
