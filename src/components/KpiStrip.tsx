import type { ReactNode } from 'react'

export interface Kpi {
  label: string
  value: ReactNode
  sub?: ReactNode
}

/** Rij kerncijfers in één vlak, gescheiden door dunne lijnen: 2 kolommen op mobiel, 4 vanaf lg. */
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <section className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface lg:grid-cols-4">
      {items.map((k, i) => (
        <div
          key={k.label}
          className={`min-w-0 border-line p-4 sm:p-5 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
        >
          <p className="truncate text-xs text-fg-3">{k.label}</p>
          <p className="mt-2 truncate text-2xl font-medium tracking-tight text-fg tabular-nums">{k.value}</p>
          {k.sub && <p className="mt-1 truncate text-xs text-fg-3">{k.sub}</p>}
        </div>
      ))}
    </section>
  )
}

/** Verschil t.o.v. een vorige periode: groen bij beter, rood bij minder, grijs bij gelijk. */
export function Delta({ value, children }: { value: number; children: ReactNode }) {
  const tone = value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-fg-3'
  return <span className={tone}>{children}</span>
}
