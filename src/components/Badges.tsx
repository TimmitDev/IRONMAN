import { Link } from 'react-router-dom'
import type { BadgeResult } from '../lib/badges'
import { formatShortDate } from '../lib/race'
import { eyebrowClass, linkClass } from '../lib/ui'
import { Card } from './Card'

function BadgeIcon({ result, size = 'md' }: { result: BadgeResult; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'size-12 text-2xl' : 'size-10 text-xl'
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-subtle ${dim} ${result.earned ? '' : 'opacity-40 grayscale'}`}
      aria-hidden
    >
      {result.badge.emoji}
    </span>
  )
}

/** Compacte kaart voor het dashboard: nieuwste badges + wat bijna binnen is. */
export function BadgesCard({ results }: { results: BadgeResult[] }) {
  const earned = results.filter((r) => r.earned)
  const recent = [...earned].sort((a, b) => (b.earnedOn ?? '').localeCompare(a.earnedOn ?? '')).slice(0, 4)
  const next = results
    .filter((r) => !r.earned && r.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)

  return (
    <Card
      title="Badges"
      description={`${earned.length} van ${results.length} verdiend`}
      action={
        <Link to="/goals" className={linkClass}>
          Alle
        </Link>
      }
    >
      {recent.length ? (
        <div className="flex gap-2">
          {recent.map((r) => (
            <div key={r.badge.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center" title={r.badge.description}>
              <BadgeIcon result={r} />
              <span className="w-full truncate text-xs text-fg-2">{r.badge.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg-3">Log je eerste training voor je eerste badge.</p>
      )}
      {next.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-line pt-5">
          <p className={eyebrowClass}>Bijna binnen</p>
          {next.map((r) => (
            <div key={r.badge.id} className="flex items-center gap-3">
              <span className="text-lg opacity-60 grayscale" aria-hidden>
                {r.badge.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-fg">{r.badge.name}</span>
                  <span className="text-fg-3 tabular-nums">{Math.round(r.progress * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-fg-3" style={{ width: `${r.progress * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Volledig overzicht van alle badges. */
export function BadgesGrid({ results }: { results: BadgeResult[] }) {
  const earned = results.filter((r) => r.earned).length
  return (
    <Card title="Badges" description={`${earned} van ${results.length} verdiend`}>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {results.map((r) => (
          <li key={r.badge.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
            <BadgeIcon result={r} size="lg" />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${r.earned ? 'text-fg' : 'text-fg-2'}`}>{r.badge.name}</p>
              <p className="text-xs text-fg-3">{r.badge.description}</p>
              {r.earned ? (
                <p className="mt-1 text-xs text-fg-2">{r.earnedOn ? `Verdiend op ${formatShortDate(r.earnedOn)}` : 'Verdiend'}</p>
              ) : (
                r.progressLabel && (
                  <div className="mt-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-fg-3" style={{ width: `${r.progress * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-fg-3">{r.progressLabel}</p>
                  </div>
                )
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
