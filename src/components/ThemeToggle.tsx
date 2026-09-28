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
    <div className={`flex gap-1 rounded-xl bg-muted p-1 ${labels ? 'w-full' : 'w-fit'}`} role="radiogroup" aria-label="Thema">
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
            className={`inline-flex h-8 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition ${labels ? 'flex-1' : ''} ${
              active ? 'bg-surface text-fg shadow-sm' : 'text-fg-3 hover:text-fg'
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
      className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-fg-2 transition hover:bg-hover hover:text-fg focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none"
    >
      <Icon name={dark ? 'moon' : 'sun'} className="size-5 text-fg-3" />
      <span className="min-w-0 flex-1 leading-tight">
        Donkere modus
        {preference === 'system' && <span className="block text-[11px] font-normal text-fg-4">Volgt je apparaat</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${dark ? 'bg-brand' : 'bg-line-strong'}`} aria-hidden>
        <span
          className={`absolute top-0.5 left-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-5 text-brand' : 'text-warning'}`}
        >
          <Icon name={dark ? 'moon' : 'sun'} className="size-3" strokeWidth={2.5} />
        </span>
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
