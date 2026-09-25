export const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-brand focus:outline-none'

export const labelClass = 'mb-1 block text-xs font-medium text-zinc-400'

export const primaryButton =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50'

export const ghostButton = 'rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white'

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))
