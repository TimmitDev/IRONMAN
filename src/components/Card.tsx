import type { ReactNode } from 'react'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-white/5 bg-zinc-900/70 p-5 backdrop-blur ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
