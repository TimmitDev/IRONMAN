/** Tabs/segment-knoppen; horizontaal scrollbaar als ze niet passen. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/70 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.key ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
