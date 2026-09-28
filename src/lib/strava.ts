import { useCallback, useEffect, useState } from 'react'
import { appUrl } from './auth'
import { supabase } from './supabase'
import { notifyWorkoutsChanged } from './useWorkouts'

/*
 * Strava-koppeling. De browser doet alleen de OAuth-redirect; het inwisselen van de code, de tokens en
 * het ophalen van activiteiten gebeurt in de Edge Function `strava` (supabase/functions/strava), zodat
 * het client secret en de tokens nooit in de browser komen.
 */

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string | undefined

/** Strava staat alleen aan als er een client ID is ingesteld (.env.local / GitHub secret). */
export const stravaEnabled = Boolean(CLIENT_ID)

/** Oranje van Strava, voor de koppelknop (merkrichtlijnen). */
export const STRAVA_ORANGE = '#FC4C02'

const STATE_KEY = 'strava_oauth_state'
const AUTO_SYNC_MS = 30 * 60_000

export interface StravaConnection {
  athlete_id: number
  athlete_name: string | null
  last_synced_at: string | null
  created_at: string
}

export interface SyncResult {
  imported: number
  linked: number
}

/** Stuurt door naar Strava. Die stuurt terug naar public/strava-callback.html, en dat naar #/instellingen. */
export function startStravaConnect() {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: new URL('strava-callback.html', appUrl()).toString(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  })
  window.location.assign(`https://www.strava.com/oauth/authorize?${params}`)
}

/** Klopt de teruggestuurde state met wat we meegaven? Beschermt tegen een vervalste koppeling. */
export function checkStravaState(state: string | null) {
  const expected = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return Boolean(state && expected && state === expected)
}

async function call<T>(action: 'connect' | 'sync' | 'disconnect', body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('strava', { body: { action, ...body } })
  if (error) {
    // De functie geeft { error } terug; die melding is duidelijker dan "non-2xx status code".
    let message = error.message
    try {
      const json = await (error as { context?: Response }).context?.json()
      if (json?.error) message = json.error
    } catch {
      // Geen JSON: de algemene melding volstaat.
    }
    throw new Error(message)
  }
  return data as T
}

export async function syncStrava(): Promise<SyncResult> {
  const result = await call<SyncResult>('sync')
  if (result.imported || result.linked) notifyWorkoutsChanged()
  return result
}

export function useStrava() {
  const [connection, setConnection] = useState<StravaConnection | null>(null)
  const [loading, setLoading] = useState(stravaEnabled)

  const refresh = useCallback(async () => {
    if (!stravaEnabled) return
    const { data } = await supabase.from('strava_connections').select('athlete_id, athlete_name, last_synced_at, created_at').maybeSingle()
    setConnection(data as StravaConnection | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = async (code: string) => {
    await call('connect', { code })
    await refresh()
  }

  const sync = async () => {
    const result = await syncStrava()
    await refresh()
    return result
  }

  const disconnect = async () => {
    await call('disconnect')
    setConnection(null)
  }

  return { connection, loading, connect, sync, disconnect }
}

let lastAutoSync = 0

/**
 * Synchroniseert stil bij het openen van de app en bij terugkeren naar het tabblad, hooguit elk half uur.
 * Met de webhook (zie README) komen activiteiten ook zonder de app te openen binnen.
 */
export function useStravaAutoSync() {
  useEffect(() => {
    if (!stravaEnabled) return
    const run = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastAutoSync < AUTO_SYNC_MS) return
      lastAutoSync = Date.now()
      const { data } = await supabase.from('strava_connections').select('last_synced_at').maybeSingle()
      if (!data) return
      const last = data.last_synced_at ? new Date(data.last_synced_at).getTime() : 0
      if (Date.now() - last < AUTO_SYNC_MS) return
      await syncStrava().catch(() => {
        // Stil: de gebruiker kan in Instellingen handmatig synchroniseren en ziet daar de fout.
      })
    }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [])
}
