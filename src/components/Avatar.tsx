const SIZE = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
}

/** Rond initiaal-avatar, neutraal van kleur; met `online` een groen bolletje rechtsonder. */
export function Avatar({
  name,
  size = 'md',
  highlight = false,
  online = false,
}: {
  name: string
  size?: keyof typeof SIZE
  highlight?: boolean
  online?: boolean
}) {
  return (
    <span className="relative inline-flex shrink-0" aria-hidden>
      <span
        className={`flex items-center justify-center rounded-full bg-muted font-medium text-fg-2 uppercase ${SIZE[size]} ${
          highlight ? 'ring-1 ring-fg-3 ring-offset-2 ring-offset-surface' : ''
        }`}
      >
        {name.trim().slice(0, 1) || '?'}
      </span>
      {online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-surface" />}
    </span>
  )
}
