import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { ThemeToggle } from '../components/ThemeToggle'
import { appUrl, useAuth } from '../lib/auth'
import { RACE, daysUntilRace } from '../lib/race'
import { supabase } from '../lib/supabase'
import { hintClass, inputClass, labelClass, primaryButton } from '../lib/ui'

type Mode = 'signin' | 'signup' | 'forgot'

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  signin: { title: 'Welkom terug', subtitle: 'Log in om verder te trainen.', submit: 'Inloggen' },
  signup: { title: 'Account aanmaken', subtitle: 'Gratis, in minder dan een minuut. Daarna stellen we samen je plan op.', submit: 'Account aanmaken' },
  forgot: { title: 'Wachtwoord vergeten', subtitle: 'We sturen je een link om een nieuw wachtwoord te kiezen.', submit: 'Herstellink versturen' },
}

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar', title: 'Schema op maat', text: 'Een opbouwplan van basis tot taper, afgestemd op jouw niveau en week.' },
  { icon: 'chart', title: 'Inzicht in je voortgang', text: 'Weekdoelen, volume per sport, badges en een wekelijks rapport.' },
  { icon: 'users', title: 'Train samen', text: 'Volg je trainingsmaten, geef kudos en strijd mee op het leaderboard.' },
]

export function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<'confirm' | 'reset' | null>(null)

  if (session) return <Navigate to="/" replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setSent(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
      setBusy(false)
      if (error) setError(error.message)
      else setSent('reset')
      return
    }
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } })
    setBusy(false)
    if (error) setError(translateAuthError(error.message))
    else if (mode === 'signup' && !data.session) setSent('confirm')
  }

  const copy = COPY[mode]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Merkpaneel: altijd donker, los van het thema. */}
      <aside className="relative hidden overflow-hidden bg-[#0b0b0e] p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-40 size-[36rem] rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -bottom-48 size-[28rem] rounded-full bg-brand/10 blur-3xl" />
        <p className="relative text-2xl font-black tracking-tight italic">
          IRON<span className="text-brand">MAN</span>
        </p>
        <div className="relative mt-auto">
          <p className="text-sm font-semibold tracking-wide text-white/60 uppercase">
            {RACE.name} · {RACE.date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="mt-3 text-8xl leading-none font-black tracking-tighter tabular-nums">{daysUntilRace()}</p>
          <p className="mt-2 text-lg text-white/70">dagen tot de start. Elke training telt.</p>
          <ul className="mt-12 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon name={f.icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-white/60">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8">
        <div className="flex items-center justify-between">
          <p className="text-xl font-black tracking-tight italic lg:invisible">
            IRON<span className="text-brand">MAN</span>
          </p>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {/* Mobiel: compacte countdown in plaats van het merkpaneel. */}
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card lg:hidden">
            <span className="text-4xl font-black tracking-tighter tabular-nums">{daysUntilRace()}</span>
            <span className="text-sm text-fg-3">
              dagen tot <span className="font-semibold text-fg">{RACE.name}</span>
            </span>
          </div>

          {sent ? (
            <SentNotice kind={sent} email={email} onBack={() => switchMode('signin')} />
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
              <p className="mt-1.5 text-sm text-fg-3">{copy.subtitle}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className={labelClass}>E-mailadres</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="jij@voorbeeld.be"
                    className={inputClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {mode !== 'forgot' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium text-fg-2">
                        Wachtwoord
                      </label>
                      {mode === 'signin' && (
                        <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-brand hover:underline">
                          Vergeten?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        minLength={6}
                        required
                        className={`${inputClass} pr-11`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-fg-3 hover:text-fg"
                        aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                      >
                        <Icon name={showPassword ? 'eye-off' : 'eye'} className="size-[18px]" />
                      </button>
                    </div>
                    {mode === 'signup' && <p className={hintClass}>Minstens 6 tekens.</p>}
                  </div>
                )}

                {error && (
                  <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className={`h-11 w-full ${primaryButton}`}>
                  {busy ? 'Even geduld…' : copy.submit}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-fg-3">
                {mode === 'signin' ? (
                  <>
                    Nog geen account?{' '}
                    <button onClick={() => switchMode('signup')} className="font-semibold text-brand hover:underline">
                      Registreren
                    </button>
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Al een account?' : 'Toch weer bekend?'}{' '}
                    <button onClick={() => switchMode('signin')} className="font-semibold text-brand hover:underline">
                      Inloggen
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function SentNotice({ kind, email, onBack }: { kind: 'confirm' | 'reset'; email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon name="mail" className="size-7" />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Check je mailbox</h1>
      <p className="mt-2 text-sm text-fg-3">
        {kind === 'confirm' ? 'We stuurden een bevestigingslink naar ' : 'We stuurden een herstellink naar '}
        <span className="font-semibold text-fg">{email}</span>.{' '}
        {kind === 'confirm' ? 'Klik erop om je account te activeren; daarna start je onboarding.' : 'Klik erop om een nieuw wachtwoord te kiezen.'}
      </p>
      <p className="mt-4 text-xs text-fg-4">Niets ontvangen? Kijk ook in je spam-map.</p>
      <button onClick={onBack} className="mt-8 text-sm font-semibold text-brand hover:underline">
        Terug naar inloggen
      </button>
    </div>
  )
}

/** De meest voorkomende Supabase-meldingen in het Nederlands; de rest ongewijzigd. */
function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'E-mailadres of wachtwoord klopt niet.'
  if (/email not confirmed/i.test(message)) return 'Bevestig eerst je e-mailadres via de link in je mailbox.'
  if (/already registered/i.test(message)) return 'Er bestaat al een account met dit e-mailadres. Log in of herstel je wachtwoord.'
  if (/password should be at least/i.test(message)) return 'Je wachtwoord moet minstens 6 tekens lang zijn.'
  if (/rate limit/i.test(message)) return 'Te veel pogingen. Probeer het over een paar minuten opnieuw.'
  return message
}
