import { PHASES, TIMELINE_WEEKS, currentPhase, daysUntilRace } from '../lib/race'
import { useRace } from '../lib/raceContext'

export function PhaseTimeline() {
  const race = useRace()
  const current = currentPhase(race)
  const weeksLeft = Math.min(daysUntilRace(race) / 7, TIMELINE_WEEKS)
  const position = ((TIMELINE_WEEKS - weeksLeft) / TIMELINE_WEEKS) * 100
  const currentIndex = PHASES.indexOf(current)

  const segments = PHASES.map((p, i) => ({
    phase: p,
    weeks: Math.min(p.fromWeeks, TIMELINE_WEEKS) - (PHASES[i + 1]?.fromWeeks ?? 0),
    state: i < currentIndex ? 'past' : i === currentIndex ? 'current' : 'future',
  }))

  return (
    <div>
      <div className="relative">
        <div className="flex h-1 gap-[2px]">
          {segments.map(({ phase, weeks, state }) => (
            <div
              key={phase.name}
              style={{ flexGrow: weeks }}
              className={`first:rounded-l-full last:rounded-r-full ${state === 'current' ? 'bg-fg-3' : state === 'past' ? 'bg-fg-4' : 'bg-muted'}`}
            />
          ))}
        </div>
        {/* Dun streepje voor vandaag. */}
        <div className="absolute -top-1.5 h-4 w-0.5 -translate-x-1/2 rounded-full bg-fg" style={{ left: `${position}%` }} title="Vandaag" />
      </div>
      <div className="mt-2.5 flex gap-[2px] text-[11px]">
        {segments.map(({ phase, weeks, state }) => (
          <div key={phase.name} style={{ flexGrow: weeks, flexBasis: 0 }} className="min-w-0">
            <span
              className={`flex items-center gap-1.5 truncate ${state === 'current' ? 'font-medium text-fg' : 'text-fg-3'} ${
                weeks < 6 ? 'hidden sm:flex' : ''
              }`}
            >
              {state === 'current' && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
              <span className="truncate">{phase.name}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
