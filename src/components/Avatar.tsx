const SIZE = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-xl',
  xl: 'size-20 text-3xl',
}

// Vaste tint per naam, zodat iemand overal dezelfde kleur heeft.
const TINTS = [
  'bg-swim/15 text-swim',
  'bg-bike/15 text-bike',
  'bg-run/15 text-run',
  'bg-strength/15 text-strength',
  'bg-brand/12 text-brand',
]

function tint(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

/** Rond initiaal-avatar; met `online` een groen bolletje rechtsonder. */
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
      <span className={`flex items-center justify-center rounded-full font-bold uppercase ${SIZE[size]} ${tint(name)} ${highlight ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : ''}`}>
        {name.trim().slice(0, 1) || '?'}
      </span>
      {online && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-surface" />}
    </span>
  )
}
