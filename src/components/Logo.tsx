import { Link } from 'react-router-dom'

/** Woordmerk: rustig en recht, met het merkrood als enig accent. */
export function Logo({ className = 'text-base', link = true }: { className?: string; link?: boolean }) {
  const mark = (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight text-fg ${className}`}>
      <span className="size-2 rounded-full bg-brand" aria-hidden />
      <span>
        IRON<span className="text-fg-3">MAN</span>
      </span>
    </span>
  )
  return link ? (
    <Link to="/" aria-label="IRONMAN Training, naar Home">
      {mark}
    </Link>
  ) : (
    mark
  )
}
