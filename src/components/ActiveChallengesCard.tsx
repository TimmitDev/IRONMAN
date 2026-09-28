import { Link } from 'react-router-dom'
import { challengeColor, challengeStatus, formatProgress, isDone, myEntry, timingLabel, useChallenges } from '../lib/challenges'
import { todayISO } from '../lib/race'
import { SPORT_BG } from '../lib/types'
import { linkClass, secondaryButton } from '../lib/ui'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { Icon } from './Icon'
import { ProgressBar } from './ProgressBar'

/** Compact overzicht voor de homepage: je lopende uitdagingen (max 3), of een uitnodiging om mee te doen. */
export function ActiveChallengesCard() {
  const { challenges, loading, meId } = useChallenges()
  const today = todayISO()
  const active = challenges.filter((c) => challengeStatus(c, today) === 'active')
  const mine = active
    .map((c) => ({ c, entry: myEntry(c, meId) }))
    .filter((x) => x.entry)
    .sort((a, b) => a.c.ends_on.localeCompare(b.c.ends_on))
  const open = active.length - mine.length

  return (
    <Card
      title="Uitdagingen"
      action={
        <Link to="/uitdagingen" className={linkClass}>
          Alles bekijken
        </Link>
      }
    >
      {loading && !challenges.length ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : mine.length ? (
        <ul className="space-y-4">
          {mine.slice(0, 3).map(({ c, entry }) => {
            const done = isDone(c, entry!.value)
            return (
              <li key={c.id}>
                <Link to="/uitdagingen" className="-mx-2 block rounded-xl px-2 py-1.5 transition hover:bg-hover">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
                      <span className={`size-2 shrink-0 rounded-full ${c.sport ? SPORT_BG[c.sport] : 'bg-brand'}`} />
                      <span className="truncate">{c.title}</span>
                    </p>
                    {done ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
                        <Icon name="check" className="size-3.5" />
                        Gehaald!
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-fg-3">{timingLabel(c, today)}</span>
                    )}
                  </div>
                  <ProgressBar value={entry!.value} max={c.target} color={done ? 'bg-success' : challengeColor(c)} />
                  <p className="mt-1 text-xs text-fg-3 tabular-nums">{formatProgress(c, entry!.value)}</p>
                </Link>
              </li>
            )
          })}
          {(mine.length > 3 || open > 0) && (
            <li className="text-xs text-fg-3">
              {mine.length > 3 && `+${mine.length - 3} meer`}
              {mine.length > 3 && open > 0 && ' · '}
              {open > 0 && `${open} ${open === 1 ? 'andere uitdaging loopt' : 'andere uitdagingen lopen'} nog`}
            </li>
          )}
        </ul>
      ) : (
        <EmptyState
          icon="flag"
          title="Start of doe mee met een uitdaging"
          action={
            <Link to="/uitdagingen" className={secondaryButton}>
              {open > 0 ? 'Bekijk uitdagingen' : 'Nieuwe uitdaging'}
              <Icon name="arrow-right" className="size-4" />
            </Link>
          }
        >
          {open > 0
            ? `Er ${open === 1 ? 'loopt 1 uitdaging' : `lopen ${open} uitdagingen`} waar je nog niet aan meedoet.`
            : 'Daag de groep uit met een doel, bv. 100 km lopen deze maand.'}
        </EmptyState>
      )}
    </Card>
  )
}
