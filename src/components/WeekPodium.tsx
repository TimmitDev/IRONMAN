import { Link } from 'react-router-dom'
import { useLeaderboard } from '../lib/leaderboard'
import { useMe } from '../lib/profile'
import { addDays, formatDuration, weekStart } from '../lib/race'
import { linkClass } from '../lib/ui'
import { Card } from './Card'
import { Icon } from './Icon'

/** Top 3 in uren deze week, plus je eigen plek als je daarbuiten valt. `bare` = zonder kaart (zijbalk). */
export function WeekPodium({ bare = false }: { bare?: boolean }) {
  const { me } = useMe()
  const start = weekStart(new Date())
  const { rows, loading } = useLeaderboard(start, addDays(start, 6), me)
  const ranked = rows.filter((r) => r.total_min > 0).sort((a, b) => b.total_min - a.total_min)
  const max = ranked[0]?.total_min ?? 0
  const myRank = ranked.findIndex((r) => r.user_id === me.id)
  const shown = ranked.slice(0, 3).map((r, i) => ({ r, rank: i + 1 }))
  if (myRank >= 3) shown.push({ r: ranked[myRank], rank: myRank + 1 })

  const list =
    loading && !rows.length ? (
      <p className="text-sm text-fg-3">Laden…</p>
    ) : !shown.length ? (
      <p className="text-sm text-fg-3">Nog niemand getraind deze week. Wees de eerste.</p>
    ) : (
      <ol className="space-y-px">
        {shown.map(({ r, rank }) => {
          const isMe = r.user_id === me.id
          return (
            <li key={r.user_id}>
              <Link to={`/leaderboard/${r.user_id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-hover">
                <span className="relative w-4 shrink-0 text-center text-xs text-fg-3 tabular-nums">
                  {rank}
                  {rank === 1 && <span className="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-brand" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={`truncate text-fg ${isMe ? 'font-medium' : ''}`}>{isMe ? 'Jij' : r.display_name}</span>
                    <span className="shrink-0 text-fg-2 tabular-nums">{formatDuration(r.total_min)}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-muted">
                    <div className={`h-full rounded-full ${isMe ? 'bg-fg' : 'bg-fg-4'}`} style={{ width: `${max ? (r.total_min / max) * 100 : 0}%` }} />
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    )

  const more = (
    <Link to="/leaderboard" className={`${linkClass} inline-flex items-center gap-1 text-xs`}>
      Ranking <Icon name="arrow-right" className="size-3.5" />
    </Link>
  )

  if (bare) {
    return (
      <section>
        <div className="mb-3 flex h-6 items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Top deze week</h2>
          {more}
        </div>
        {list}
      </section>
    )
  }
  return (
    <Card title="Top deze week" action={more}>
      {list}
    </Card>
  )
}
