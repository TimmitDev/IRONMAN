import type { ReactNode } from 'react'

/** Aan/uit-schakelaar met label en uitleg; de hele rij is klikbaar. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-6 ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>
      <span className="min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {description && <span className="mt-1 block text-sm text-fg-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-line-strong transition peer-checked:bg-fg peer-focus-visible:ring-2 peer-focus-visible:ring-fg/20" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-sm transition peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
