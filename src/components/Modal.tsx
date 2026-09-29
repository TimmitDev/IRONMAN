import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { iconButton } from '../lib/ui'
import { Icon } from './Icon'

/** Dialoog: bottom sheet op mobiel, gecentreerd venster vanaf sm. Sluit met Escape of klik naast. */
export function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl shadow-black/5 sm:max-w-lg sm:rounded-xl sm:p-6"
      >
        {/* Grijpbalkje: herkenbaar als bottom sheet op mobiel. */}
        <div className="mx-auto -mt-2 mb-3 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-3">{description}</p>}
          </div>
          <button onClick={onClose} className={`${iconButton} -mt-1 -mr-2`} aria-label="Sluiten">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
