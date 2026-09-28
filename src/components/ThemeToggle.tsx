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
