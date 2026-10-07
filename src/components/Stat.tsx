import type { ReactNode } from 'react'

/** Kerncijfer: klein label, rustig groot getal, optioneel een regel eronder. `tile` zet het in een eigen vlakje. */
export function Stat({ label, value, sub, tile = false }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tile?: boolean }) {
  return (
    <div className={tile ? 'rounded-xl bg-subtle p-4' : ''}>
      <p className="text-xs font-semibold tracking-wide text-fg-3 uppercase">{label}</p>
      <p className="font-display mt-1.5 text-[32px] leading-none font-bold tracking-tight text-fg tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-3">{sub}</p>}
    </div>
  )
}
