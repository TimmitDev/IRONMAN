import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../components/Icon'
import { dangerButton, primaryButton, secondaryButton } from './ui'

/*
 * Feedback zonder browservensters: korte meldingen (toast) en een bevestigingsvenster (ask).
 * Beide zijn gewone functies, dus bruikbaar in handlers én buiten componenten:
 *   toast.error(errorMessage(e))
 *   if (!(await ask({ title: 'Training verwijderen?', danger: true }))) return
 * <FeedbackHost /> (in App.tsx) tekent ze.
 */

type Tone = 'success' | 'error' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}
interface Ask {
  title: string
  body?: string
  confirm?: string
  cancel?: string
  danger?: boolean
}

let toasts: Toast[] = []
let pending: (Ask & { resolve: (ok: boolean) => void }) | null = null
let nextId = 1
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function push(tone: Tone, message: string) {
  const id = nextId++
  // Nieuwste onderaan; hooguit drie tegelijk.
  toasts = [...toasts, { id, tone, message }].slice(-3)
  emit()
  window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500)
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
}

/** Bevestigingsvenster; geeft true bij bevestigen, false bij annuleren of sluiten. */
export function ask(opts: Ask): Promise<boolean> {
  pending?.resolve(false)
  return new Promise((resolve) => {
    pending = { ...opts, resolve }
    emit()
  })
}

function answer(ok: boolean) {
  pending?.resolve(ok)
  pending = null
  emit()
}

const TONE_ICON = { success: 'check', error: 'close', info: 'bell' } as const

export function FeedbackHost() {
  // Hertekenen bij elke wijziging; de inhoud zelf staat in de module-variabelen hierboven.
  useSyncExternalStore(subscribe, () => version)

  return createPortal(
    <>
      {/* Boven de mobiele tabbalk; op desktop rechtsonder. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-toast items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-fg shadow-lg shadow-black/5 dark:shadow-black/40"
          >
            <Icon
              name={TONE_ICON[t.tone]}
              className={`mt-0.5 size-4 shrink-0 ${t.tone === 'error' ? 'text-danger' : t.tone === 'success' ? 'text-success' : 'text-fg-3'}`}
            />
            <p className="min-w-0 flex-1">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-1 p-1 text-fg-4 transition hover:text-fg" aria-label="Sluiten">
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      {pending && <ConfirmDialog ask={pending} />}
    </>,
    document.body,
  )
}

function ConfirmDialog({ ask: a }: { ask: Ask }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && answer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex animate-fade-in items-end justify-center bg-overlay backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => answer(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={a.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full animate-sheet rounded-t-2xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl shadow-black/5 sm:max-w-sm sm:animate-pop sm:rounded-xl sm:p-6"
      >
        <h2 className="text-base font-semibold text-fg">{a.title}</h2>
        {a.body && <p className="mt-2 text-sm text-fg-3">{a.body}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => answer(false)} className={secondaryButton}>
            {a.cancel ?? 'Annuleren'}
          </button>
          <button type="button" autoFocus onClick={() => answer(true)} className={a.danger ? dangerButton : primaryButton}>
            {a.confirm ?? 'Bevestigen'}
          </button>
        </div>
      </div>
    </div>
  )
}
