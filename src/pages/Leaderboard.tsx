import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Delta, KpiStrip } from '../components/KpiStrip'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Skeleton, SkeletonRows } from '../components/Skeleton'
import { signed } from '../lib/stats'
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

/** Vorige week of maand, als vergelijkingspunt voor de beweging in de ranking. Null bij "Sinds start". */
function previousRange(period: Period): [string, string] | null {
  const today = new Date()
  if (period === 'week') {
    const start = addDays(weekStart(today), -7)
    return [start, addDays(start, 6)]
  }
  if (period === 'month') {
    return [toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), toISODate(new Date(today.getFullYear(), today.getMonth(), 0))]
  }
  return null
}

const PREVIOUS_LABEL: Record<Period, string> = { week: 'vorige week', month: 'vorige maand', all: '' }

/** Rangorde op de gekozen metriek (hoogste eerst). */
const rank = (rows: LeaderboardRow[], metric: Metric) => [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))

/** Verschil in de eenheid van de metriek: "45 min", "12% IRONMAN", "2 dagen", "8%-punt". */
function formatGap(diff: number, metric: Metric): string {
  switch (metric) {
    case 'hours':
      return formatDuration(Math.max(1, diff))
    case 'ironman':
      return `${Math.max(1, Math.round(diff * 100))}% IRONMAN`
    case 'days':
      return `${diff} ${diff === 1 ? 'dag' : 'dagen'}`
    case 'compliance':
      return `${Math.max(1, Math.round(diff * 100))}%-punt`
  }
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
  return [{ cls: 'bg-fg-3', value: Math.max(0, metricValue(r, metric)), label: '' }]
}

export function Leaderboard() {
  const { me } = useMe()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('hours')
  const [from, to] = periodRange(period)
  const { rows, loading, error } = useLeaderboard(from, to, me)
  // Hooks mogen niet voorwaardelijk: bij "Sinds start" vraagt dit dezelfde periode op, maar tonen we geen beweging.
  const prevRange = previousRange(period)
  const [prevFrom, prevTo] = prevRange ?? [from, to]
  const prev = useLeaderboard(prevFrom, prevTo, me)

  const ranked = rank(rows, metric)
  const prevRank = new Map<string, number>()
  if (prevRange && !prev.loading) rank(prev.rows, metric).forEach((r, i) => prevRank.set(r.user_id, i + 1))
  /** Aantal plaatsen gestegen (positief) of gezakt t.o.v. de vorige periode; null als er niets te vergelijken valt. */
  const movement = (userId: string, now: number): number | null => {
    const before = prevRank.get(userId)
    return before === undefined ? null : before - now
  }
  // Podium vanaf drie spelers; de lijst eronder begint dan bij #4.
  const podium = ranked.length >= 3 ? ranked.slice(0, 3) : []
  const rest = ranked.slice(podium.length)
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
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr] xl:items-start">
        <div className="xl:col-start-2 xl:row-start-1">
          <PlayerSearch />
        </div>

        <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <Segmented options={METRICS} value={metric} onChange={setMetric} />
          </div>

          <MyPosition
            ranked={ranked}
            meId={me.id}
            metric={metric}
            period={period}
            loading={loading && ranked.length === 0}
            prevLoading={prev.loading}
            prevRank={prevRank}
          />

          <Card flush title={`Ranking · ${PERIODS.find((p) => p.key === period)!.label}`} description={metricInfo.hint}>
            {error && <p className="px-5 pb-4 text-sm text-danger sm:px-6">{error}</p>}
            {!loading && ranked.length === 0 && !error && (
              <EmptyState icon="trophy" title="Nog niemand op het leaderboard">
                Zodra spelers zichtbaar zijn en trainen, verschijnen ze hier.
              </EmptyState>
            )}
            {loading && ranked.length === 0 && (
              <div className="space-y-6 px-5 pb-5 sm:px-6" role="status" aria-label="Laden">
                <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                  {['h-28', 'h-36', 'h-24'].map((h) => (
                    <Skeleton key={h} className={`${h} w-full`} />
                  ))}
                </div>
                <SkeletonRows rows={4} />
              </div>
            )}
            {podium.length > 0 && (
              <div className={loading ? 'opacity-50' : ''}>
                <Podium top={podium} meId={me.id} metric={metric} titles={titles} movement={prevRange ? movement : null} />
              </div>
            )}
            <ol className={`divide-y divide-line border-t border-line ${rest.length ? '' : 'hidden'} ${loading ? 'opacity-50' : ''}`}>
              {rest.map((r, j) => {
                const i = j + podium.length
                const isMe = r.user_id === me.id
                const value = Math.max(0, metricValue(r, metric))
                const { main, sub } = formatMetric(r, metric)
                const segments = barSegments(r, metric).filter((s) => s.value > 0)
                const rowTitles = titles.get(r.user_id)
                return (
                  <li key={r.user_id}>
                    <Link
                      to={`/leaderboard/${r.user_id}`}
                      className={`block px-5 py-4 transition hover:bg-hover sm:px-6 ${isMe ? 'bg-subtle' : ''}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="relative flex w-7 shrink-0 flex-col items-center text-sm text-fg-3 tabular-nums">
                          {i + 1}
                          {i === 0 && <span className="absolute top-0 right-0 size-1.5 rounded-full bg-brand" aria-hidden />}
                          {prevRange && <Move delta={movement(r.user_id, i + 1)} />}
                        </span>
                        <Avatar name={r.display_name} highlight={isMe} />
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg">
                            <span className="truncate">{r.display_name}</span>
                            {isMe && <span className={pillClass}>jij</span>}
                          </p>
                          {rowTitles && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {rowTitles.map((t) => (
                                <span key={t.name} title={t.hint} className={pillClass}>
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-medium tracking-tight text-fg tabular-nums">{main}</p>
                          <p className="text-xs text-fg-3">{sub}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-muted sm:ml-11">
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
                    <span className={`size-1.5 rounded-full ${SPORT_BG[s]}`} />
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
                <li key={t.name} className="flex items-center gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <Icon name="trophy" className="size-4 shrink-0 text-fg-4" />
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

/** Klein pijltje met het aantal plaatsen dat iemand steeg of zakte. */
function Move({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[11px] leading-4 text-fg-4" title="Niet in de vorige periode">nieuw</span>
  if (delta === 0) return <span className="text-[11px] leading-4 text-fg-4" title="Zelfde plaats als de vorige periode">–</span>
  return (
    <span className="text-[11px] leading-4" title={`${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'plaats' : 'plaatsen'} ${delta > 0 ? 'gestegen' : 'gezakt'}`}>
      <Delta value={delta}>
        {delta > 0 ? '↑' : '↓'}
        {Math.abs(delta)}
      </Delta>
    </span>
  )
}

/** Top 3 naast elkaar: #2 links, #1 in het midden (hoogste trede), #3 rechts. */
function Podium({
  top,
  meId,
  metric,
  titles,
  movement,
}: {
  top: LeaderboardRow[]
  meId: string
  metric: Metric
  titles: Map<string, Title[]>
  movement: ((userId: string, now: number) => number | null) | null
}) {
  const STEP = ['h-14', 'h-10', 'h-7']
  return (
    <div className="grid grid-cols-3 items-end gap-2 px-3 pb-5 sm:gap-4 sm:px-6">
      {[1, 0, 2].map((i) => {
        const r = top[i]
        const isMe = r.user_id === meId
        const { main, sub } = formatMetric(r, metric)
        const rowTitles = titles.get(r.user_id)
        return (
          <Link
            key={r.user_id}
            to={`/leaderboard/${r.user_id}`}
            className="group flex min-w-0 animate-fade-up flex-col items-center rounded-lg pt-3 text-center"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Avatar name={r.display_name} size={i === 0 ? 'lg' : 'md'} highlight={isMe} />
            <p className="mt-2 w-full truncate px-1 text-sm font-medium text-fg group-hover:underline group-hover:underline-offset-4">{r.display_name}</p>
            {isMe && <span className={`${pillClass} mt-1`}>jij</span>}
            <p className="mt-1 text-lg font-medium tracking-tight text-fg tabular-nums">{main}</p>
            <p className="w-full truncate px-1 text-xs text-fg-3">{sub}</p>
            {rowTitles && (
              <div className="mt-1.5 flex w-full flex-wrap justify-center gap-1 px-1">
                {rowTitles.map((t) => (
                  <span key={t.name} title={t.hint} className={`${pillClass} max-w-full truncate`}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
            <div
              className={`mt-3 flex w-full origin-bottom animate-grow-y flex-col items-center rounded-t-lg bg-subtle pt-1.5 ${STEP[i]}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="relative text-sm text-fg-3 tabular-nums">
                {i + 1}
                {i === 0 && <span className="absolute top-0 -right-2 size-1.5 rounded-full bg-brand" aria-hidden />}
              </span>
              {movement && <Move delta={movement(r.user_id, i + 1)} />}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

const loadingValue = <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-subtle align-middle" aria-hidden />

/** Kerncijfers over jezelf: rang, waarde, afstand tot de speler boven je en beweging t.o.v. de vorige periode. */
function MyPosition({
  ranked,
  meId,
  metric,
  period,
  loading,
  prevLoading,
  prevRank,
}: {
  ranked: LeaderboardRow[]
  meId: string
  metric: Metric
  period: Period
  loading: boolean
  prevLoading: boolean
  prevRank: Map<string, number>
}) {
  if (loading)
    return (
      <KpiStrip
        items={['Jouw positie', 'Jouw waarde', 'Tot de volgende plaats', 'Beweging'].map((label) => ({ label, value: loadingValue, sub: ' ' }))}
      />
    )

  const idx = ranked.findIndex((r) => r.user_id === meId)
  if (idx < 0)
    return (
      <KpiStrip
        items={[
          { label: 'Jouw positie', value: '—', sub: 'Je staat niet op het leaderboard' },
          { label: 'Jouw waarde', value: '—', sub: 'Check je privacy-instellingen' },
          { label: 'Tot de volgende plaats', value: '—' },
          { label: 'Beweging', value: '—' },
        ]}
      />
    )

  const mine = ranked[idx]
  const myValue = metricValue(mine, metric)
  const { main, sub } = formatMetric(mine, metric)
  const noPlan = metric === 'compliance' && myValue < 0

  let gap: { value: string; sub: string }
  if (noPlan) gap = { value: '—', sub: 'Niets gepland in deze periode' }
  else if (idx === 0) {
    const second = ranked[1]
    const lead = second ? myValue - Math.max(0, metricValue(second, metric)) : 0
    gap = { value: 'Koploper', sub: second ? (lead > 0 ? `${formatGap(lead, metric)} voor op #2` : 'gelijk met #2') : 'Alleen op het bord' }
  } else {
    const above = ranked[idx - 1]
    const diff = metricValue(above, metric) - myValue
    gap =
      diff > 0
        ? { value: formatGap(diff, metric), sub: `nog tot #${idx} · ${above.display_name}` }
        : { value: 'Gelijk', sub: `met #${idx} · ${above.display_name}` }
  }

  let move: { value: ReactNode; sub: string }
  if (period === 'all') move = { value: '—', sub: 'Enkel per week of maand' }
  else if (prevLoading) move = { value: loadingValue, sub: ' ' }
  else {
    const before = prevRank.get(meId)
    const d = before === undefined ? null : before - (idx + 1)
    move =
      d === null
        ? { value: '—', sub: `Niet op het bord ${PREVIOUS_LABEL[period]}` }
        : { value: <Delta value={d}>{signed(d)}</Delta>, sub: `${d === 1 || d === -1 ? 'plaats' : 'plaatsen'} t.o.v. ${PREVIOUS_LABEL[period]} (#${before})` }
  }

  return (
    <KpiStrip
      items={[
        { label: 'Jouw positie', value: `#${idx + 1}`, sub: `van ${ranked.length} ${ranked.length === 1 ? 'speler' : 'spelers'}` },
        { label: 'Jouw waarde', value: main, sub },
        { label: 'Tot de volgende plaats', ...gap },
        { label: 'Beweging', ...move },
      ]}
    />
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
              <Link to={`/leaderboard/${h.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-fg transition hover:bg-hover">
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
