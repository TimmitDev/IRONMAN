import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { PHASES, RACE, addDays, parseISODate, toISODate, weekStart, type Phase } from './race'
import type { Sport } from './types'

export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface PlanSettings {
  level: Level
  /** 0 = maandag … 6 = zondag */
  restDay: number
  longBikeDay: number
  longRunDay: number
  /** Maandag waarop het plan start (YYYY-MM-DD). */
  startDate: string
}

export const LEVELS: Record<Level, { label: string; description: string; peakHours: number; pace: { swimSecPer100: number; bikeKmh: number; runMinPerKm: number } }> = {
  beginner: {
    label: 'Beginner',
    description: 'Eerste IRONMAN, finishen is het doel.',
    peakHours: 12,
    pace: { swimSecPer100: 150, bikeKmh: 25, runMinPerKm: 6.5 },
  },
  intermediate: {
    label: 'Gevorderd',
    description: 'Ervaring met triatlon of een halve IRONMAN.',
    peakHours: 15,
    pace: { swimSecPer100: 130, bikeKmh: 28, runMinPerKm: 5.75 },
  },
  advanced: {
    label: 'Ervaren',
    description: 'Eerder een IRONMAN gedaan, gericht op een snelle tijd.',
    peakHours: 18,
    pace: { swimSecPer100: 110, bikeKmh: 31, runMinPerKm: 5.1 },
  },
}

export const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export interface PlanSession {
  date: string
  sport: Sport
  title: string
  duration_min: number
  distance_km: number | null
  notes: string | null
}

export interface PlanWeek {
  index: number
  start: string
  weeksToRace: number
  phase: Phase
  recovery: boolean
  raceWeek: boolean
  minutes: number
  sessions: PlanSession[]
}

type Role = 'swimTech' | 'swimEndurance' | 'swimExtra' | 'bikeQ' | 'bikeEasy' | 'bikeLong' | 'runQ' | 'runEasy' | 'runLong' | 'brick' | 'strength'

const Z2 = 'Zone 2: rustig tempo, praten moet kunnen.'

// Titel + uitleg per fase en sessietype.
const SESSIONS: Record<string, Partial<Record<Role, [string, string | null]>>> = {
  Voorbereiding: {
    swimTech: ['Techniek + drills', 'Catch-up, zijademhaling, 6x50 drills met rust.'],
    swimEndurance: ['Duurzwemmen', 'Blokken van 200–400 m rustig, focus op ritme.'],
    bikeQ: ['Cadans-drills', '5x3\' hoge cadans (100+ rpm), 3\' rustig ertussen.'],
    bikeEasy: ['Herstelrit', 'Zone 1–2, soepel trappen.'],
    bikeLong: ['Duurrit Z2', Z2],
    runQ: ['Strides + looptechniek', 'Loopscholing en 6x20" versnellingen.'],
    runEasy: ['Rustige duurloop', Z2],
    runLong: ['Duurloop Z2', Z2],
    strength: ['Kracht & core', 'Squats, lunges, deadlifts, planken. 2–3 sets.'],
  },
  Base: {
    swimTech: ['Techniek + 10x100', '10x100 op gevoel, 20" rust, focus op lange slag.'],
    swimEndurance: ['Duurzwemmen', 'Opbouwen naar 2–3 km aan één stuk.'],
    swimExtra: ['Herstelzwem', 'Losjes, pull buoy toegestaan.'],
    bikeQ: ['Kracht op de trappers', '4x8\' lage cadans (60–70 rpm) in zone 3.'],
    bikeEasy: ['Duurrit Z2', Z2],
    bikeLong: ['Lange rit Z2', `${Z2} Oefen eten en drinken elk halfuur.`],
    runQ: ['Heuvelsprints', '8x30" bergop hard, rustig terug wandelen.'],
    runEasy: ['Rustige duurloop', Z2],
    runLong: ['Lange duurloop Z2', Z2],
    strength: ['Kracht & core', 'Zwaarder, minder herhalingen (4x6).'],
  },
  Build: {
    swimTech: ['CSS-intervallen', '8x200 op CSS-tempo, 20" rust.'],
    swimEndurance: ['Duurzwemmen', '3–3,5 km, laatste 1000 m op racetempo.'],
    swimExtra: ['Openwater / sighting', 'Oefen oriënteren om de 6–8 slagen.'],
    bikeQ: ['Sweet spot 3x15\'', '3x15\' op 88–93% FTP, 5\' rust.'],
    bikeEasy: ['Duurrit Z2', Z2],
    bikeLong: ['Lange rit met IM-blokken', '3x30\' op IRONMAN-tempo in de rit. Test je voeding.'],
    runQ: ['Tempoloop 3x10\'', '3x10\' op drempeltempo, 3\' dribbel.'],
    runEasy: ['Rustige duurloop', Z2],
    runLong: ['Lange duurloop', 'Z2, laatste 20\' iets sneller.'],
    brick: ['Brick-loop', 'Meteen na de lange rit: wennen aan lopen op fietsbenen.'],
    strength: ['Kracht onderhoud', 'Korte sessie, focus op core en heupen.'],
  },
  Peak: {
    swimTech: ['Racetempo-blokken', '4x500 op racetempo, 30" rust.'],
    swimEndurance: ['Openwater-simulatie', 'Continu 3,8 km of zo dicht mogelijk, in wetsuit indien mogelijk.'],
    swimExtra: ['Herstelzwem', 'Losjes, techniek.'],
    bikeQ: ['Racetempo 2x45\'', '2x45\' op IRONMAN-wattage/hartslag.'],
    bikeEasy: ['Herstelrit', 'Zone 1–2.'],
    bikeLong: ['Racesimulatie', 'Lange rit grotendeels op IRONMAN-tempo, exact je racevoeding.'],
    runQ: ['IM-tempo 3x15\'', '3x15\' op IRONMAN-looptempo.'],
    runEasy: ['Herstelloop', 'Kort en rustig.'],
    runLong: ['Lange loop met IM-finish', 'Z2, laatste 30\' op IRONMAN-tempo.'],
    brick: ['Brick op racetempo', 'Direct na de rit, eerste km bewust rustig.'],
  },
  Taper: {
    swimTech: ['Kort + snel', '6x100 op racetempo, ruime rust.'],
    swimEndurance: ['Losse techniek', 'Kort, soepel, vertrouwen opbouwen.'],
    bikeQ: ['Openers 4x3\'', '4x3\' op IM-tempo, rest rustig.'],
    bikeEasy: ['Losrijden', 'Zone 1–2, benen fris houden.'],
    bikeLong: ['Korte rit met pieken', 'Kortere rit, enkele blokken op racetempo.'],
    runQ: ['Strides', 'Rustig + 6x20" versnellingen.'],
    runEasy: ['Losse loop', 'Kort en ontspannen.'],
    runLong: ['Korte duurloop', 'Rustig, niet langer dan voorgeschreven.'],
  },
}

// Belasting t.o.v. de piekweek: [begin, einde] van elke fase; taper heeft vaste stappen.
const LOAD: Record<string, [number, number]> = {
  Voorbereiding: [0.45, 0.55],
  Base: [0.55, 0.72],
  Build: [0.72, 0.9],
  Peak: [0.9, 1],
}
const TAPER_LOAD = [0.3, 0.55, 0.75] // index = weken tot race

const CAP: Partial<Record<Role, number>> = { bikeLong: 360, runLong: 165, swimTech: 90, swimEndurance: 90, swimExtra: 75, brick: 30 }

function phaseFor(weeksToRace: number): Phase {
  let phase = PHASES[0]
  for (const p of PHASES) if (weeksToRace < p.fromWeeks) phase = p
  return phase
}

const round5 = (min: number) => Math.max(20, Math.round(min / 5) * 5)

function estimateKm(sport: Sport, min: number, level: Level): number | null {
  const pace = LEVELS[level].pace
  if (sport === 'swim') return Math.round(((min * 60) / pace.swimSecPer100 / 10) * 10) / 10
  if (sport === 'bike') return Math.round((min / 60) * pace.bikeKmh)
  if (sport === 'run') return Math.round((min / pace.runMinPerKm) * 10) / 10
  return null
}

const SPORT_OF: Record<Role, Sport> = {
  swimTech: 'swim',
  swimEndurance: 'swim',
  swimExtra: 'swim',
  bikeQ: 'bike',
  bikeEasy: 'bike',
  bikeLong: 'bike',
  runQ: 'run',
  runEasy: 'run',
  runLong: 'run',
  brick: 'run',
  strength: 'strength',
}

/** Raceweek: vaste, korte prikkels van maandag t/m zaterdag; de race zelf is zondag. */
function raceWeekSessions(start: string, level: Level, restDay: number): PlanSession[] {
  const plan: [number, Sport, string, number, string][] = [
    [1, 'swim', 'Openers zwemmen', 30, '4x100 op racetempo, verder rustig.'],
    [1, 'bike', 'Openers fietsen', 45, '3x3\' op IRONMAN-tempo.'],
    [2, 'run', 'Losse loop + strides', 25, '4x20" versnellingen.'],
    [3, 'swim', 'Losse techniek', 25, 'Soepel, vertrouwen.'],
    [4, 'bike', 'Fiets checken', 30, 'Alles testen wat je zondag gebruikt, 3 korte pieken.'],
    [4, 'run', 'Shake-out loop', 15, 'Heel rustig.'],
    [5, 'swim', 'Proefzwemmen', 15, 'Openwater indien toegestaan. Fiets inchecken, benen omhoog!'],
  ]
  return plan.map(([day, sport, title, min, notes]) => {
    // Valt een sessie op je rustdag, schuif ze een dag op (nooit naar racedag).
    const d = day === restDay ? Math.min(day + 1, 5) : day
    return { date: addDays(start, d), sport, title, duration_min: min, distance_km: estimateKm(sport, min, level), notes }
  })
}

export function generatePlan(settings: PlanSettings): PlanWeek[] {
  const { level, restDay, longBikeDay, longRunDay } = settings
  const raceWeekStart = weekStart(RACE.date)
  const first = weekStart(parseISODate(settings.startDate))
  const totalWeeks = Math.round((parseISODate(raceWeekStart).getTime() - parseISODate(first).getTime()) / (7 * 86_400_000)) + 1
  const peakMin = LEVELS[level].peakHours * 60
  const weeks: PlanWeek[] = []

  for (let i = 0; i < totalWeeks; i++) {
    const start = addDays(first, i * 7)
    const weeksToRace = totalWeeks - 1 - i
    const phase = phaseFor(weeksToRace)

    if (weeksToRace === 0) {
      const sessions = raceWeekSessions(start, level, restDay)
      weeks.push({ index: i + 1, start, weeksToRace, phase, recovery: false, raceWeek: true, minutes: sessions.reduce((a, s) => a + s.duration_min, 0), sessions })
      continue
    }

    // Belasting: lineair door de fase heen, elke 4e week herstel (niet in de taper).
    let load: number
    let recovery = false
    if (phase.name === 'Taper') {
      load = TAPER_LOAD[weeksToRace]
    } else {
      const idx = PHASES.indexOf(phase)
      const from = Math.min(phase.fromWeeks, totalWeeks) - 1
      const to = PHASES[idx + 1].fromWeeks
      const progress = from > to ? (from - weeksToRace) / (from - to) : 1
      const [lo, hi] = LOAD[phase.name]
      load = lo + (hi - lo) * Math.min(1, Math.max(0, progress))
      recovery = i % 4 === 3
      if (recovery) load *= 0.7
    }
    const total = peakMin * load

    // Verdeling over de sporten; geen kracht meer vanaf Peak.
    const noStrength = phase.name === 'Peak' || phase.name === 'Taper'
    const share = { swim: 0.16, bike: noStrength ? 0.56 : 0.5, run: 0.28, strength: noStrength ? 0 : 0.06 }
    const swimMin = total * share.swim
    const bikeMin = total * share.bike
    const runMin = total * share.run
    const strengthMin = total * share.strength

    const hasBrick = phase.name === 'Build' || phase.name === 'Peak'
    const swimRoles: Role[] = level === 'advanced' && hasBrick ? ['swimTech', 'swimEndurance', 'swimExtra'] : ['swimTech', 'swimEndurance']

    // In Build/Peak draait alles om de lange rit en loop: die krijgen een groter deel van de sporttijd.
    const longBikeShare = hasBrick ? 0.7 : 0.55
    const longRunShare = hasBrick ? 0.5 : 0.4

    const durations: Partial<Record<Role, number>> = {}
    for (const r of swimRoles) durations[r] = swimMin / swimRoles.length
    durations.bikeLong = bikeMin * longBikeShare
    durations.bikeQ = bikeMin * (1 - longBikeShare) * 0.55
    durations.bikeEasy = bikeMin * (1 - longBikeShare) * 0.45
    durations.runLong = runMin * longRunShare
    if (hasBrick) durations.brick = runMin * 0.12
    const runRest = runMin - durations.runLong - (durations.brick ?? 0)
    durations.runQ = runRest * 0.55
    durations.runEasy = runRest * 0.45
    const strengthCount = strengthMin > 0 ? (phase.name === 'Voorbereiding' ? 2 : 1) : 0

    // Dagen verdelen: lange sessies op de gekozen dagen, de rest waar de dag het lichtst is.
    const perDay: Role[][] = Array.from({ length: 7 }, () => [])
    const dayLoad: number[] = Array(7).fill(0)
    const put = (role: Role, day: number, min: number) => {
      perDay[day].push(role)
      dayLoad[day] += min
    }
    const minutes = (r: Role) => round5(Math.min(durations[r] ?? 0, CAP[r] ?? Infinity))

    put('bikeLong', longBikeDay, minutes('bikeLong'))
    if (hasBrick) put('brick', longBikeDay, minutes('brick'))
    put('runLong', longRunDay, minutes('runLong'))

    const others: Role[] = ['runQ', 'bikeQ', swimRoles[0], swimRoles[1], 'runEasy', 'bikeEasy', ...(swimRoles[2] ? [swimRoles[2]] : [])]
    const strengthRoles: Role[] = Array(strengthCount).fill('strength')
    for (const role of [...others, ...strengthRoles]) {
      const quality = role === 'runQ' || role === 'bikeQ' || role === 'strength'
      let best = -1
      let bestScore = Infinity
      for (let d = 0; d < 7; d++) {
        if (d === restDay) continue
        const longDay = d === longBikeDay || d === longRunDay
        if (quality && longDay) continue
        const sameSport = perDay[d].some((r) => SPORT_OF[r] === SPORT_OF[role])
        const score = dayLoad[d] + (longDay ? 120 : 0) + (sameSport ? 300 : 0)
        if (score < bestScore) {
          bestScore = score
          best = d
        }
      }
      const min = role === 'strength' ? round5(strengthMin / strengthCount) : minutes(role)
      put(role, best, min)
    }

    const sessions: PlanSession[] = []
    perDay.forEach((roles, d) => {
      for (const role of roles) {
        const sport = SPORT_OF[role]
        const [title, notes] = SESSIONS[phase.name][role] ?? SESSIONS.Base[role] ?? [role, null]
        const min = role === 'strength' ? round5(strengthMin / strengthCount) : minutes(role)
        sessions.push({ date: addDays(start, d), sport, title, duration_min: min, distance_km: estimateKm(sport, min, level), notes })
      }
    })
    weeks.push({ index: i + 1, start, weeksToRace, phase, recovery, raceWeek: false, minutes: sessions.reduce((a, s) => a + s.duration_min, 0), sessions })
  }
  return weeks
}

/** Maandag van deze week: standaard startdatum voor een nieuw plan. */
export const defaultStartDate = () => weekStart(new Date())

export const DEFAULT_SETTINGS: Omit<PlanSettings, 'startDate'> = { level: 'beginner', restDay: 0, longBikeDay: 5, longRunDay: 6 }

export function usePlanSettings() {
  const { session } = useAuth()
  const [settings, setSettings] = useState<PlanSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('plan_settings')
      .select('settings')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setSettings((data?.settings as PlanSettings | undefined) ?? null)
        setLoading(false)
      })
  }, [])

  const save = async (next: PlanSettings) => {
    const { error } = await supabase
      .from('plan_settings')
      .upsert({ user_id: session!.user.id, settings: next, updated_at: new Date().toISOString() })
    if (error) throw error
    setSettings(next)
  }

  return { settings, loading, error, save }
}

/**
 * Zet sessies uit het plan in het weekschema, vanaf vandaag t/m `until`.
 * Eerder toegepaste plan-sessies in die periode die nog niet gedaan zijn, worden vervangen.
 */
export async function applyPlan(weeks: PlanWeek[], until: string): Promise<number> {
  const today = toISODate(new Date())
  const rows = weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= today && s.date <= until)
    .map((s) => ({ ...s, source: 'plan' }))
  const { error: deleteError } = await supabase
    .from('planned_workouts')
    .delete()
    .eq('source', 'plan')
    .is('workout_id', null)
    .gte('date', today)
    .lte('date', until)
  if (deleteError) throw deleteError
  if (!rows.length) return 0
  const { error } = await supabase.from('planned_workouts').insert(rows)
  if (error) throw error
  return rows.length
}
