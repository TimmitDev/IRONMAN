import { DEFAULT_RACE, RACE_TYPES, formatDistances, toISODate, todayISO, type Race, type RaceType } from '../lib/race'
import { hintClass, inputClass, labelClass } from '../lib/ui'
import { Icon } from './Icon'

/** Formulierwaarden voor een race; de datum als YYYY-MM-DD. */
export interface RaceDraft {
  name: string
  type: RaceType
  date: string
}

export const raceDraft = (race: Race = DEFAULT_RACE): RaceDraft => ({ name: race.name, type: race.type, date: toISODate(race.date) })

/** Geeft een foutmelding terug, of null als alles klopt. */
export function validateRace(d: RaceDraft): string | null {
  if (!d.name.trim()) return 'Geef je race een naam.'
  if (!d.date) return 'Kies de datum van je race.'
  if (d.date < todayISO()) return 'Die datum ligt al achter ons. Kies een race in de toekomst.'
  return null
}

/** Velden voor naam, afstand en datum van je race; gedeeld door de onboarding en de instellingen. */
export function RaceFields({ value, onChange }: { value: RaceDraft; onChange: (d: RaceDraft) => void }) {
  const set = <K extends keyof RaceDraft>(key: K, v: RaceDraft[K]) => onChange({ ...value, [key]: v })

  return (
    <div className="space-y-5">
      <label className="block">
        <span className={labelClass}>Naam van de race</span>
        <input
          className={inputClass}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={60}
          placeholder="bv. IRONMAN 70.3 Westfriesland"
          required
        />
      </label>

      <fieldset>
        <legend className={labelClass}>Afstand</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(RACE_TYPES) as RaceType[]).map((key) => {
            const type = RACE_TYPES[key]
            const active = value.type === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('type', key)}
                aria-pressed={active}
                className={`relative rounded-xl border p-4 text-left transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none ${
                  active ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong hover:bg-hover'
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                    <Icon name="check" className="size-3" strokeWidth={3} />
                  </span>
                )}
                <p className="pr-6 font-semibold text-fg">{type.label}</p>
                <p className="mt-1 text-xs text-fg-3">{type.description}</p>
                <p className="mt-3 text-xs font-semibold text-fg-2 tabular-nums">{formatDistances(type.distances)}</p>
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="block sm:w-1/2">
        <span className={labelClass}>Datum</span>
        <input type="date" className={inputClass} value={value.date} min={todayISO()} onChange={(e) => set('date', e.target.value)} required />
        <p className={hintClass}>Countdown, fases en je trainingsplan rekenen terug vanaf deze dag.</p>
      </label>
    </div>
  )
}
