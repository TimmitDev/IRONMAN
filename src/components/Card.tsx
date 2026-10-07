import type { ReactNode } from 'react'

/**
 * Basisvlak van de app: ronde kaart met dunne lijn (en een zachte schaduw in light). Met `title` krijgt de kaart
 * een kop (optioneel met `description` en `action` rechts). `flush` laat de binnenruimte weg.
 */
export function Card({
  title,
  description,
  action,
  children,
  className = '',
  flush = false,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface shadow-card ${flush ? '' : 'p-5 sm:p-6'} ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${flush ? 'px-5 pt-5 sm:px-6 sm:pt-6' : ''} mb-5`}>
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>}
            {description && <p className="mt-1 text-sm text-fg-3">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
