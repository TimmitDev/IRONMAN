import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { compliance, formatIronman, ironmanFraction, useLeaderboard, type LeaderboardRow } from '../lib/leaderboard'
import { usePlayerSearch } from '../lib/players'
import { useMe } from '../lib/profile'
import { IRONMAN_DISTANCES, addDays, formatDuration, toISODate, todayISO, weekStart } from '../lib/race'
import { SPORT_BG, SPORT_LABEL } from '../lib/types'
import { inputClass, pillClass, secondaryButton } from '../lib/ui'

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
      const part = r[`${s}_km`] / 3 / IRONMAN_DISTANCES[s]
      return { cls: SPORT_BG[s], value: part, label: `${SPORT_LABEL[s]} ${Math.round(r[`${s}_km`] * 10) / 10} km` }
    })
  return [{ cls: 'bg-brand', value: Math.max(0, metricValue(r, metric)), label: '' }]
}

export function Leaderboard() {
  const { me } = useMe()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('hours')
  const [from, to] = periodRange(period)
  const { rows, loading, error } = useLeaderboard(from, to, me)

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
  const legend = metric === 'hours' ? (['swim', 'bike', 'run', 'strength'] as const) : metric === 'ironman' ? (['swim', 'bike', 'run'] as const) : null

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Vergelijk je training met de groep: per week, maand of sinds de start, op uren, afstand, actieve dagen of schema-trouw."
        actions={
          <>
            <Link to="/uitdagingen" className={secondaryButton}>
              <Icon name="flag" className="size-4" />
              Uitdagingen
            </Link>
            <Link to="/instellingen" className={secondaryButton}>
              <Icon name="shield" className="size-4" />
              Profiel & privacy
            </Link>
          </>
        }
      />

      {/* Mobiel: zoeken, ranking, titels onder elkaar. Desktop: ranking links, zoeken en titels rechts. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:items-start">
        <div className="xl:col-start-2 xl:row-start-1">
          <PlayerSearch />
        </div>

        <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <Segmented options={METRICS} value={metric} onChange={setMetric} />
          </div>

          <Card flush title={`Ranking · ${PERIODS.find((p) => p.key === period)!.label}`} description={metricInfo.hint}>
            {error && <p className="px-5 pb-4 text-sm text-danger sm:px-6">{error}</p>}
            {!loading && ranked.length === 0 && !error && (
              <EmptyState icon="trophy" title="Nog niemand op het leaderboard">
                Zodra spelers zichtbaar zijn en trainen, verschijnen ze hier.
              </EmptyState>
            )}
            {loading && ranked.length === 0 && (
              <div className="space-y-2 px-5 pb-5 sm:px-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            )}
            <ol className={`divide-y divide-line border-t border-line ${ranked.length ? '' : 'hidden'} ${loading ? 'opacity-50' : ''}`}>
              {ranked.map((r, i) => {
                const isMe = r.user_id === me.id
                const value = Math.max(0, metricValue(r, metric))
                const { main, sub } = formatMetric(r, metric)
                const segments = barSegments(r, metric).filter((s) => s.value > 0)
                const rowTitles = titles.get(r.user_id)
                return (
                  <li key={r.user_id}>
                    <Link
                      to={`/leaderboard/${r.user_id}`}
                      className={`block px-5 py-4 transition sm:px-6 ${isMe ? 'bg-brand/5 hover:bg-brand/10' : 'hover:bg-hover'}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                            i === 0 ? 'bg-brand text-white' : i < 3 ? 'bg-brand/10 text-brand' : 'bg-muted text-fg-3'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <Avatar name={r.display_name} highlight={isMe} />
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-2 font-semibold text-fg">
                            <span className="truncate">{r.display_name}</span>
                            {isMe && <span className={pillClass}>jij</span>}
                          </p>
                          {rowTitles && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {rowTitles.map((t) => (
                                <span key={t.name} title={t.hint} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                                  <Icon name="trophy" className="size-3" />
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold tracking-tight text-fg tabular-nums sm:text-xl">{main}</p>
                          <p className="text-xs text-fg-3">{sub}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted sm:ml-12">
                        <div className="flex h-full gap-[2px] overflow-hidden rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}>
                          {segments.map((s) => (
                            <div key={s.cls} className={s.cls} style={{ flexGrow: s.value }} title={s.label} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ol>
            {legend && ranked.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-5 py-3 text-xs text-fg-3 sm:px-6">
                {legend.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className={`size-2 rounded-sm ${SPORT_BG[s]}`} />
                    {SPORT_LABEL[s]}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="xl:col-start-2 xl:row-start-2">
          <Card title="Titels" description="De beste in elke categorie krijgt een titel (vanaf twee spelers).">
            <ul className="divide-y divide-line">
              {TITLES.map((t) => (
                <li key={t.name} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon name="trophy" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{t.name}</p>
                    <p className="text-xs text-fg-3">{t.hint.charAt(0).toUpperCase() + t.hint.slice(1)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function PlayerSearch() {
  const [query, setQuery] = useState('')
  const { hits, loading } = usePlayerSearch(query)

  return (
    <Card title="Spelers zoeken">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-4" />
        <input
          type="search"
          className={`${inputClass} pl-10`}
          placeholder="Zoek een speler…"
          aria-label="Zoek een speler"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() && (
        <ul className={`-mx-2 mt-3 ${loading ? 'opacity-50' : ''}`}>
          {hits.map((h) => (
            <li key={h.id}>
              <Link to={`/leaderboard/${h.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-fg transition hover:bg-hover">
                <Avatar name={h.display_name} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{h.display_name}</span>
                <Icon name="chevron-right" className="size-4 text-fg-4" />
              </Link>
            </li>
          ))}
          {!loading && !hits.length && <li className="px-2 py-2 text-sm text-fg-3">Geen spelers gevonden.</li>}
        </ul>
      )}
    </Card>
  )
}
