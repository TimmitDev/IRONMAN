// Edge Function `strava-webhook`: Strava meldt hier nieuwe, gewijzigde en verwijderde activiteiten,
// zodat ze binnenkomen zonder dat iemand de app opent. Optioneel; zonder webhook synct de app bij openen.
// Deploy: supabase functions deploy strava-webhook --no-verify-jwt   (Strava stuurt geen Supabase-token mee)
import { admin, importActivities, stravaGet, validToken, type Connection, type StravaActivity } from '../_shared/strava.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const VERIFY_TOKEN = Deno.env.get('STRAVA_VERIFY_TOKEN')

interface StravaEvent {
  object_type: 'activity' | 'athlete'
  object_id: number
  aspect_type: 'create' | 'update' | 'delete'
  owner_id: number
  updates?: Record<string, string>
}

async function handle(e: StravaEvent) {
  const { data: conn } = await admin.from('strava_connections').select('*').eq('athlete_id', e.owner_id).maybeSingle<Connection>()
  if (!conn) return

  // De atleet trok de toegang in via Strava zelf.
  if (e.object_type === 'athlete') {
    if (e.updates?.authorized === 'false') await admin.from('strava_connections').delete().eq('user_id', conn.user_id)
    return
  }

  const token = await validToken(conn)
  const { status, data } = await stravaGet<StravaActivity>(token, `/activities/${e.object_id}`)

  if (e.aspect_type === 'delete') {
    // Iedereen kan deze URL aanroepen: verwijder alleen als Strava bevestigt dat de activiteit echt weg is.
    if (status === 404) await admin.from('workouts').delete().eq('user_id', conn.user_id).eq('strava_activity_id', e.object_id)
    return
  }

  if (data) await importActivities(conn.user_id, [data], e.aspect_type === 'update')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Eenmalige bevestiging bij het aanmaken van de subscription.
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
      return Response.json({ 'hub.challenge': url.searchParams.get('hub.challenge') })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method === 'POST') {
    const event = (await req.json()) as StravaEvent
    // Strava verwacht binnen 2 seconden een 200; het werk gebeurt daarna.
    EdgeRuntime.waitUntil(handle(event).catch((err) => console.error('strava-webhook', err)))
    return new Response('ok')
  }

  return new Response('Method not allowed', { status: 405 })
})
