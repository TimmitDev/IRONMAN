/** Voortgangsbalk; `planned` toont als lichtere laag wat er nog gepland staat bovenop `value`. */
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
  const pct = (n: number) => (max > 0 ? Math.min(100, (n / max) * 100) : 0)
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
      {planned > 0 && (
        <div className={`absolute inset-y-0 left-0 rounded-full opacity-30 ${color}`} style={{ width: `${pct(value + planned)}%` }} />
      )}
      <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${pct(value)}%` }} />
    </div>
  )
}
