import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/** Lege toestand: icoon, korte titel, uitleg en eventueel een actie. */
export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Icon name={icon} className="size-6 text-fg-4" />
      <p className="mt-4 text-sm font-medium text-fg">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-fg-3">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
