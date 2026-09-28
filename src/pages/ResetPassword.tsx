import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { hintClass, inputClass, labelClass, primaryButton } from '../lib/ui'

/** Na een herstellink: nieuw wachtwoord kiezen, daarna gewoon verder in de app. */
export function ResetPassword() {
  const { endRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('De wachtwoorden zijn niet gelijk.')
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(error.message)
    else endRecovery()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icon name="lock" className="size-6" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Nieuw wachtwoord</h1>
        <p className="mt-1.5 text-sm text-fg-3">Kies een nieuw wachtwoord voor je account.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className={labelClass}>Nieuw wachtwoord</span>
            <input type="password" autoComplete="new-password" minLength={6} required autoFocus className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className={`block ${hintClass}`}>Minstens 6 tekens.</span>
          </label>
          <label className="block">
            <span className={labelClass}>Herhaal wachtwoord</span>
            <input type="password" autoComplete="new-password" minLength={6} required className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy} className={`h-11 w-full ${primaryButton}`}>
            {busy ? 'Opslaan…' : 'Wachtwoord opslaan'}
          </button>
        </form>
      </div>
    </div>
  )
}
