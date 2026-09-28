// Edge Function `strava`: koppelen, synchroniseren en ontkoppelen, aangeroepen vanuit de app.
// Deploy: supabase functions deploy strava --no-verify-jwt   (de functie controleert de gebruiker zelf)
import { admin, cors, importActivities, json, stravaGet, tokenRequest, validToken, type Connection, type StravaActivity } from '../_shared/strava.ts'

const DAY = 86_400_000
/** Eerste sync haalt zoveel geschiedenis op; daarna vanaf de vorige sync (met marge voor late uploads). */
const FIRST_SYNC_DAYS = 90
const MARGIN_DAYS = 2

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
    const user = auth.user
    if (!user) return json({ error: 'Niet ingelogd.' }, 401)

    const { action, code } = (await req.json()) as { action?: string; code?: string }

    if (action === 'connect') {
      if (!code) return json({ error: 'Code ontbreekt.' }, 400)
      const t = await tokenRequest({ grant_type: 'authorization_code', code })
      if (!t.athlete) return json({ error: 'Strava gaf geen atleet terug.' }, 400)
      const { error } = await admin.from('strava_connections').upsert({
        user_id: user.id,
        athlete_id: t.athlete.id,
        athlete_name: [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(' ') || null,
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: new Date(t.expires_at * 1000).toISOString(),
      })
      if (error?.code === '23505') return json({ error: 'Dit Strava-account is al gekoppeld aan een andere speler.' }, 409)
      if (error) throw error
      return json({ ok: true })
    }

    const { data: conn } = await admin.from('strava_connections').select('*').eq('user_id', user.id).maybeSingle<Connection>()
    if (!conn) return json({ error: 'Geen Strava-koppeling gevonden.' }, 404)

    if (action === 'sync') {
      const token = await validToken(conn)
      // Zijn er geïmporteerde trainingen waarvan de route nog niet opgehaald is? Dan de volle periode opnieuw bekijken.
      const { count: withoutRoute } = await admin
        .from('workouts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('strava_activity_id', 'is', null)
        .is('route_polyline', null)
      const since =
        conn.last_synced_at && !withoutRoute ? new Date(conn.last_synced_at).getTime() - MARGIN_DAYS * DAY : Date.now() - FIRST_SYNC_DAYS * DAY
      const activities: StravaActivity[] = []
      for (let page = 1; page <= 10; page++) {
        const { data } = await stravaGet<StravaActivity[]>(token, `/athlete/activities?after=${Math.floor(since / 1000)}&per_page=100&page=${page}`)
        activities.push(...(data ?? []))
        if (!data || data.length < 100) break
      }
      const result = await importActivities(user.id, activities)
      await admin.from('strava_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', user.id)
      return json(result)
    }

    if (action === 'disconnect') {
      // Toegang bij Strava intrekken; lukt dat niet (token al ongeldig), dan toch lokaal ontkoppelen.
      try {
        const token = await validToken(conn)
        await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      } catch {
        // negeren
      }
      await admin.from('strava_connections').delete().eq('user_id', user.id)
      return json({ ok: true })
    }

    return json({ error: 'Onbekende actie.' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
