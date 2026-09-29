import { useTheme, type ThemePreference } from '../lib/theme'
import { iconButton } from '../lib/ui'
import { Icon, type IconName } from './Icon'

const OPTIONS: { key: ThemePreference; label: string; icon: IconName }[] = [
  { key: 'light', label: 'Licht', icon: 'sun' },
  { key: 'dark', label: 'Donker', icon: 'moon' },
  { key: 'system', label: 'Systeem', icon: 'monitor' },
]

/** Drie knoppen: licht, donker, systeem. `labels` toont ook de tekst (instellingen). */
export function ThemeToggle({ labels = false }: { labels?: boolean }) {
  const { preference, setPreference } = useTheme()
  return (
    <div className={`flex gap-0.5 rounded-lg bg-subtle p-0.5 ${labels ? 'w-full' : 'w-fit'}`} role="radiogroup" aria-label="Thema">
      {OPTIONS.map((o) => {
        const active = preference === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setPreference(o.key)}
            className={`inline-flex h-8 items-center justify-center gap-2 rounded-md px-2.5 text-sm transition ${labels ? 'flex-1' : ''} ${
              active ? 'bg-surface font-medium text-fg ring-1 ring-line' : 'text-fg-3 hover:text-fg'
            }`}
          >
            <Icon name={o.icon} className="size-4" />
            {labels && o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Rij met een aan/uit-schakelaar voor donkere modus, in de stijl van de menu-items (zijbalk).
 * Omschakelen kiest expliciet licht of donker; "systeem" kies je in Instellingen.
 */
export function DarkModeSwitch() {
  const { resolved, preference, setPreference } = useTheme()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setPreference(dark ? 'light' : 'dark')}
      className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg-2 transition hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none"
    >
      <Icon name={dark ? 'moon' : 'sun'} className="size-[18px] text-fg-3" />
      <span className="min-w-0 flex-1 leading-tight">
        Donkere modus
        {preference === 'system' && <span className="block text-[11px] text-fg-4">Volgt je apparaat</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${dark ? 'bg-fg' : 'bg-line-strong'}`} aria-hidden>
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}

/** Eén knop die wisselt tussen licht en donker (mobiele bovenbalk). */
export function ThemeSwitchButton() {
  const { resolved, setPreference } = useTheme()
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button onClick={() => setPreference(next)} className={iconButton} aria-label={next === 'dark' ? 'Donkere modus' : 'Lichte modus'}>
      <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}
