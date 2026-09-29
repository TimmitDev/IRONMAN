import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { ProgressBar } from '../components/ProgressBar'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
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
import { RACE_TYPES, addDays, formatDuration, formatPace, formatShortDate, parseISODate, racePassed, toISODate, weekStart } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { SPORTS, SPORT_BG, SPORT_LABEL } from '../lib/types'
import { ask } from '../lib/feedback'
import { errorMessage, inputClass, labelClass, linkClass, pillClass, primaryButton, secondaryButton } from '../lib/ui'

export function IronmanPlan({ onShowSchedule }: { onShowSchedule: () => void }) {
  const { settings, loading, error, save } = usePlanSettings()
  const race = useRace()
  const [editing, setEditing] = useState(false)
  const weeks = useMemo(() => (settings ? generatePlan(settings, race) : []), [settings, race])

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Laden">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (!settings || editing) {
    return (
      <div className="max-w-3xl space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Card
          title={settings ? 'Plan aanpassen' : 'Stel je raceplan samen'}
          description={
            <>
              Een opbouwschema van week tot week richting {race.name} ({RACE_TYPES[race.type].label.toLowerCase()}) op{' '}
              {race.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}: basis, opbouw, piek en
              taper, met elke 4e week een herstelweek. Andere race?{' '}
              <Link to="/instellingen" className={linkClass}>
                Wijzig ze in je instellingen
              </Link>
              .
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

  // Race voorbij of plan start na de raceweek: er valt niets te plannen.
  if (!weeks.length) {
    return (
      <div className="max-w-3xl">
        <Card>
          <EmptyState
            icon="flag"
            title={racePassed(race) ? 'Je race is voorbij' : 'Geen weken om te plannen'}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/instellingen" className={primaryButton}>
                  <Icon name="flag" className="size-4" />
                  Kies je volgende race
                </Link>
                <button onClick={() => setEditing(true)} className={secondaryButton}>
                  <Icon name="settings" className="size-4" />
                  Plan aanpassen
                </button>
              </div>
            }
          >
            {racePassed(race)
              ? `${race.name} ligt achter je. Kies je volgende race, dan bouwt je plan daar naartoe.`
              : `Je plan start na de raceweek van ${race.name}. Kies een andere race of een vroegere startdatum.`}
          </EmptyState>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ThisWeek weeks={weeks} />
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
  const race = useRace()
  const scale = RACE_TYPES[race.type].planScale
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
                className={`relative rounded-xl border p-4 text-left transition focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none ${
                  active ? 'border-fg-3 bg-subtle' : 'border-line hover:border-line-strong hover:bg-hover'
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-fg text-canvas">
                    <Icon name="check" className="size-3" strokeWidth={2.5} />
                  </span>
                )}
                <p className="pr-6 text-sm font-medium text-fg">{level.label}</p>
                <p className="mt-1 text-xs text-fg-3">{level.description}</p>
                <p className="mt-3 text-xs text-fg-2 tabular-nums">Piekweek ±{Math.round(level.peakHours * scale)} uur</p>
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

/** Opeenvolgende weken met dezelfde fase, voor de faseband. */
function phaseRuns(weeks: PlanWeek[]) {
  return weeks.reduce<{ name: string; count: number }[]>((acc, w) => {
    const last = acc[acc.length - 1]
    if (last?.name === w.phase.name) last.count++
    else acc.push({ name: w.phase.name, count: 1 })
    return acc
  }, [])
}

/** Waar je nu staat: week x van y, de fases als dunne band, en de sessies van deze week. */
function ThisWeek({ weeks }: { weeks: PlanWeek[] }) {
  const race = useRace()
  const raceDate = toISODate(race.date)
  const today = toISODate(new Date())
  const idx = weeks.findIndex((w) => w.start === weekStart(new Date()))
  const current = idx >= 0 ? weeks[idx] : null
  const notStarted = !current && weeks[0].start > today
  // Voor de start telt week 0; na het plan alle weken.
  const done = current ? current.index : notStarted ? 0 : weeks.length
  const runs = phaseRuns(weeks)
  const weeksLeft = weeks.length - done

  const days = current ? Array.from({ length: 7 }, (_, i) => addDays(current.start, i)) : []
  const sessionsLeft = current ? current.sessions.filter((s) => s.date >= today) : []

  return (
    <Card
      title="Deze week in je plan"
      description={
        current ? (
          <>
            {current.raceWeek ? 'Raceweek' : `Fase ${current.phase.name}`} · {current.recovery ? 'herstelweek' : 'geen herstelweek'} ·{' '}
            <span className="tabular-nums">{formatDuration(current.minutes)}</span> in {current.sessions.length} sessies
          </>
        ) : notStarted ? (
          `Je plan start op ${formatShortDate(weeks[0].start)}.`
        ) : (
          'Je plan is afgelopen.'
        )
      }
    >
      <div className="space-y-5">
        {/* Voortgang door het plan. */}
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-fg tabular-nums">
              Week {done} van {weeks.length}
            </span>
            <span className="text-xs text-fg-3 tabular-nums">
              {weeksLeft > 0 ? `nog ${weeksLeft} ${weeksLeft === 1 ? 'week' : 'weken'} tot ${race.name}` : `${race.name} deze week`}
            </span>
          </div>
          <ProgressBar value={done} max={weeks.length} color="bg-fg-2" />
          <div className="mt-3 flex gap-[2px]">
            {runs.map((p, i) => {
              const from = runs.slice(0, i).reduce((a, r) => a + r.count, 0)
              const isNow = idx >= from && idx < from + p.count
              return (
                <div key={`${p.name}-${i}`} style={{ flexGrow: p.count, flexBasis: 0 }} className="min-w-0">
                  <div className={`h-0.5 rounded-full ${isNow ? 'bg-fg-2' : 'bg-muted'}`} />
                  <span
                    className={`mt-1 flex items-center gap-1 truncate text-[10px] ${isNow ? 'font-medium text-fg' : 'text-fg-3'} ${
                      p.count < 4 && !isNow ? 'hidden sm:flex' : ''
                    }`}
                  >
                    {isNow && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Huidige fase" />}
                    <span className="truncate">{p.name}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sessies van deze week, compact. */}
        {current && (
          <div className="border-t border-line pt-4">
            <p className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs text-fg-3">
              <span>Sessies</span>
              <span className="tabular-nums">
                {sessionsLeft.length ? `nog ${sessionsLeft.length} vanaf vandaag` : 'alles achter de rug'}
              </span>
            </p>
            <ul className="divide-y divide-line">
              {days.map((d) => {
                const sessions = current.sessions.filter((s) => s.date === d)
                const isRace = current.raceWeek && d === raceDate
                if (!sessions.length && !isRace) return null
                const isToday = d === today
                const past = d < today
                return (
                  <li key={d} className="flex gap-3 py-2 text-sm">
                    <span className={`flex w-10 shrink-0 items-center gap-1 text-xs ${isToday ? 'font-medium text-fg' : 'text-fg-3'}`}>
                      {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short' }).replace('.', '')}
                      {isToday && <span className="size-1.5 rounded-full bg-brand" aria-label="Vandaag" />}
                    </span>
                    <ul className={`min-w-0 flex-1 space-y-1 ${past ? 'text-fg-3' : 'text-fg'}`}>
                      {isRace && <li className="font-medium">{race.name}</li>}
                      {sessions.map((s, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className={`size-1.5 shrink-0 rounded-full ${SPORT_BG[s.sport]}`} aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{s.title}</span>
                          <span className="shrink-0 text-xs text-fg-3 tabular-nums">{formatDuration(s.duration_min)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

function Summary({ settings, weeks, onEdit }: { settings: PlanSettings; weeks: PlanWeek[]; onEdit: () => void }) {
  const total = weeks.reduce((a, w) => a + w.minutes, 0)
  const peak = Math.max(...weeks.map((w) => w.minutes))
  const level = LEVELS[settings.level]
  return (
    <Card
      title={`Jouw raceplan · ${level.label}`}
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
        <Stat tile label="Gemiddeld" value={formatDuration(total / weeks.length)} sub="per week" />
      </div>
    </Card>
  )
}

function PlanChart({ weeks }: { weeks: PlanWeek[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const thisWeek = weekStart(new Date())
  const maxMin = Math.max(...weeks.map((w) => w.minutes))
  const maxH = Math.ceil(maxMin / 60 / 5) * 5
  const phases = phaseRuns(weeks)
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
                className={`w-full origin-bottom animate-grow-y rounded-t-sm transition-opacity ${
                  w.start === thisWeek ? 'bg-brand' : w.recovery ? 'bg-line-strong' : 'bg-fg-3'
                } ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
                // Lichte stagger van links naar rechts, afgetopt zodat lange plannen niet blijven hangen.
                style={{ height: `${(w.minutes / 60 / maxH) * 100}%`, animationDelay: `${Math.min(i * 20, 600)}ms` }}
              />
            </div>
          ))}
        </div>

        {hovered && (
          <div className="pointer-events-none absolute top-0 right-0 z-10 w-52 rounded-lg border border-line bg-surface p-3 text-xs">
            <p className="font-medium text-fg">
              Week {hovered.index} · {formatShortDate(hovered.start)}
            </p>
            <p className="text-fg-3">
              {hovered.raceWeek ? 'Raceweek' : hovered.phase.name}
              {hovered.recovery ? ' · herstelweek' : ''}
            </p>
            <div className="mt-2 space-y-1">
              {SPORTS.map((s) => {
                const min = hovered.sessions.filter((x) => x.sport === s).reduce((a, x) => a + x.duration_min, 0)
                return min ? (
                  <div key={s} className="flex justify-between text-fg-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{formatDuration(min)}</span>
                  </div>
                ) : null
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-medium text-fg">
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
    const ok = await ask({
      title: `Plan-sessies t/m ${formatShortDate(until)} in je schema zetten?`,
      body: 'Eerder toegepaste plan-sessies die je nog niet deed, worden vervangen. Je eigen sessies blijven staan.',
      confirm: 'In schema zetten',
    })
    if (!ok) return
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
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-4 text-sm text-fg-2">
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
      <div className="-mx-5 divide-y divide-line border-t border-line sm:-mx-6">
        {visible.map((w) => (
          <WeekCard key={w.start} week={w} open={w.start === current} />
        ))}
      </div>
    </Card>
  )
}

function WeekCard({ week, open }: { week: PlanWeek; open: boolean }) {
  const race = useRace()
  const raceDate = toISODate(race.date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i))
  return (
    <details open={open} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 transition hover:bg-hover sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="w-6 shrink-0 text-sm text-fg-3 tabular-nums">{week.index}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-fg tabular-nums">
            {open && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Deze week" />}
            {formatShortDate(week.start)} – {formatShortDate(addDays(week.start, 6))}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-3">
            <span>{week.raceWeek ? 'Raceweek' : week.phase.name}</span>
            {week.recovery && <span className={pillClass}>herstelweek</span>}
            <span>· {week.sessions.length} sessies</span>
          </p>
        </div>
        <span className="text-sm font-medium tracking-tight text-fg tabular-nums">{formatDuration(week.minutes)}</span>
        <Icon name="chevron-down" className="size-4 text-fg-4 transition group-open:rotate-180" />
      </summary>
      <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {days.map((d) => {
          const sessions = week.sessions.filter((s) => s.date === d)
          const isRace = week.raceWeek && d === raceDate
          return (
            <div key={d} className={`rounded-lg p-3 ${isRace ? 'border border-fg-3' : sessions.length ? 'border border-line' : ''}`}>
              <p className={`mb-1.5 flex items-center gap-1.5 text-xs ${isRace ? 'font-medium text-fg' : 'text-fg-3'}`}>
                {isRace && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
                {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {isRace ? (
                <p className="text-sm font-medium text-fg">{race.name}</p>
              ) : sessions.length ? (
                <ul className="space-y-2.5">
                  {sessions.map((s, i) => {
                    const pace = formatPace(s.sport, s.duration_min, s.distance_km)
                    return (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1 h-3.5 w-0.5 shrink-0 rounded-full ${SPORT_BG[s.sport]}`} />
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
