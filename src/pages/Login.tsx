import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { RACE, daysUntilRace } from '../lib/race'
import { inputClass, labelClass, primaryButton } from '../lib/ui'

export function Login() {
  const { session } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + window.location.pathname },
          })
    setBusy(false)
    if (error) setMessage({ type: 'error', text: error.message })
    else if (mode === 'signup' && !data.session)
      setMessage({ type: 'info', text: 'Check je mailbox om je account te bevestigen.' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black tracking-tight italic">
            IRON<span className="text-brand">MAN</span>
          </h1>
          <p className="mt-4 text-7xl leading-none font-black tracking-tighter">{daysUntilRace()}</p>
          <p className="mt-1 text-sm font-semibold tracking-widest text-zinc-400 uppercase">dagen tot {RACE.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-zinc-900/70 p-6 backdrop-blur">
          <label className="block">
            <span className={labelClass}>E-mail</span>
            <input type="email" autoComplete="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className={labelClass}>Wachtwoord</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy} className={`w-full ${primaryButton}`}>
            {busy ? 'Even geduld…' : mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
          </button>
          {message && <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>}
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          {mode === 'signin' ? 'Nog geen account?' : 'Al een account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setMessage(null)
            }}
            className="font-semibold text-white underline"
          >
            {mode === 'signin' ? 'Registreren' : 'Inloggen'}
          </button>
        </p>
      </div>
    </div>
  )
}
