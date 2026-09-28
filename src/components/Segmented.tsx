/** Tabs/segment-knoppen; horizontaal scrollbaar als ze niet passen. Met `full` verdelen ze de volle breedte. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full = false,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
  full?: boolean
}) {
  return (
    <div className={`no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 ${full ? 'w-full' : 'w-fit'}`} role="tablist">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`h-8 shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition ${full ? 'flex-1' : ''} ${
              active ? 'bg-surface text-fg shadow-sm' : 'text-fg-3 hover:text-fg'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
