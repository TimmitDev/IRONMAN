-- Voer dit uit in Supabase > SQL Editor (na 009_strava.sql).

-- Routes uit Strava (Google encoded polyline).
--   route_polyline: de volledige route, alleen zichtbaar voor jezelf (workouts-RLS).
--   route_public:   dezelfde route zonder de eerste en laatste 300 m, zodat je start (vaak je huis) verborgen blijft.
--                   Enkel deze versie komt ooit bij anderen, en alleen als je share_routes aanzet.
-- Een lege string betekent "gecontroleerd, geen route" (bv. binnen op de rollen), NULL "nog niet opgehaald".
alter table public.workouts
  add column if not exists route_polyline text,
  add column if not exists route_public text;

-- Opt-in, standaard uit: routes tonen in de feed.
alter table public.profiles
  add column if not exists share_routes boolean not null default false;

-- Feed opnieuw, nu met de ingekorte route als de speler routes deelt.
create or replace function public.social_feed(p_limit integer default 20, p_offset integer default 0, p_following boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed as (
    select w.id, w.user_id, p.display_name, w.date, w.sport, w.duration_min, w.distance_km, w.created_at,
           case when p.share_routes then nullif(w.route_public, '') end as route
    from public.workouts w
    join public.profiles p on p.id = w.user_id
    where p.show_on_leaderboard
      and p.share_workouts
      and (select auth.uid()) is not null
      and (
        not p_following
        or w.user_id = (select auth.uid())
        or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = w.user_id)
      )
    order by w.date desc, w.created_at desc
    limit least(greatest(p_limit, 1), 50)
    offset greatest(p_offset, 0)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'user_id', f.user_id,
    'display_name', f.display_name,
    'date', f.date,
    'sport', f.sport,
    'duration_min', f.duration_min,
    'distance_km', f.distance_km,
    'created_at', f.created_at,
    'route', f.route,
    'kudos', (
      select coalesce(jsonb_agg(jsonb_build_object('user_id', k.user_id, 'display_name', kp.display_name) order by k.created_at), '[]'::jsonb)
      from public.kudos k
      join public.profiles kp on kp.id = k.user_id
      where k.workout_id = f.id
    ),
    'comments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'user_id', c.user_id, 'display_name', cp.display_name, 'body', c.body, 'created_at', c.created_at
      ) order by c.created_at), '[]'::jsonb)
      from public.workout_comments c
      join public.profiles cp on cp.id = c.user_id
      where c.workout_id = f.id
    )
  ) order by f.date desc, f.created_at desc), '[]'::jsonb)
  from feed f;
$$;
