import type { ReactNode } from 'react'

/** Kerncijfer: klein label, rustig groot getal, optioneel een regel eronder. `tile` zet het in een eigen vlakje. */
export function Stat({ label, value, sub, tile = false }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tile?: boolean }) {
  return (
    <div className={tile ? 'rounded-lg bg-subtle p-4' : ''}>
      <p className="text-xs text-fg-3">{label}</p>
      <p className="mt-1.5 text-2xl font-medium tracking-tight text-fg tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-3">{sub}</p>}
    </div>
  )
}
