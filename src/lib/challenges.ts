import { useCallback, useEffect, useRef, useState } from 'react'
import { useMe } from './profile'
import { addDays, formatDuration, formatShortDate, parseISODate, toISODate, todayISO, weekStart } from './race'
import { supabase } from './supabase'
import { SPORT_BG, SPORT_LABEL, type Sport } from './types'
import { useWorkoutsChanged } from './useWorkouts'

/** distance = km, duration = minuten, sessions = aantal trainingen. */
export type ChallengeMetric = 'distance' | 'duration' | 'sessions'
export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export interface ChallengeParticipant {
  user_id: string
  display_name: string
  /** Totaal binnen de periode, in de eenheid van de uitdaging. */
  value: number
}

export interface Challenge {
  id: string
  created_by: string
  creator_name: string
  title: string
  description: string | null
  /** null = alle sporten. */
  sport: Sport | null
  metric: ChallengeMetric
  target: number
  starts_on: string
  ends_on: string
  created_at: string
  /** Gesorteerd op waarde, hoogste eerst. */
  participants: ChallengeParticipant[]
}

export type NewChallenge = Pick<Challenge, 'title' | 'description' | 'sport' | 'metric' | 'target' | 'starts_on' | 'ends_on'>

export const METRIC_LABEL: Record<ChallengeMetric, string> = {
  distance: 'Afstand',
  duration: 'Tijd',
  sessions: 'Sessies',
}

/** Maximale lengte van een uitdaging, zelfde grens als in de database. */
export const MAX_DAYS = 366

// numeric-kolommen kunnen als string uit PostgREST komen.
function normalize(c: Challenge): Challenge {
  return {
    ...c,
    target: Number(c.target),
    participants: (c.participants ?? []).map((p) => ({ ...p, value: Number(p.value) })).sort((a, b) => b.value - a.value),
  }
}

/** Alle zichtbare uitdagingen met deelnemers. Ververst vanzelf als er trainingen bijkomen of verdwijnen. */
export function useChallenges() {
  const { me } = useMe()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Een ouder antwoord mag een nieuwer niet overschrijven.
  const request = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++request.current
    const { data, error } = await supabase.rpc('list_challenges')
    if (id !== request.current) return
    setError(error?.message ?? null)
    if (!error) setChallenges(((data ?? []) as Challenge[]).map(normalize))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useWorkoutsChanged(refresh)

  const patch = (id: string, fn: (c: Challenge) => Challenge) => setChallenges((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))

  const create = async (input: NewChallenge) => {
    const { data, error } = await supabase.from('challenges').insert(input).select('id').single()
    if (error) throw error
    // De maker doet mee via een trigger; opnieuw laden geeft meteen ook zijn voortgang.
    await refresh()
    return (data as { id: string }).id
  }

  const remove = async (id: string) => {
    const before = challenges
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    if (error) {
      setChallenges(before)
      throw error
    }
  }

  const join = async (id: string) => {
    // Meteen tonen met 0; het echte totaal komt met het herladen.
    patch(id, (c) => ({ ...c, participants: [...c.participants, { user_id: me.id, display_name: me.display_name, value: 0 }] }))
    const { error } = await supabase.from('challenge_participants').insert({ challenge_id: id })
    if (error) {
      patch(id, (c) => ({ ...c, participants: c.participants.filter((p) => p.user_id !== me.id) }))
      throw error
    }
    await refresh()
  }

  const leave = async (id: string) => {
    const mine = challenges.find((c) => c.id === id)?.participants.find((p) => p.user_id === me.id)
    patch(id, (c) => ({ ...c, participants: c.participants.filter((p) => p.user_id !== me.id) }))
    const { error } = await supabase.from('challenge_participants').delete().eq('challenge_id', id).eq('user_id', me.id)
    if (error) {
      if (mine) patch(id, (c) => ({ ...c, participants: [...c.participants, mine].sort((a, b) => b.value - a.value) }))
      throw error
    }
  }

  return { challenges, loading, error, refresh, create, remove, join, leave, meId: me.id }
}

// ---------- Helpers ----------

/** Aantal dagen van `from` tot `to` (kan negatief zijn). Afgerond, dus veilig rond zomertijd. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000)
}

export function challengeStatus(c: Pick<Challenge, 'starts_on' | 'ends_on'>, today = todayISO()): ChallengeStatus {
  if (today < c.starts_on) return 'upcoming'
  if (today > c.ends_on) return 'ended'
  return 'active'
}

/** Resterende dagen inclusief vandaag (laatste dag = 1). 0 als de uitdaging voorbij is. */
export function daysLeft(c: Pick<Challenge, 'starts_on' | 'ends_on'>, today = todayISO()): number {
  return Math.max(0, daysBetween(today, c.ends_on) + 1)
}

/** Korte tijdsaanduiding: "Nog 5 dagen", "Laatste dag", "Start morgen", "Afgelopen op 31 okt.". */
export function timingLabel(c: Pick<Challenge, 'starts_on' | 'ends_on'>, today = todayISO()): string {
  const status = challengeStatus(c, today)
  if (status === 'upcoming') {
    const n = daysBetween(today, c.starts_on)
    return n === 1 ? 'Start morgen' : `Start over ${n} dagen`
  }
  if (status === 'ended') return `Afgelopen op ${formatShortDate(c.ends_on)}`
  const n = daysLeft(c, today)
  return n === 1 ? 'Laatste dag' : `Nog ${n} dagen`
}

/** "1 okt. – 31 okt." (of één datum als start en einde gelijk zijn). */
export function formatPeriod(c: Pick<Challenge, 'starts_on' | 'ends_on'>): string {
  return c.starts_on === c.ends_on ? formatShortDate(c.starts_on) : `${formatShortDate(c.starts_on)} – ${formatShortDate(c.ends_on)}`
}

const km = new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 1 })

/** Eén waarde in de eenheid van de uitdaging, zonder eenheid voor afstand en sessies ("42,5", "6u30", "7"). */
export function formatValue(metric: ChallengeMetric, value: number): string {
  if (metric === 'distance') return km.format(value)
  if (metric === 'duration') return value > 0 ? formatDuration(value) : '0u'
  return String(Math.round(value))
}

/** Waarde met eenheid: "42,5 km", "6u30", "7 sessies". */
export function formatAmount(metric: ChallengeMetric, value: number): string {
  if (metric === 'distance') return `${formatValue(metric, value)} km`
  if (metric === 'sessions') return `${formatValue(metric, value)} ${Math.round(value) === 1 ? 'sessie' : 'sessies'}`
  return formatValue(metric, value)
}

/** Voortgang t.o.v. het doel: "42,5 / 100 km", "6u30 / 10u", "7 / 12 sessies". */
export function formatProgress(c: Pick<Challenge, 'metric' | 'target'>, value: number): string {
  const text = `${formatValue(c.metric, value)} / ${formatValue(c.metric, c.target)}`
  if (c.metric === 'distance') return `${text} km`
  if (c.metric === 'sessions') return `${text} ${c.target === 1 ? 'sessie' : 'sessies'}`
  return text
}

/** Doel in woorden, bv. "100 km lopen", "10u trainen", "12 sessies zwemmen". */
export function goalLabel(c: Pick<Challenge, 'metric' | 'target' | 'sport'>): string {
  const what = !c.sport ? 'trainen' : c.sport === 'strength' ? 'krachttraining' : SPORT_LABEL[c.sport].toLowerCase()
  return `${formatAmount(c.metric, c.target)} ${what}`
}

export const isDone = (c: Pick<Challenge, 'target'>, value: number) => value >= c.target

export const progressFraction = (c: Pick<Challenge, 'target'>, value: number) => (c.target > 0 ? Math.min(1, value / c.target) : 0)

/** Kleur van de balk: de sportkleur, of de merkkleur voor alle sporten. */
export const challengeColor = (c: Pick<Challenge, 'sport'>) => (c.sport ? SPORT_BG[c.sport] : 'bg-brand')

export const challengeSportLabel = (c: Pick<Challenge, 'sport'>) => (c.sport ? SPORT_LABEL[c.sport] : 'Alle sporten')

export function myEntry(c: Challenge, meId: string): ChallengeParticipant | undefined {
  return c.participants.find((p) => p.user_id === meId)
}

// ---------- Periodes ----------

export type QuickPeriod = 'week' | 'month' | 'next30'

export const QUICK_PERIODS: { key: QuickPeriod; label: string }[] = [
  { key: 'week', label: 'Deze week' },
  { key: 'month', label: 'Deze maand' },
  { key: 'next30', label: 'Volgende 30 dagen' },
]

export function quickPeriod(key: QuickPeriod, now = new Date()): [string, string] {
  if (key === 'week') {
    const start = weekStart(now)
    return [start, addDays(start, 6)]
  }
  if (key === 'month') return [toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))]
  const today = toISODate(now)
  return [today, addDays(today, 29)]
}

/** Controleert een nieuwe uitdaging; geeft een foutmelding terug of null als alles klopt. */
export function validateChallenge(c: NewChallenge, today = todayISO()): string | null {
  const title = c.title.trim()
  if (!title) return 'Geef je uitdaging een titel.'
  if (title.length > 60) return 'De titel mag maximaal 60 tekens lang zijn.'
  if ((c.description ?? '').length > 280) return 'De beschrijving mag maximaal 280 tekens lang zijn.'
  if (c.metric === 'distance' && c.sport === 'strength') return 'Krachttraining heeft geen afstand. Kies tijd of sessies.'
  if (!Number.isFinite(c.target) || c.target <= 0) return 'Vul een doel groter dan 0 in.'
  if (c.metric === 'sessions' && !Number.isInteger(c.target)) return 'Het aantal sessies moet een geheel getal zijn.'
  if (c.target > 99_999) return 'Dat doel is wel erg groot.'
  if (!c.starts_on || !c.ends_on) return 'Kies een start- en einddatum.'
  if (c.ends_on < c.starts_on) return 'De einddatum ligt vóór de startdatum.'
  if (c.ends_on < today) return 'Deze periode is al voorbij. Kies een einddatum vanaf vandaag.'
  if (daysBetween(c.starts_on, c.ends_on) > MAX_DAYS) return 'Een uitdaging duurt maximaal een jaar.'
  return null
}
