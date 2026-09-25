import { PHASES, TIMELINE_WEEKS, currentPhase, daysUntilRace } from '../lib/race'

export function PhaseTimeline() {
  const current = currentPhase()
  const weeksLeft = Math.min(daysUntilRace() / 7, TIMELINE_WEEKS)
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
        <div className="flex h-2.5 gap-[2px]">
          {segments.map(({ phase, weeks, state }) => (
            <div
              key={phase.name}
              style={{ flexGrow: weeks }}
              className={`first:rounded-l-full last:rounded-r-full ${
                state === 'current' ? 'bg-brand' : state === 'past' ? 'bg-zinc-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <div
          className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgb(255_255_255/0.6)]"
          style={{ left: `${position}%` }}
          title="Vandaag"
        />
      </div>
      <div className="mt-2 flex gap-[2px] text-[11px]">
        {segments.map(({ phase, weeks, state }) => (
          <div key={phase.name} style={{ flexGrow: weeks, flexBasis: 0 }} className="min-w-0">
            <span
              className={`block truncate ${state === 'current' ? 'font-semibold text-white' : 'text-zinc-500'} ${
                weeks < 6 ? 'hidden sm:block' : ''
              }`}
            >
              {phase.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
