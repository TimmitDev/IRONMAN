import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { FollowButton } from '../components/FollowButton'
import { Icon, type IconName } from '../components/Icon'
import { PageLoader } from '../components/Layout'
import { RaceFields, raceDraft, validateRace, type RaceDraft } from '../components/RaceFields'
import { Switch } from '../components/Switch'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../lib/auth'
import { DAY_NAMES, DEFAULT_SETTINGS, LEVELS, applyPlan, defaultStartDate, generatePlan, usePlanSettings, type Level, type PlanSettings } from '../lib/ironmanPlan'
import { useProfile, type Profile, type ProfileFields } from '../lib/profile'
import { RACE_TYPES, addDays, currentPhase, formatDuration, phaseHours, weekStart } from '../lib/race'
import { useRace } from '../lib/raceContext'
import { useFollows, usePlayers } from '../lib/social'
import { SPORTS, SPORT_BG, SPORT_LABEL, type Sport } from '../lib/types'
import { errorMessage, ghostButton, hintClass, inputClass, labelClass, primaryButton } from '../lib/ui'
import { useGoals } from '../lib/useGoals'

const STEPS = ['Welkom', 'Profiel', 'Jouw race', 'Jouw week', 'Doelen', 'Community', 'Klaar'] as const

/** Typische verdeling voor een triatleet als er geen plan is om van af te leiden. */
const SPLIT: Record<Sport, number> = { swim: 0.15, bike: 0.5, run: 0.3, strength: 0.05 }

/**
 * Eerste kennismaking na het aanmelden. Stap "Profiel" maakt het profiel aan (vanaf dan zit je in de app);
 * de stappen erna zijn optioneel en kunnen overgeslagen worden.
 */
export function Onboarding() {
  const { session } = useAuth()
  const { profile, loading, save: saveProfile } = useProfile()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Wie al een profiel had toen de onboarding opende, hoort hier niet (meer).
  const startedOnboarded = useRef<boolean | null>(null)
  if (!loading && startedOnboarded.current === null) startedOnboarded.current = Boolean(profile)

  if (loading) return <PageLoader />
  if (startedOnboarded.current) return <Navigate to="/" replace />

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const defaultName = session!.user.email!.split('@')[0]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <span className="text-lg font-black tracking-tight italic">
            IRON<span className="text-brand">MAN</span>
          </span>
          {/* Kort op mobiel, zodat logo, teller en themaknoppen ook op 360px naast elkaar passen. */}
          <span className="ml-auto text-sm text-fg-3 tabular-nums">
            <span className="sm:hidden">
              {step + 1}/{STEPS.length}
            </span>
            <span className="hidden sm:inline">
              Stap {step + 1} van {STEPS.length}
            </span>
          </span>
          <ThemeToggle />
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-12">
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <ProfileStep defaultName={profile?.display_name ?? defaultName} initial={profile} onSave={saveProfile} onBack={back} onNext={next} />}
        {step === 2 && profile && <RaceStep profile={profile} onSave={saveProfile} onBack={back} onNext={next} />}
        {step === 3 && <WeekStep onBack={back} onNext={next} />}
        {step === 4 && <GoalsStep onBack={back} onNext={next} />}
        {step === 5 && profile && <CommunityStep meId={profile.id} onBack={back} onNext={next} />}
        {step === 6 && <DoneStep name={profile?.display_name ?? defaultName} onFinish={() => navigate('/', { replace: true })} />}
      </main>
    </div>
  )
}

function StepHeader({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon name={icon} className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 text-fg-3">{children}</p>
    </div>
  )
}

/** Knoppen onderaan: op mobiel vast in beeld, binnen duimbereik. */
function StepActions({
  onBack,
  onSkip,
  primary,
}: {
  onBack?: () => void
  onSkip?: () => void
  primary: { label: string; onClick?: () => void; busy?: boolean; disabled?: boolean; type?: 'button' | 'submit' }
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto border-t border-line bg-canvas/90 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-10 sm:pb-0 sm:backdrop-blur-none">
      {/* Mobiel: Terug/Overslaan bovenaan en de hoofdknop over de volle breedte eronder. Vanaf sm alles op één rij. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {(onBack || onSkip) && (
          <div className="flex items-center justify-between gap-2 sm:contents">
            {onBack ? (
              <button type="button" onClick={onBack} className={ghostButton}>
                <Icon name="chevron-left" className="size-4" />
                Terug
              </button>
            ) : (
              <span />
            )}
            {onSkip && (
              <button type="button" onClick={onSkip} className={`${ghostButton} sm:ml-auto`}>
                Overslaan
              </button>
            )}
          </div>
        )}
        <button
          type={primary.type ?? 'button'}
          onClick={primary.onClick}
          disabled={primary.busy || primary.disabled}
          className={`${primaryButton} h-11 w-full sm:h-10 sm:w-auto sm:min-w-32 ${onSkip ? '' : 'sm:ml-auto'}`}
        >
          {primary.busy ? 'Opslaan…' : primary.label}
          {!primary.busy && <Icon name="arrow-right" className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="mt-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p> : null
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const items: { icon: IconName; title: string; text: string }[] = [
    { icon: 'user', title: 'Je profiel', text: 'Hoe anderen je zien en wat je deelt.' },
    { icon: 'flag', title: 'Je race', text: 'Welke wedstrijd, welke afstand en wanneer.' },
    { icon: 'calendar', title: 'Je trainingsweek', text: 'Niveau en vaste dagen, voor een plan op maat.' },
    { icon: 'target', title: 'Je weekdoelen', text: 'Uren per sport, zodat je voortgang meetbaar is.' },
    { icon: 'users', title: 'Je trainingsgroep', text: 'Volg anderen voor kudos, reacties en een beetje competitie.' },
  ]
  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="text-sm font-semibold text-brand">Welkom!</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Samen op weg naar de finish.</h1>
        <p className="mt-3 text-fg-3">
          We zetten je in een paar stappen klaar voor je race, van sprint tot volledige afstand. Alles kan je later nog aanpassen in Instellingen.
        </p>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map((i, n) => (
          <li key={i.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-fg-2">
              <Icon name={i.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-fg-4">Stap {n + 2}</span>
              <span className="block font-semibold">{i.title}</span>
              <span className="block text-sm text-fg-3">{i.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <StepActions primary={{ label: 'Laten we beginnen', onClick: onNext }} />
    </div>
  )
}

function ProfileStep({
  defaultName,
  initial,
  onSave,
  onBack,
  onNext,
}: {
  defaultName: string
  initial: { show_on_leaderboard: boolean; share_workouts: boolean } | null
  onSave: (f: { display_name: string; show_on_leaderboard: boolean; share_workouts: boolean }) => Promise<void>
  onBack: () => void
  onNext: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [visible, setVisible] = useState(initial?.show_on_leaderboard ?? true)
  const [share, setShare] = useState(initial?.share_workouts ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const display_name = name.trim()
    if (!display_name) return setError('Kies een naam.')
    setBusy(true)
    setError(null)
    try {
      // Delen zonder zichtbaar profiel kan niet: dan ziet niemand de trainingen.
      await onSave({ display_name, show_on_leaderboard: visible, share_workouts: visible && share })
      onNext()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <StepHeader icon="user" title="Hoe mogen we je noemen?">
        Je naam verschijnt in de feed, bij kudos en op het leaderboard.
      </StepHeader>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={name || '?'} size="lg" />
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Weergavenaam</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required autoFocus />
          </label>
        </div>
        <p className={hintClass}>Maximaal 30 tekens. Je voornaam of een bijnaam werkt prima.</p>
      </div>

      <div className="mt-4 space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="shield" className="size-4 text-fg-3" />
          Privacy
        </div>
        <Switch
          checked={visible}
          onChange={setVisible}
          label="Zichtbaar voor andere spelers"
          description="Je naam, totalen en records staan op het leaderboard en je profiel is te vinden."
        />
        <Switch
          checked={visible && share}
          onChange={setShare}
          disabled={!visible}
          label="Trainingen delen in de feed"
          description="Anderen zien datum, sport, duur en afstand en kunnen kudos geven. Notities en RPE blijven altijd privé."
        />
      </div>

      <ErrorText error={error} />
      <StepActions onBack={onBack} primary={{ label: 'Doorgaan', type: 'submit', busy }} />
    </form>
  )
}

function RaceStep({
  profile,
  onSave,
  onBack,
  onNext,
}: {
  profile: Profile
  onSave: (f: ProfileFields) => Promise<void>
  onBack: () => void
  onNext: () => void
}) {
  // Vooraf ingevuld met je gekozen race, anders de standaardrace.
  const race = useRace()
  const [draft, setDraft] = useState<RaceDraft>(() => raceDraft(race))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const invalid = validateRace(draft)
    if (invalid) return setError(invalid)
    setBusy(true)
    setError(null)
    try {
      await onSave({
        display_name: profile.display_name,
        show_on_leaderboard: profile.show_on_leaderboard,
        race_name: draft.name.trim(),
        race_date: draft.date,
        race_type: draft.type,
      })
      onNext()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <StepHeader icon="flag" title="Voor welke race train je?">
        Je countdown, trainingsfases en je plan rekenen terug vanaf deze dag. Kies ook de afstand: een sprint vraagt minder volume dan een
        volledige afstand.
      </StepHeader>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <RaceFields value={draft} onChange={setDraft} />
      </div>

      <ErrorText error={error} />
      <StepActions onBack={onBack} primary={{ label: 'Doorgaan', type: 'submit', busy }} />
    </form>
  )
}

function WeekStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const race = useRace()
  const scale = RACE_TYPES[race.type].planScale
  const { settings: saved, save } = usePlanSettings()
  const [s, setS] = useState<PlanSettings>(() => saved ?? { ...DEFAULT_SETTINGS, startDate: defaultStartDate() })
  const [fillSchedule, setFillSchedule] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof PlanSettings>(key: K, value: PlanSettings[K]) => setS((prev) => ({ ...prev, [key]: value }))

  async function submit() {
    if (s.longBikeDay === s.longRunDay) return setError('Kies verschillende dagen voor je lange rit en lange loop.')
    if (s.restDay === s.longBikeDay || s.restDay === s.longRunDay) return setError('Je rustdag kan niet samenvallen met een lange sessie.')
    setBusy(true)
    setError(null)
    try {
      await save(s)
      if (fillSchedule) await applyPlan(generatePlan(s, race), addDays(weekStart(new Date()), 4 * 7 - 1))
      onNext()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  const daySelect = (key: 'restDay' | 'longBikeDay' | 'longRunDay', label: string) => (
    <label>
      <span className={labelClass}>{label}</span>
      <select className={inputClass} value={s[key]} onChange={(e) => set(key, Number(e.target.value))}>
        {DAY_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader icon="calendar" title="Hoe ziet jouw trainingsweek eruit?">
        Hiermee bouwen we je raceplan richting {race.name}: basis, opbouw, piek en taper, met elke vierde week herstel.
      </StepHeader>

      <fieldset>
        <legend className={labelClass}>Niveau</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(LEVELS) as Level[]).map((key) => {
            const level = LEVELS[key]
            const active = s.level === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => set('level', key)}
                aria-pressed={active}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  active ? 'border-brand bg-brand/5 ring-4 ring-brand/10' : 'border-line bg-surface shadow-card hover:border-line-strong'
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                    <Icon name="check" className="size-3" strokeWidth={3} />
                  </span>
                )}
                <p className="font-semibold">{level.label}</p>
                <p className="mt-1 text-sm text-fg-3">{level.description}</p>
                <p className="mt-3 text-xs font-medium text-fg-2">Piekweek ±{Math.round(level.peakHours * scale)} uur</p>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:grid-cols-3 sm:p-6">
        {daySelect('restDay', 'Rustdag')}
        {daySelect('longBikeDay', 'Lange rit')}
        {daySelect('longRunDay', 'Lange loop')}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <Switch
          checked={fillSchedule}
          onChange={setFillSchedule}
          label="Zet de komende 4 weken in mijn schema"
          description="Dan staan je sessies meteen klaar om af te vinken. Later uitbreiden of aanpassen kan altijd."
        />
      </div>

      <ErrorText error={error} />
      <StepActions onBack={onBack} onSkip={onNext} primary={{ label: 'Plan opslaan', onClick: submit, busy }} />
    </div>
  )
}

function GoalsStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { goals, loading, save } = useGoals()
  const { settings, loading: planLoading } = usePlanSettings()
  const race = useRace()

  // Voorstel: uit de huidige week van het plan, anders het midden van de richtlijn voor deze fase.
  const suggestion = useMemo(() => {
    const week = settings ? generatePlan(settings, race).find((w) => w.start === weekStart(new Date())) : undefined
    if (week) {
      return Object.fromEntries(SPORTS.map((sp) => [sp, week.sessions.filter((x) => x.sport === sp).reduce((a, x) => a + x.duration_min, 0)])) as Record<Sport, number>
    }
    const [min, max] = phaseHours(currentPhase(race), race)
    const total = ((min + max) / 2) * 60
    return Object.fromEntries(SPORTS.map((sp) => [sp, Math.round((total * SPLIT[sp]) / 15) * 15])) as Record<Sport, number>
  }, [settings, race])

  if (loading || planLoading) return <PageLoader />
  return <GoalsForm initial={Object.fromEntries(SPORTS.map((sp) => [sp, goals[sp]?.minutes ?? suggestion[sp]]))} fromPlan={Boolean(settings)} onSave={save} onBack={onBack} onNext={onNext} />
}

function GoalsForm({
  initial,
  fromPlan,
  onSave,
  onBack,
  onNext,
}: {
  initial: Record<string, number>
  fromPlan: boolean
  onSave: (g: { sport: Sport; minutes: number; distance_km: number | null }[]) => Promise<void>
  onBack: () => void
  onNext: () => void
}) {
  const [hours, setHours] = useState<Record<Sport, string>>(
    () => Object.fromEntries(SPORTS.map((sp) => [sp, initial[sp] ? String(Math.round((initial[sp] / 60) * 4) / 4) : ''])) as Record<Sport, string>,
  )
  const race = useRace()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = SPORTS.reduce((a, sp) => a + Math.round(Number(hours[sp] || 0) * 60), 0)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onSave(SPORTS.map((sp) => ({ sport: sp, minutes: Math.round(Number(hours[sp] || 0) * 60), distance_km: null })))
      onNext()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader icon="target" title="Wat is je doel per week?">
        {fromPlan ? 'We vulden alvast in wat je plan deze week voorziet.' : `Een voorstel voor de fase ${currentPhase(race).name}.`} Pas gerust aan.
      </StepHeader>

      <div className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
        {SPORTS.map((sp) => (
          <label key={sp} className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <span className={`h-8 w-1.5 shrink-0 rounded-full ${SPORT_BG[sp]}`} />
            <span className="min-w-0 flex-1 font-medium">{SPORT_LABEL[sp]}</span>
            <span className="relative w-32">
              <input
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                className={`${inputClass} pr-14 text-right tabular-nums`}
                value={hours[sp]}
                onChange={(e) => setHours((h) => ({ ...h, [sp]: e.target.value }))}
                aria-label={`${SPORT_LABEL[sp]}: uren per week`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-fg-3">u/wk</span>
            </span>
          </label>
        ))}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <span className="text-sm text-fg-3">Totaal per week</span>
          <span className="text-lg font-semibold tabular-nums">{formatDuration(total)}</span>
        </div>
      </div>

      <ErrorText error={error} />
      <StepActions onBack={onBack} onSkip={onNext} primary={{ label: 'Doelen opslaan', onClick: submit, busy }} />
    </div>
  )
}

function CommunityStep({ meId, onBack, onNext }: { meId: string; onBack: () => void; onNext: () => void }) {
  const players = usePlayers().filter((p) => p.user_id !== meId)
  const follows = useFollows(meId)

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader icon="users" title="Wie train je mee?">
        Volg spelers om hun trainingen in je feed te zien, kudos te geven en te zien wie er online is.
      </StepHeader>

      {players.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
          {players.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <Avatar name={p.display_name} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{p.display_name}</span>
              <FollowButton person={p} follows={follows} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-fg-3">
          Je bent een van de eersten! Zodra anderen meedoen, vind je ze op het leaderboard.
        </div>
      )}

      <StepActions onBack={onBack} primary={{ label: follows.following.length ? 'Doorgaan' : 'Later', onClick: onNext }} />
    </div>
  )
}

function DoneStep({ name, onFinish }: { name: string; onFinish: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-brand text-white shadow-lg shadow-brand/30">
        <Icon name="flag" className="size-8" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Klaar voor de start, {name}!</h1>
      <p className="mt-3 max-w-md text-fg-3">
        Je home toont je feed en je vrienden, je dashboard je voortgang. Log je eerste training om je eerste badge te verdienen.
      </p>
      <button onClick={onFinish} className={`mt-10 h-12 px-6 ${primaryButton}`}>
        Naar de app
        <Icon name="arrow-right" className="size-4" />
      </button>
    </div>
  )
}
