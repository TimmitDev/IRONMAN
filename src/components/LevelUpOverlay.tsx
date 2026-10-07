import { useEffect, type CSSProperties } from 'react'
import { useProgress } from '../lib/progress'
import { LevelBadge } from './LevelBadge'

const BURST_COLORS = ['bg-brand', 'bg-swim', 'bg-bike', 'bg-run', 'bg-strength', 'bg-cardio']

/** Viering bij een nieuw level: schild dat inpopt met een kleurenregen. Sluit met een tik, Escape of na 6 s. */
export function LevelUpOverlay() {
  const { levelUp, title, dismissLevelUp } = useProgress()

  useEffect(() => {
    if (levelUp === null) return
    const timer = setTimeout(dismissLevelUp, 6000)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissLevelUp()
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [levelUp, dismissLevelUp])

  if (levelUp === null) return null
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in cursor-pointer items-center justify-center overflow-hidden bg-black/70 backdrop-blur-sm"
      onClick={dismissLevelUp}
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${levelUp} bereikt`}
    >
      {/* 24 snippers die vanuit het midden wegvliegen; richting en afstand via CSS-variabelen. */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const dist = 140 + (i % 4) * 45
        return (
          <span
            key={i}
            className={`absolute top-1/2 left-1/2 size-2.5 animate-burst rounded-sm ${BURST_COLORS[i % BURST_COLORS.length]}`}
            style={
              {
                '--dx': `${Math.cos(angle) * dist}px`,
                '--dy': `${Math.sin(angle) * dist}px`,
                animationDelay: `${120 + (i % 3) * 60}ms`,
              } as CSSProperties
            }
            aria-hidden
          />
        )
      })}
      <div className="relative flex flex-col items-center text-center text-white">
        <p className="font-display animate-fade-up text-sm font-bold tracking-[0.3em] text-white/70 uppercase">Level up</p>
        <div className="mt-4 animate-level-pop">
          <LevelBadge level={levelUp} size="xl" />
        </div>
        <p className="font-display mt-5 animate-fade-up text-4xl font-extrabold tracking-tight uppercase [animation-delay:250ms]">{title}</p>
        <p className="mt-2 animate-fade-up text-sm text-white/70 [animation-delay:350ms]">Tik om verder te gaan</p>
      </div>
    </div>
  )
}
