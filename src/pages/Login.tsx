import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { RACE, daysUntilRace } from '../lib/race'

const input =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950'

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
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            IRONMAN <span className="text-red-600">Training</span>
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {RACE.name} · nog {daysUntilRace()} dagen
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
        >
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">E-mail</span>
            <input type="email" autoComplete="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">Wachtwoord</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Even geduld…' : mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
          </button>
          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700 dark:text-green-500'}`}>
              {message.text}
            </p>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-stone-500">
          {mode === 'signin' ? 'Nog geen account?' : 'Al een account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setMessage(null)
            }}
            className="font-medium text-stone-900 underline dark:text-stone-100"
          >
            {mode === 'signin' ? 'Registreren' : 'Inloggen'}
          </button>
        </p>
      </div>
    </div>
  )
}
