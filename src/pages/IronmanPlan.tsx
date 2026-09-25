import { useMemo, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Segmented } from '../components/Segmented'
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
import { errorMessage, ghostButton, inputClass, labelClass, primaryButton } from '../lib/ui'

export function IronmanPlan({ onShowSchedule }: { onShowSchedule: () => void }) {
  const { settings, loading, error, save } = usePlanSettings()
  const [editing, setEditing] = useState(false)
  const weeks = useMemo(() => (settings ? generatePlan(settings) : []), [settings])

  if (loading) return <p className="text-sm text-zinc-500">Laden…</p>

  if (!settings || editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Card>
          <h2 className="text-2xl font-black">{settings ? 'Plan aanpassen' : 'Stel je IRONMAN-plan samen'}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Een opbouwschema van week tot week richting {RACE.name} op{' '}
            {RACE.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}: basis, opbouw, piek en
            taper, met elke 4e week een herstelweek.
          </p>
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
    <div className="space-y-4">
      <Summary settings={settings} weeks={weeks} onEdit={() => setEditing(true)} />
      <Card title="Uren per week">
        <PlanChart weeks={weeks} />
      </Card>
      <ApplyCard weeks={weeks} onShowSchedule={onShowSchedule} />
      <WeekList weeks={weeks} />
      <p className="text-xs text-zinc-500">
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
    <label>
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
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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
                className={`rounded-xl border p-3 text-left transition ${active ? 'border-brand bg-brand/10' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                <p className="font-semibold">{level.label}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{level.description}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-200">Piekweek ±{level.peakHours} uur</p>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        {daySelect('restDay', 'Rustdag')}
        {daySelect('longBikeDay', 'Lange rit')}
        {daySelect('longRunDay', 'Lange loop')}
      </div>

      <label className="block sm:w-1/3">
        <span className={labelClass}>Start van het plan</span>
        <input type="date" className={inputClass} value={s.startDate} onChange={(e) => set('startDate', e.target.value)} required />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? 'Opslaan…' : 'Plan genereren'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={ghostButton}>
            Annuleren
          </button>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
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
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Jouw IRONMAN-plan · {level.label}</p>
          <p className="mt-1 text-sm text-zinc-400">
            Rust op {DAY_NAMES[settings.restDay].toLowerCase()}, lange rit op {DAY_NAMES[settings.longBikeDay].toLowerCase()}, lange
            loop op {DAY_NAMES[settings.longRunDay].toLowerCase()}.
          </p>
        </div>
        <button onClick={onEdit} className={ghostButton}>
          Aanpassen
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Weken" value={String(weeks.length)} />
        <Stat label="Totaal" value={`${Math.round(total / 60)} u`} />
        <Stat label="Piekweek" value={formatDuration(peak)} />
        {current && <Stat label="Deze week" value={formatDuration(current.minutes)} sub={`${current.phase.name}${current.recovery ? ' · herstel' : ''}`} />}
      </div>
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">{label}</p>
      <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
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
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-zinc-400" /> Normale week
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-zinc-600" /> Herstelweek
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> Deze week
        </span>
      </div>

      <div className="relative">
        <div className="relative flex h-44 items-end gap-[2px] pl-7">
          {[0, maxH / 2, maxH].map((t) => (
            <div key={t} className="pointer-events-none absolute right-0 left-7 border-t border-zinc-800" style={{ bottom: `${(t / maxH) * 100}%` }}>
              <span className="absolute -top-2 -left-7 w-5 text-right text-[10px] text-zinc-500 tabular-nums">{t}u</span>
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
                  w.start === thisWeek ? 'bg-brand' : w.recovery ? 'bg-zinc-600' : 'bg-zinc-400'
                } ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
                style={{ height: `${(w.minutes / 60 / maxH) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {hovered && (
          <div className="pointer-events-none absolute top-0 right-0 z-10 w-48 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-2xl">
            <p className="font-semibold text-white">
              Week {hovered.index} · {formatShortDate(hovered.start)}
            </p>
            <p className="text-zinc-400">
              {hovered.raceWeek ? 'Raceweek 🏁' : hovered.phase.name}
              {hovered.recovery ? ' · herstelweek' : ''}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {SPORTS.map((s) => {
                const min = hovered.sessions.filter((x) => x.sport === s).reduce((a, x) => a + x.duration_min, 0)
                return min ? (
                  <div key={s} className="flex justify-between text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                      {SPORT_LABEL[s]}
                    </span>
                    <span className="tabular-nums">{formatDuration(min)}</span>
                  </div>
                ) : null
              })}
            </div>
            <div className="mt-1.5 flex justify-between border-t border-zinc-700 pt-1.5 font-semibold text-white">
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
            <div className="h-1 rounded-full bg-zinc-700" />
            <span className={`mt-1 block truncate text-[10px] text-zinc-500 ${p.count < 4 ? 'hidden sm:block' : ''}`}>{p.name}</span>
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
    <Card title="In je schema zetten">
      <p className="-mt-2 mb-3 text-sm text-zinc-400">
        Zet de sessies in je weekschema om ze af te vinken. Opnieuw toepassen vervangt enkel plan-sessies die je nog niet deed.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented options={[...RANGES]} value={range} onChange={setRange} />
        <button onClick={handleApply} disabled={busy} className={primaryButton}>
          {busy ? 'Bezig…' : 'In schema zetten'}
        </button>
      </div>
      {result && (
        <p className="mt-3 text-sm text-zinc-300">
          {result}{' '}
          <button onClick={onShowSchedule} className="font-semibold text-brand hover:underline">
            Bekijk weekschema →
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
        <button onClick={() => setShowAll(!showAll)} className="text-xs font-semibold text-brand hover:underline">
          {showAll ? 'Toon komende weken' : `Alle ${weeks.length} weken →`}
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
    <details open={open} className="group rounded-xl border border-white/5 bg-zinc-950/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="w-10 shrink-0 text-center text-xl font-black text-zinc-500 italic">{week.index}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {formatShortDate(week.start)} – {formatShortDate(addDays(week.start, 6))}
          </p>
          <p className="flex flex-wrap gap-1.5 text-xs text-zinc-400">
            <span>{week.raceWeek ? 'Raceweek 🏁' : week.phase.name}</span>
            {week.recovery && <span className="rounded bg-white/10 px-1.5 text-zinc-300">herstelweek</span>}
            <span>· {week.sessions.length} sessies</span>
          </p>
        </div>
        <span className="text-lg font-black tabular-nums">{formatDuration(week.minutes)}</span>
        <span className="text-zinc-500 transition group-open:rotate-90" aria-hidden>
          ›
        </span>
      </summary>
      <div className="grid gap-2 border-t border-white/5 p-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((d) => {
          const sessions = week.sessions.filter((s) => s.date === d)
          const isRace = week.raceWeek && d === addDays(week.start, 6)
          return (
            <div key={d} className={`rounded-lg p-2.5 ${isRace ? 'bg-brand/15' : 'bg-zinc-900'}`}>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                {parseISODate(d).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {isRace ? (
                <p className="text-sm font-bold text-white">🏁 {RACE.name}</p>
              ) : sessions.length ? (
                <ul className="space-y-2">
                  {sessions.map((s, i) => {
                    const pace = formatPace(s.sport, s.duration_min, s.distance_km)
                    return (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1 h-3.5 w-1 shrink-0 rounded-full ${SPORT_BG[s.sport]}`} />
                        <div className="min-w-0">
                          <p className="text-sm leading-tight font-medium">{s.title}</p>
                          <p className="flex flex-wrap gap-x-1.5 text-xs text-zinc-400">
                            <span>{formatDuration(s.duration_min)}</span>
                            {s.distance_km ? <span>~{s.distance_km} km</span> : null}
                            {pace && <span className="text-zinc-500">{pace}</span>}
                          </p>
                          {s.notes && <p className="mt-0.5 text-xs text-zinc-500">{s.notes}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-xs text-zinc-600">Rust</p>
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}
