import { useEffect, useState } from 'react'

/**
 * Voortgangsbalk; `planned` toont als lichtere laag wat er nog gepland staat bovenop `value`.
 * Loopt bij het verschijnen vanaf nul vol, en schuift zacht mee als de waarde verandert.
 */
export function ProgressBar({
  value,
  max,
  planned = 0,
  color,
}: {
  value: number
  max: number
  planned?: number
  color: string
}) {
  // Eerste paint op 0, daarna naar de echte waarde: zo animeert de breedte bij het verschijnen.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const pct = (n: number) => (shown && max > 0 ? Math.min(100, (n / max) * 100) : 0)
  const bar = 'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]'
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      {planned > 0 && <div className={`${bar} opacity-30 ${color}`} style={{ width: `${pct(value + planned)}%` }} />}
      <div className={`${bar} ${color}`} style={{ width: `${pct(value)}%` }} />
    </div>
  )
}
