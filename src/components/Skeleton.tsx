/** Laadblok: zachte grijze vorm die pulseert. Geef hoogte/breedte mee via className. */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-subtle ${className}`} aria-hidden />
}

/** Een kaart vol laadregels, voor lijsten en tabellen die nog laden. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Laden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}
