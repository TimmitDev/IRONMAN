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
    <label className={`flex cursor-pointer items-start justify-between gap-4 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-fg-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line-strong transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/25" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
