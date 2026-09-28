import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Switch } from '../components/Switch'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../lib/auth'
import { useMe } from '../lib/profile'
import { supabase } from '../lib/supabase'
import { errorMessage, hintClass, inputClass, labelClass, primaryButton, secondaryButton } from '../lib/ui'

type Status = { type: 'ok' | 'error'; text: string } | null

/** Instellingen in secties: links de uitleg, rechts de velden (op mobiel onder elkaar). */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-sm text-fg-3">{description}</p>
      </div>
      <div className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">{children}</div>
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
      <TrainingSection />
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

  // Schakelaars slaan meteen op; delen kan alleen met een zichtbaar profiel.
  async function update(fields: { show_on_leaderboard: boolean; share_workouts: boolean }) {
    setStatus(null)
    try {
      await save({ display_name: me.display_name, ...fields, share_workouts: fields.show_on_leaderboard && fields.share_workouts })
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
        <StatusText status={status} />
      </div>
    </Section>
  )
}

function TrainingSection() {
  const links: { to: string; icon: IconName; title: string; text: string }[] = [
    { to: '/goals', icon: 'target', title: 'Weekdoelen', text: 'Uren en kilometers per sport.' },
    { to: '/plan?tab=ironman', icon: 'calendar', title: 'IRONMAN-plan', text: 'Niveau, rustdag en lange sessies.' },
  ]
  return (
    <Section title="Training" description="Je doelen en je plan pas je aan op hun eigen pagina.">
      <ul className="-my-2 divide-y divide-line">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-hover">
              <span className="flex size-9 items-center justify-center rounded-xl bg-subtle text-fg-2">
                <Icon name={l.icon} className="size-[18px]" />
              </span>
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
