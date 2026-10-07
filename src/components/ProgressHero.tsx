import { useProgress, workoutXp } from '../lib/progress'
import { addDays, todayISO, weekStart } from '../lib/race'
import type { Workout } from '../lib/types'
import { Icon } from './Icon'
import { LevelBadge, XpBar } from './LevelBadge'

const DAY_LETTERS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

/** Grote kaart bovenaan het dashboard: level en XP links, streak met de dagen van deze week rechts. */
export function ProgressHero({ workouts }: { workouts: Workout[] }) {
  const p = useProgress()
  const today = todayISO()
  const monday = weekStart(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const trained = new Set(workouts.map((w) => w.date))
  const weekXp = workouts.filter((w) => w.date >= monday).reduce((a, w) => a + workoutXp(w), 0)

  if (p.loading) return <div className="h-64 animate-pulse rounded-2xl bg-subtle" />

  const streakText = !p.streak.days
    ? 'Train vandaag om een streak te starten.'
    : p.streak.atRisk
      ? 'Geen rustdagen meer deze week: train vandaag!'
      : p.streak.trainedToday
        ? `Vandaag gedaan. Nog ${p.streak.restLeft} ${p.streak.restLeft === 1 ? 'rustdag' : 'rustdagen'} deze week.`
        : `Nog ${p.streak.restLeft} ${p.streak.restLeft === 1 ? 'rustdag' : 'rustdagen'} deze week.`

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#ef1d38_0%,#b00c22_45%,#2a0610_100%)] p-5 text-white shadow-[0_20px_50px_-20px_rgb(227_18_45/0.6)] sm:p-8">
      {/* Diagonale strepen en een groot levelnummer als decor. */}
      <div className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(115deg,transparent_0_28px,rgb(255_255_255/0.04)_28px_30px)]" aria-hidden />
      <span
        className="font-display pointer-events-none absolute -right-4 -bottom-16 -z-10 text-[16rem] leading-none font-extrabold text-white/[0.06] select-none sm:text-[20rem]"
        aria-hidden
      >
        {p.level}
      </span>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <LevelBadge level={p.level} size="lg" onColor />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase">Level {p.level}</p>
              <h2 className="font-display truncate text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-5xl">{p.title}</h2>
            </div>
          </div>
          <div className="mt-6">
            <XpBar onColor />
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
            {[
              { label: 'Totaal XP', value: p.xp.toLocaleString('nl-BE') },
              { label: 'XP deze week', value: `+${weekXp.toLocaleString('nl-BE')}` },
              { label: 'Langste streak', value: `${p.streak.best} d` },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="truncate text-[11px] font-semibold tracking-wide text-white/65 uppercase">{s.label}</dt>
                <dd className="font-display mt-1 truncate text-2xl leading-none font-bold tabular-nums sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl bg-black/25 p-5 ring-1 ring-white/10 backdrop-blur-sm lg:w-80">
          <div className="flex items-center gap-3">
            <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${p.streak.days ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'}`}>
              <Icon name="flame" className={`size-8 ${p.streak.days ? 'fill-current' : ''} ${p.streak.atRisk ? 'animate-pulse' : ''}`} />
            </span>
            <div>
              <p className="font-display text-5xl leading-none font-extrabold tabular-nums">{p.streak.days}</p>
              <p className="text-sm font-semibold text-white/80">{p.streak.days === 1 ? 'dag streak' : 'dagen streak'}</p>
            </div>
          </div>
          <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Deze week">
            {days.map((d, i) => {
              const done = trained.has(d)
              const isToday = d === today
              const future = d > today
              return (
                <li key={d} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-white text-[#b00c22]' : future ? 'bg-white/5 text-white/30' : isToday ? 'text-white ring-2 ring-white/80 ring-inset' : 'bg-white/10 text-white/50'
                    }`}
                    title={done ? 'Getraind' : future ? 'Nog te komen' : isToday ? 'Vandaag' : 'Rustdag'}
                  >
                    {done ? <Icon name="check" className="size-4" strokeWidth={3} /> : DAY_LETTERS[i]}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className={`mt-4 text-sm ${p.streak.atRisk ? 'font-semibold text-white' : 'text-white/75'}`}>{streakText}</p>
        </div>
      </div>
    </section>
  )
}
