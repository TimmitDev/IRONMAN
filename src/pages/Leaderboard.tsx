import { useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { useAuth } from '../lib/auth'
import { compliance, ironmanFraction, useLeaderboard, useProfile, type LeaderboardRow, type Profile } from '../lib/leaderboard'
import { RACE, addDays, formatDuration, toISODate, todayISO, weekStart } from '../lib/race'
import { SPORT_BG, SPORT_LABEL } from '../lib/types'
import { errorMessage, inputClass, labelClass, primaryButton } from '../lib/ui'

type Period = 'week' | 'month' | 'all'
type Metric = 'hours' | 'ironman' | 'days' | 'compliance'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Deze week' },
  { key: 'month', label: 'Deze maand' },
  { key: 'all', label: 'Sinds start' },
]

const METRICS: { key: Metric; label: string; hint: string }[] = [
  { key: 'hours', label: 'Uren', hint: 'Totale trainingstijd, opgesplitst per sport.' },
  { key: 'ironman', label: 'IRONMAN-afstand', hint: 'Zwem-, fiets- en loopkilometers als deel van een volledige IRONMAN (3,8 + 180 + 42,2 km, elk even zwaar).' },
  { key: 'days', label: 'Actieve dagen', hint: 'Aantal dagen met minstens één training.' },
  { key: 'compliance', label: 'Schema-trouw', hint: 'Welk deel van je geplande sessies (tot vandaag) je echt gedaan hebt.' },
]

interface Title {
  name: string
  hint: string
  value: (r: LeaderboardRow) => number
}

const TITLES: Title[] = [
  { name: 'IJzervreter', hint: 'meeste uren', value: (r) => r.total_min },
  { name: 'Zwemkoning', hint: 'meeste zwem-km', value: (r) => r.swim_km },
  { name: 'Fietsbeest', hint: 'meeste fiets-km', value: (r) => r.bike_km },
  { name: 'Loopmachine', hint: 'meeste loop-km', value: (r) => r.run_km },
  { name: 'Stalen discipline', hint: 'beste schema-trouw (min. 3 geplande sessies)', value: (r) => (r.planned >= 3 ? compliance(r)! : 0) },
]

function periodRange(period: Period): [string, string] {
  const today = new Date()
  if (period === 'week') {
    const start = weekStart(today)
    return [start, addDays(start, 6)]
  }
  if (period === 'month') {
    return [toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0))]
  }
  return ['2000-01-01', todayISO()]
}

function metricValue(r: LeaderboardRow, metric: Metric): number {
  switch (metric) {
    case 'hours':
      return r.total_min
    case 'ironman':
      return ironmanFraction(r)
    case 'days':
      return r.active_days
    case 'compliance':
      return compliance(r) ?? -1
  }
}

function formatIronman(x: number) {
  return x >= 1 ? `${x.toFixed(2).replace('.', ',')}×` : `${Math.round(x * 100)}%`
}

function formatMetric(r: LeaderboardRow, metric: Metric): { main: string; sub: string } {
  switch (metric) {
    case 'hours':
      return { main: r.total_min ? formatDuration(r.total_min) : '0', sub: `${r.sessions} ${r.sessions === 1 ? 'sessie' : 'sessies'}` }
    case 'ironman':
      return { main: formatIronman(ironmanFraction(r)), sub: `${Math.round(r.swim_km * 10) / 10} · ${Math.round(r.bike_km)} · ${Math.round(r.run_km * 10) / 10} km` }
    case 'days':
      return { main: String(r.active_days), sub: r.active_days === 1 ? 'dag' : 'dagen' }
    case 'compliance': {
      const c = compliance(r)
      return { main: c === null ? '–' : `${Math.round(c * 100)}%`, sub: r.planned ? `${r.planned_done}/${r.planned} gepland` : 'niets gepland' }
    }
  }
}

function barSegments(r: LeaderboardRow, metric: Metric): { cls: string; value: number; label: string }[] {
  if (metric === 'hours')
    return (['swim', 'bike', 'run', 'strength'] as const).map((s) => ({ cls: SPORT_BG[s], value: r[`${s}_min`], label: `${SPORT_LABEL[s]} ${formatDuration(r[`${s}_min`])}` }))
  if (metric === 'ironman')
    return (['swim', 'bike', 'run'] as const).map((s) => {
      const part = r[`${s}_km`] / 3 / RACE.distances[s]
      return { cls: SPORT_BG[s], value: part, label: `${SPORT_LABEL[s]} ${Math.round(r[`${s}_km`] * 10) / 10} km` }
    })
  return [{ cls: 'bg-brand', value: Math.max(0, metricValue(r, metric)), label: '' }]
}

export function Leaderboard() {
  const { session } = useAuth()
  const { profile, loading: profileLoading, save } = useProfile()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('hours')
  const [from, to] = periodRange(period)
  const { rows, loading, error } = useLeaderboard(from, to, profile)

  if (profileLoading) return <p className="text-sm text-zinc-500">Laden…</p>
  if (!profile) return <JoinCard defaultName={session!.user.email!.split('@')[0]} onSave={save} />

  const ranked = [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
  const max = metric === 'compliance' ? 1 : Math.max(0, ...ranked.map((r) => metricValue(r, metric)))
  const titles = new Map<string, Title[]>()
  if (rows.length >= 2) {
    for (const t of TITLES) {
      const best = Math.max(...rows.map(t.value))
      if (best <= 0) continue
      for (const r of rows) if (t.value(r) === best) titles.set(r.user_id, [...(titles.get(r.user_id) ?? []), t])
    }
  }
  const metricInfo = METRICS.find((m) => m.key === metric)!

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        <Segmented options={METRICS} value={metric} onChange={setMetric} />
      </div>

      <Card title={`Leaderboard · ${PERIODS.find((p) => p.key === period)!.label}`}>
        <p className="-mt-2 mb-4 text-sm text-zinc-400">{metricInfo.hint}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && ranked.length === 0 && <p className="text-sm text-zinc-500">Nog niemand op het leaderboard.</p>}
        <ol className={`space-y-3 ${loading ? 'opacity-50' : ''}`}>
          {ranked.map((r, i) => {
            const isMe = r.user_id === session!.user.id
            const value = Math.max(0, metricValue(r, metric))
            const { main, sub } = formatMetric(r, metric)
            const segments = barSegments(r, metric).filter((s) => s.value > 0)
            return (
              <li key={r.user_id} className={`rounded-xl border p-4 ${isMe ? 'border-brand/40 bg-brand/5' : 'border-white/5 bg-zinc-800/40'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 shrink-0 text-center text-3xl font-black italic ${i === 0 ? 'text-brand' : 'text-zinc-600'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <span className="truncate">{r.display_name}</span>
                      {isMe && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-zinc-300 uppercase">jij</span>}
                    </p>
                    {titles.get(r.user_id) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {titles.get(r.user_id)!.map((t) => (
                          <span key={t.name} title={t.hint} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-black tracking-tight text-white tabular-nums">{main}</p>
                    <p className="text-xs text-zinc-400">{sub}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-800">
                  <div className="flex h-full gap-[2px] overflow-hidden rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}>
                    {segments.map((s) => (
                      <div key={s.cls} className={s.cls} style={{ flexGrow: s.value }} title={s.label} />
                    ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        {(metric === 'hours' || metric === 'ironman') && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            {(metric === 'hours' ? (['swim', 'bike', 'run', 'strength'] as const) : (['swim', 'bike', 'run'] as const)).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                {SPORT_LABEL[s]}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Titels">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {TITLES.map((t) => (
            <li key={t.name}>
              <span className="font-semibold text-white">{t.name}</span> <span className="text-zinc-400">· {t.hint}</span>
            </li>
          ))}
        </ul>
      </Card>

      <ProfileCard profile={profile} onSave={save} />
    </div>
  )
}

function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/70 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.key ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

type SaveProfile = (p: Pick<Profile, 'display_name' | 'show_on_leaderboard'>) => Promise<void>

function JoinCard({ defaultName, onSave }: { defaultName: string; onSave: SaveProfile }) {
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await onSave({ display_name: name.trim(), show_on_leaderboard: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-2xl font-black">Doe mee met het leaderboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Anderen zien alleen je naam en totalen (uren, km, sessies). Notities en losse trainingen blijven privé.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className={labelClass}>Naam op het leaderboard</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required />
          </label>
          <button type="submit" className={primaryButton}>
            Meedoen
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </Card>
    </div>
  )
}

function ProfileCard({ profile, onSave }: { profile: Profile; onSave: SaveProfile }) {
  const [name, setName] = useState(profile.display_name)
  const [visible, setVisible] = useState(profile.show_on_leaderboard)
  const [status, setStatus] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await onSave({ display_name: name.trim(), show_on_leaderboard: visible })
      setStatus('Opgeslagen.')
    } catch (err) {
      setStatus(errorMessage(err))
    }
  }

  return (
    <Card title="Jouw profiel">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className={labelClass}>Naam</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-300">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-brand" />
          Zichtbaar op leaderboard
        </label>
        <button type="submit" className={primaryButton}>
          Opslaan
        </button>
        {status && <span className="pb-2 text-sm text-zinc-400">{status}</span>}
      </form>
    </Card>
  )
}
