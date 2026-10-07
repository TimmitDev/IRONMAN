import { useId } from 'react'
import { useProgress, type Streak } from '../lib/progress'
import { Icon } from './Icon'

const SIZES = {
  sm: { box: 'size-8', text: 'text-sm' },
  md: { box: 'size-11', text: 'text-lg' },
  lg: { box: 'size-20', text: 'text-4xl' },
  xl: { box: 'size-32', text: 'text-6xl' },
} as const

/** Zeshoekig schild met het levelnummer. `onColor` voor op een gekleurde achtergrond (wit schild). */
export function LevelBadge({ level, size = 'md', onColor = false }: { level: number; size?: keyof typeof SIZES; onColor?: boolean }) {
  const s = SIZES[size]
  // Eigen id per badge: een gedeelde id verwijst naar de eerste, en die kan in een verborgen balk zitten (dan geen kleur).
  // useId bevat tekens als ":" of "«" die in url(#…) niet werken; enkel letters en cijfers houden.
  const gradId = `lvl${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${s.box}`} role="img" aria-label={`Level ${level}`}>
      <svg viewBox="0 0 40 44" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff4d5e" />
            <stop offset="1" stopColor="#b80d22" />
          </linearGradient>
        </defs>
        <path
          d="M20 1.5 37 11v22L20 42.5 3 33V11z"
          fill={onColor ? 'rgb(255 255 255 / 0.18)' : `url(#${gradId})`}
          stroke={onColor ? 'rgb(255 255 255 / 0.55)' : 'rgb(255 255 255 / 0.25)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-display relative font-extrabold text-white tabular-nums ${s.text}`}>{level}</span>
    </span>
  )
}

/** Vlammetje met het aantal streakdagen. Grijs zonder reeks, rood pulserend als ze vandaag dreigt te breken. */
export function StreakChip({ streak, className = '' }: { streak: Streak; className?: string }) {
  const tone = !streak.days ? 'bg-subtle text-fg-3' : streak.atRisk ? 'bg-danger/10 text-danger' : 'bg-orange-500/12 text-orange-500'
  const title = !streak.days
    ? 'Nog geen streak. Train vandaag om te starten.'
    : streak.atRisk
      ? 'Je rustdagen van deze week zijn op: train vandaag om je streak te houden.'
      : `${streak.days} dagen streak · nog ${streak.restLeft} ${streak.restLeft === 1 ? 'rustdag' : 'rustdagen'} deze week`
  return (
    <span className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-bold tabular-nums ${tone} ${className}`} title={title} aria-label={title}>
      <Icon name="flame" className={`size-4 ${streak.days ? 'fill-current' : ''} ${streak.atRisk ? 'animate-pulse' : ''}`} />
      {streak.days}
    </span>
  )
}

/** Level + streak naast elkaar, voor in de navigatiebalken. */
export function ProgressChips() {
  const p = useProgress()
  if (p.loading) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <StreakChip streak={p.streak} />
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-subtle py-0.5 pr-3 pl-0.5" title={`${p.title} · ${p.xp.toLocaleString('nl-BE')} XP`}>
        <LevelBadge level={p.level} size="sm" />
        <span className="text-xs font-semibold text-fg-2">
          <span className="sr-only">Level </span>
          {Math.round(p.levelProgress * 100)}%
        </span>
      </span>
    </span>
  )
}

/** XP-balk: hoe ver je in je huidige level zit. */
export function XpBar({ onColor = false }: { onColor?: boolean }) {
  const p = useProgress()
  return (
    <div>
      <div
        className={`relative h-2.5 overflow-hidden rounded-full ${onColor ? 'bg-white/20' : 'bg-muted'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={p.levelSize}
        aria-valuenow={p.levelXp}
        aria-label={`XP in level ${p.level}`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-[var(--ease-out-soft)] ${onColor ? 'bg-white' : 'bg-brand'}`}
          style={{ width: `${Math.max(2, p.levelProgress * 100)}%` }}
        />
      </div>
      <div className={`mt-1.5 flex justify-between text-xs tabular-nums ${onColor ? 'text-white/75' : 'text-fg-3'}`}>
        <span>
          {p.levelXp.toLocaleString('nl-BE')} / {p.levelSize.toLocaleString('nl-BE')} XP
        </span>
        <span>
          nog {(p.levelSize - p.levelXp).toLocaleString('nl-BE')} tot level {p.level + 1}
        </span>
      </div>
    </div>
  )
}
