const SIZE = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-xl',
}

/** Rond initiaal-avatar; met `online` een groen bolletje rechtsonder. */
export function Avatar({ name, size = 'md', highlight = false, online = false }: { name: string; size?: keyof typeof SIZE; highlight?: boolean; online?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" aria-hidden>
      <span
        className={`flex items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-200 uppercase ${SIZE[size]} ${highlight ? 'ring-2 ring-brand/60' : ''}`}
      >
        {name.trim().slice(0, 1) || '?'}
      </span>
      {online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />}
    </span>
  )
}
