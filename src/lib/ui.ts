// Gedeelde stijlklassen. Alles gebruikt de thematokens uit index.css, zodat light en dark vanzelf kloppen.

/** text-base op mobiel: iOS zoomt in bij invoervelden kleiner dan 16px. */
export const inputClass =
  'block h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base text-fg placeholder:text-fg-4 transition focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none disabled:bg-subtle disabled:text-fg-4 sm:text-sm'

export const labelClass = 'mb-1.5 block text-sm font-medium text-fg-2'

export const hintClass = 'mt-1.5 text-xs text-fg-3'

const buttonBase =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'

export const primaryButton = `${buttonBase} bg-brand text-white shadow-sm hover:brightness-110 active:brightness-95`

export const secondaryButton = `${buttonBase} border border-line-strong bg-surface text-fg hover:bg-hover`

export const ghostButton = `${buttonBase} text-fg-2 hover:bg-hover hover:text-fg`

export const dangerButton = `${buttonBase} bg-danger text-white hover:brightness-110`

export const dangerOutlineButton = `${buttonBase} border border-danger/30 text-danger hover:bg-danger/10`

/** Vierkante knop voor een icoon (sluiten, pijlen). */
export const iconButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-3 transition hover:bg-hover hover:text-fg focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none'

/** Tekstlink in merkkleur, bv. "Alles bekijken →". */
export const linkClass = 'text-sm font-semibold text-brand hover:underline'

/** Kleine label-pil, bv. "jij" of "herstelweek". */
export const pillClass = 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-fg-2'

/** Klein kopje boven een groep, bv. "Bijna binnen". */
export const eyebrowClass = 'text-xs font-semibold tracking-wide text-fg-3 uppercase'

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))
