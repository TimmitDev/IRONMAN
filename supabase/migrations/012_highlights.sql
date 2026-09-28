-- Voer dit uit in Supabase > SQL Editor (na 010_routes.sql).

-- Wat was er bijzonder aan een training, vergeleken met de eerdere sessies van dezelfde speler en sport?
--   bucket:    de grootste afstandsklasse die de sessie haalt (vanaf 99% van de afstand), anders weggelaten.
--   bucket_pr: 'first' als het de eerste keer is dat die klasse gehaald werd, 'pr' bij een sneller gemiddeld tempo
--              dan alle eerdere sessies die de klasse haalden.
--   longest:   true als het de langste afstand ooit is in die sport, met minstens 3 eerdere sessies.
-- "Eerder" = vroegere datum, of dezelfde datum en eerder aangemaakt. Zelfde klassen als src/lib/records.ts.
-- security invoker: binnen social_feed (security definer) draait hij als de eigenaar en ziet hij alle rijen;
-- rechtstreeks aanroepen kan niet (execute ingetrokken), zodat PostgREST hem ook niet als berekende kolom toont.
create or replace function public.workout_highlights(w public.workouts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with buckets(sport, km) as (
    values ('run', 5::numeric), ('run', 10), ('run', 21.1), ('run', 42.2),
           ('bike', 40), ('bike', 90), ('bike', 180),
           ('swim', 1), ('swim', 1.9), ('swim', 3.8)
  ),
  prev as (
    select p.duration_min, p.distance_km
    from public.workouts p
    where p.user_id = w.user_id
      and p.sport = w.sport
      and p.id <> w.id
      and (p.date < w.date or (p.date = w.date and p.created_at < w.created_at))
  ),
  b as (
    select max(bk.km) as km
    from buckets bk
    where bk.sport = w.sport
      and w.duration_min > 0
      and w.distance_km >= bk.km * 0.99
  )
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'bucket', b.km,
    'bucket_pr', case
      when b.km is null then null
      when not exists (select 1 from prev where prev.distance_km >= b.km * 0.99 and prev.duration_min > 0) then 'first'
      when w.duration_min / w.distance_km < (
        select min(prev.duration_min / prev.distance_km)
        from prev
        where prev.distance_km >= b.km * 0.99 and prev.duration_min > 0
      ) then 'pr'
    end,
    'longest', case
      when w.distance_km > 0
        and (select count(*) from prev) >= 3
        and w.distance_km > coalesce((select max(prev.distance_km) from prev), 0)
      then true
    end
  )), '{}'::jsonb)
  from b;
$$;

revoke execute on function public.workout_highlights(public.workouts) from public, anon, authenticated;

-- Feed opnieuw (zelfde als 010_routes.sql), nu met highlights per training.
create or replace function public.social_feed(p_limit integer default 20, p_offset integer default 0, p_following boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed as (
    select w.id, w.user_id, p.display_name, w.date, w.sport, w.duration_min, w.distance_km, w.created_at,
           case when p.share_routes then nullif(w.route_public, '') end as route,
           w as workout
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
    -- Pas na de limit berekend, dus enkel voor de getoonde pagina.
    'highlights', public.workout_highlights(f.workout),
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
