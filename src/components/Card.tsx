import type { ReactNode } from 'react'

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {title && <h2 className="mb-3 text-sm font-medium text-stone-500 dark:text-stone-400">{title}</h2>}
      {children}
    </section>
  )
}
