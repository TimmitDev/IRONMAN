// Gedeelde stijlklassen. Sportief: vette knoppen met het merkrood als hoofdactie, ronde vlakken.
// Alles gebruikt de thematokens uit index.css, zodat light en dark vanzelf kloppen.

/** text-base op mobiel: iOS zoomt in bij invoervelden kleiner dan 16px. */
export const inputClass =
  'block h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-fg-4 transition focus:border-fg-3 focus:ring-2 focus:ring-fg/10 focus:outline-none disabled:bg-subtle disabled:text-fg-4 sm:text-sm'

export const labelClass = 'mb-1.5 block text-sm text-fg-2'

export const hintClass = 'mt-1.5 text-xs text-fg-3'

const buttonBase =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'

/** Hoofdactie in het merkrood, met een zachte gloed. */
export const primaryButton = `${buttonBase} bg-brand text-white shadow-[0_4px_14px_-4px_rgb(227_18_45/0.55)] hover:brightness-110 active:brightness-95`

export const secondaryButton = `${buttonBase} border border-line-strong bg-surface text-fg hover:bg-hover`

export const ghostButton = `${buttonBase} text-fg-2 hover:bg-hover hover:text-fg`

export const dangerButton = `${buttonBase} bg-danger text-white hover:opacity-90`

export const dangerOutlineButton = `${buttonBase} border border-line-strong text-danger hover:border-danger/40 hover:bg-danger/5`

/** Vierkante knop voor een icoon (sluiten, pijlen). */
export const iconButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-fg-3 transition hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-fg/20 focus-visible:outline-none'

/** Tekstlink, bv. "Alles bekijken". Neutraal; onderlijnt bij hover. */
export const linkClass = 'text-sm font-medium text-fg-2 underline-offset-4 hover:text-fg hover:underline'

/** Kleine label-pil, bv. "jij" of "herstelweek". */
export const pillClass = 'inline-flex items-center rounded-md bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg-2'

/** Klein kopje boven een groep, bv. "Bijna binnen". */
export const eyebrowClass = 'text-xs font-semibold tracking-wide text-fg-3 uppercase'

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))
