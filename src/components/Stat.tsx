import type { ReactNode } from 'react'

/** Kerncijfer: klein label, groot getal, optioneel een regel eronder. `tile` zet het in een eigen vlakje. */
export function Stat({ label, value, sub, tile = false }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tile?: boolean }) {
  return (
    <div className={tile ? 'rounded-xl bg-subtle p-4' : ''}>
      <p className="text-xs font-medium text-fg-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-3">{sub}</p>}
    </div>
  )
}
