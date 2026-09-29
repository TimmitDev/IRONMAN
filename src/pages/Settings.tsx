import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Switch } from '../components/Switch'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../lib/auth'
import { ask } from '../lib/feedback'
import { RaceFields, raceDraft, validateRace, type RaceDraft } from '../components/RaceFields'
import { useMe } from '../lib/profile'
import { useRace } from '../lib/raceContext'
import { STRAVA_ORANGE, checkStravaState, startStravaConnect, stravaEnabled, useStrava, type SyncResult } from '../lib/strava'
import { supabase } from '../lib/supabase'
import { errorMessage, ghostButton, hintClass, inputClass, labelClass, linkClass, primaryButton, secondaryButton } from '../lib/ui'

type Status = { type: 'ok' | 'error'; text: string } | null

/** Instellingen in secties: links de uitleg, rechts de velden (op mobiel onder elkaar). */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        <p className="mt-1 text-sm text-fg-3">{description}</p>
      </div>
      <div className="min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6">{children}</div>
    </section>
  )
}

function StatusText({ status }: { status: Status }) {
  if (!status) return null
  return <span className={`text-sm ${status.type === 'ok' ? 'text-success' : 'text-danger'}`}>{status.text}</span>
}

export function Settings() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Instellingen" description="Je profiel, wat je deelt met anderen, weergave en je account." />
      <ProfileSection />
      <PrivacySection />
      <Section title="Weergave" description="Licht, donker of automatisch volgens je apparaat.">
        <ThemeToggle labels />
      </Section>
      <RaceSection />
      <TrainingSection />
      <StravaSection />
      <AccountSection />
    </div>
  )
}

function ProfileSection() {
  const { me, save } = useMe()
  const [name, setName] = useState(me.display_name)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    try {
      await save({ display_name: name.trim(), show_on_leaderboard: me.show_on_leaderboard, share_workouts: me.share_workouts })
      setStatus({ type: 'ok', text: 'Opgeslagen.' })
    } catch (err) {
      setStatus({ type: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Profiel" description="Zo verschijn je in de feed, bij kudos en op het leaderboard.">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4">
          <Avatar name={name || '?'} size="lg" />
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Weergavenaam</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required />
          </label>
        </div>
        <p className={hintClass}>Maximaal 30 tekens.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || name.trim() === me.display_name} className={primaryButton}>
            {busy ? 'Opslaan…' : 'Opslaan'}
          </button>
          <Link to={`/leaderboard/${me.id}`} className={secondaryButton}>
            Bekijk je profiel
          </Link>
          <StatusText status={status} />
        </div>
      </form>
    </Section>
  )
}

function PrivacySection() {
  const { me, save } = useMe()
  const [status, setStatus] = useState<Status>(null)

  // Schakelaars slaan meteen op. Elk niveau vraagt het vorige: routes delen kan enkel als je trainingen deelt,
  // en dat enkel met een zichtbaar profiel.
  async function update(fields: { show_on_leaderboard: boolean; share_workouts: boolean; share_routes?: boolean }) {
    setStatus(null)
    const shareWorkouts = fields.show_on_leaderboard && fields.share_workouts
    try {
      await save({
        display_name: me.display_name,
        show_on_leaderboard: fields.show_on_leaderboard,
        share_workouts: shareWorkouts,
        share_routes: shareWorkouts && (fields.share_routes ?? me.share_routes),
      })
      setStatus({ type: 'ok', text: 'Opgeslagen.' })
    } catch (err) {
      setStatus({ type: 'error', text: errorMessage(err) })
    }
  }

  return (
    <Section title="Privacy" description="Kies wat andere spelers van je zien. Notities en RPE blijven altijd privé.">
      <div className="space-y-5">
        <Switch
          checked={me.show_on_leaderboard}
          onChange={(v) => update({ show_on_leaderboard: v, share_workouts: me.share_workouts })}
          label="Zichtbaar voor andere spelers"
          description="Je naam, totalen, records en weekgrafiek staan op het leaderboard, en anderen kunnen je volgen en online zien."
        />
        <Switch
          checked={me.show_on_leaderboard && me.share_workouts}
          disabled={!me.show_on_leaderboard}
          onChange={(v) => update({ show_on_leaderboard: me.show_on_leaderboard, share_workouts: v })}
          label="Trainingen delen"
          description="Losse trainingen (datum, sport, duur, afstand) in de feed en op je profiel, zodat anderen kudos kunnen geven."
        />
        <Switch
          checked={me.show_on_leaderboard && me.share_workouts && me.share_routes}
          disabled={!me.show_on_leaderboard || !me.share_workouts}
          onChange={(v) => update({ show_on_leaderboard: me.show_on_leaderboard, share_workouts: me.share_workouts, share_routes: v })}
          label="Routes delen op de kaart"
          description="Je Strava-routes verschijnen als kaart in de feed. De eerste en laatste 300 m worden altijd weggelaten, zodat je start en finish (bv. je huis) verborgen blijven."
        />
        <StatusText status={status} />
      </div>
    </Section>
  )
}

function RaceSection() {
  const { me, save } = useMe()
  const race = useRace()
  const [draft, setDraft] = useState<RaceDraft>(() => raceDraft(race))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const saved = raceDraft(race)
  const changed = draft.name.trim() !== saved.name || draft.type !== saved.type || draft.date !== saved.date

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const invalid = validateRace(draft)
    if (invalid) return setStatus({ type: 'error', text: invalid })
    setBusy(true)
    setStatus(null)
    try {
      await save({
        display_name: me.display_name,
        show_on_leaderboard: me.show_on_leaderboard,
        race_name: draft.name.trim(),
        race_date: draft.date,
        race_type: draft.type,
      })
      setStatus({ type: 'ok', text: 'Opgeslagen.' })
    } catch (err) {
      setStatus({ type: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Jouw race" description="De wedstrijd waarvoor je traint. Countdown, fases en je trainingsplan volgen deze keuze.">
      <form onSubmit={handleSubmit}>
        <RaceFields value={draft} onChange={setDraft} />
        <p className="mt-5 text-sm text-fg-3">
          Je trainingsplan past zich aan; zet het opnieuw in je schema via{' '}
          <Link to="/plan?tab=ironman" className={linkClass}>
            Schema → Raceplan
          </Link>
          .
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !changed} className={primaryButton}>
            {busy ? 'Opslaan…' : 'Opslaan'}
          </button>
          <StatusText status={status} />
        </div>
      </form>
    </Section>
  )
}

function TrainingSection() {
  const links: { to: string; icon: IconName; title: string; text: string }[] = [
    { to: '/goals', icon: 'target', title: 'Weekdoelen', text: 'Uren en kilometers per sport.' },
    { to: '/plan?tab=ironman', icon: 'calendar', title: 'Raceplan', text: 'Niveau, rustdag en lange sessies.' },
  ]
  return (
    <Section title="Training" description="Je doelen en je plan pas je aan op hun eigen pagina.">
      <ul className="-my-2 divide-y divide-line">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-hover">
              <Icon name={l.icon} className="size-[18px] shrink-0 text-fg-3" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{l.title}</span>
                <span className="block text-sm text-fg-3">{l.text}</span>
              </span>
              <Icon name="chevron-right" className="size-4 text-fg-4" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

const syncText = ({ imported, linked }: SyncResult) =>
  imported || linked
    ? `${imported} ${imported === 1 ? 'training' : 'trainingen'} geïmporteerd${linked ? `, ${linked} ${linked === 1 ? 'sessie' : 'sessies'} in je schema afgevinkt` : ''}.`
    : 'Alles is al bijgewerkt.'

function StravaSection() {
  const strava = useStrava()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState<'connect' | 'sync' | 'disconnect' | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const handled = useRef(false)

  // Terug van Strava (via public/strava-callback.html): code inwisselen en meteen de eerste sync.
  useEffect(() => {
    const code = params.get('strava_code')
    const error = params.get('strava_error')
    if ((!code && !error) || handled.current) return
    handled.current = true
    const scope = params.get('strava_scope') ?? ''
    const validState = checkStravaState(params.get('strava_state'))
    setParams({}, { replace: true })

    if (error) return setStatus({ type: 'error', text: 'Koppelen geannuleerd.' })
    if (!validState) return setStatus({ type: 'error', text: 'Deze koppeling kwam niet van jou. Probeer opnieuw.' })
    if (!scope.includes('activity:read')) {
      return setStatus({ type: 'error', text: 'Geef toegang tot je activiteiten (vink "activiteiten bekijken" aan) om te kunnen importeren.' })
    }
    setBusy('connect')
    setStatus({ type: 'ok', text: 'Koppelen met Strava…' })
    strava
      .connect(code!)
      .then(() => {
        setStatus({ type: 'ok', text: 'Gekoppeld. Activiteiten van de laatste 90 dagen importeren…' })
        return strava.sync()
      })
      .then((r) => setStatus({ type: 'ok', text: `Gekoppeld! ${syncText(r)}` }))
      .catch((e) => setStatus({ type: 'error', text: errorMessage(e) }))
      .finally(() => setBusy(null))
    // Alleen bij binnenkomst met parameters; `handled` voorkomt dat de code twee keer ingewisseld wordt.
  }, [params])

  async function run(action: 'sync' | 'disconnect') {
    if (action === 'disconnect' && !(await ask({ title: 'Strava ontkoppelen?', body: 'Geïmporteerde trainingen blijven staan.', confirm: 'Ontkoppelen', danger: true }))) return
    setBusy(action)
    setStatus(null)
    try {
      if (action === 'sync') setStatus({ type: 'ok', text: syncText(await strava.sync()) })
      else {
        await strava.disconnect()
        setStatus({ type: 'ok', text: 'Strava is ontkoppeld.' })
      }
    } catch (e) {
      setStatus({ type: 'error', text: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const c = strava.connection
  return (
    <Section title="Koppelingen" description="Importeer je activiteiten automatisch, zodat je niets meer met de hand hoeft te loggen.">
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line" style={{ color: STRAVA_ORANGE }} aria-hidden>
          <StravaLogo />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">Strava</p>
          {!stravaEnabled ? (
            <p className="mt-0.5 text-sm text-fg-3">Nog niet ingesteld voor deze app (VITE_STRAVA_CLIENT_ID ontbreekt, zie README).</p>
          ) : strava.loading ? (
            <p className="mt-0.5 text-sm text-fg-3">Laden…</p>
          ) : c ? (
            <p className="mt-0.5 text-sm text-fg-3">
              Gekoppeld{c.athlete_name ? ` als ${c.athlete_name}` : ''}
              {' · '}
              {c.last_synced_at ? `laatst gesynchroniseerd ${new Date(c.last_synced_at).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'nog niet gesynchroniseerd'}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-fg-3">
              Zwemmen, fietsen, lopen en kracht komen als training binnen en vinken de bijhorende sessie in je schema af. Notities en RPE vul je
              zelf aan.
            </p>
          )}
        </div>
      </div>

      {stravaEnabled && !strava.loading && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {c ? (
            <>
              <button onClick={() => run('sync')} disabled={busy !== null} className={secondaryButton}>
                <Icon name="refresh" className={`size-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                {busy === 'sync' ? 'Synchroniseren…' : 'Nu synchroniseren'}
              </button>
              <button onClick={() => run('disconnect')} disabled={busy !== null} className={ghostButton}>
                Ontkoppelen
              </button>
            </>
          ) : (
            <button onClick={startStravaConnect} disabled={busy !== null} className={primaryButton} style={{ backgroundColor: STRAVA_ORANGE }}>
              {busy === 'connect' ? 'Koppelen…' : 'Verbinden met Strava'}
            </button>
          )}
          <StatusText status={status} />
        </div>
      )}
      {stravaEnabled && <p className="mt-4 text-xs text-fg-4">Powered by Strava</p>}
    </Section>
  )
}

function StravaLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

function AccountSection() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setStatus({ type: 'error', text: error.message })
    else {
      setPassword('')
      setStatus({ type: 'ok', text: 'Wachtwoord gewijzigd.' })
    }
  }

  return (
    <Section title="Account" description="Je inloggegevens.">
      <dl>
        <dt className={labelClass}>E-mailadres</dt>
        <dd className="text-sm text-fg">{session?.user.email}</dd>
      </dl>
      <form onSubmit={changePassword} className="mt-6 border-t border-line pt-6">
        <label className="block">
          <span className={labelClass}>Nieuw wachtwoord</span>
          <input type="password" autoComplete="new-password" minLength={6} required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || password.length < 6} className={secondaryButton}>
            {busy ? 'Opslaan…' : 'Wachtwoord wijzigen'}
          </button>
          <StatusText status={status} />
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-6">
        <button onClick={() => supabase.auth.signOut()} className={secondaryButton}>
          <Icon name="logout" className="size-4" />
          Uitloggen
        </button>
      </div>
    </Section>
  )
}
