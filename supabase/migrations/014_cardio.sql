-- Voer dit uit in Supabase > SQL Editor (na 013_challenges.sql).

-- Vijfde sport: cardio (roeien, stairmaster), met de soort in cardio_type.
-- De lijst met soorten staat in src/lib/types.ts (CARDIO_TYPES); hier enkel een vormcontrole,
-- zodat er soorten bij kunnen zonder nieuwe migratie.

alter table public.workouts drop constraint if exists workouts_sport_check;
alter table public.workouts add constraint workouts_sport_check
  check (sport in ('swim', 'bike', 'run', 'strength', 'cardio'));

alter table public.workouts
  add column if not exists cardio_type text
  constraint workouts_cardio_type_check check (cardio_type is null or (sport = 'cardio' and cardio_type ~ '^[a-z_]{1,30}$'));

alter table public.planned_workouts drop constraint if exists planned_workouts_sport_check;
alter table public.planned_workouts add constraint planned_workouts_sport_check
  check (sport in ('swim', 'bike', 'run', 'strength', 'cardio'));

alter table public.weekly_goals drop constraint if exists weekly_goals_sport_check;
alter table public.weekly_goals add constraint weekly_goals_sport_check
  check (sport in ('swim', 'bike', 'run', 'strength', 'cardio'));

alter table public.challenges drop constraint if exists challenges_sport_check;
alter table public.challenges add constraint challenges_sport_check
  check (sport is null or sport in ('swim', 'bike', 'run', 'strength', 'cardio'));

-- Leaderboard zoals in 003_leaderboard.sql, met cardio_min erbij. Het teruggavetype verandert, dus eerst droppen.
drop function if exists public.leaderboard(date, date);

create function public.leaderboard(p_from date, p_to date)
returns table (
  user_id      uuid,
  display_name text,
  total_min    integer,
  swim_min     integer,
  bike_min     integer,
  run_min      integer,
  strength_min integer,
  cardio_min   integer,
  swim_km      numeric,
  bike_km      numeric,
  run_km       numeric,
  sessions     integer,
  active_days  integer,
  planned      integer,
  planned_done integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    w.total_min, w.swim_min, w.bike_min, w.run_min, w.strength_min, w.cardio_min,
    w.swim_km, w.bike_km, w.run_km,
    w.sessions, w.active_days,
    pl.planned, pl.planned_done
  from public.profiles p
  cross join lateral (
    select
      coalesce(sum(duration_min), 0)::integer                                  as total_min,
      coalesce(sum(duration_min) filter (where sport = 'swim'), 0)::integer     as swim_min,
      coalesce(sum(duration_min) filter (where sport = 'bike'), 0)::integer     as bike_min,
      coalesce(sum(duration_min) filter (where sport = 'run'), 0)::integer      as run_min,
      coalesce(sum(duration_min) filter (where sport = 'strength'), 0)::integer as strength_min,
      coalesce(sum(duration_min) filter (where sport = 'cardio'), 0)::integer   as cardio_min,
      coalesce(sum(distance_km) filter (where sport = 'swim'), 0)               as swim_km,
      coalesce(sum(distance_km) filter (where sport = 'bike'), 0)               as bike_km,
      coalesce(sum(distance_km) filter (where sport = 'run'), 0)                as run_km,
      count(*)::integer                                                        as sessions,
      count(distinct date)::integer                                            as active_days
    from public.workouts
    where workouts.user_id = p.id and date between p_from and p_to
  ) w
  cross join lateral (
    -- Schema-trouw telt alleen sessies tot en met vandaag; toekomstige zijn nog geen gemiste.
    select count(*)::integer as planned, count(workout_id)::integer as planned_done
    from public.planned_workouts
    where planned_workouts.user_id = p.id and date between p_from and least(p_to, current_date)
  ) pl
  where p.show_on_leaderboard
    and (select auth.uid()) is not null;
$$;

revoke execute on function public.leaderboard(date, date) from public, anon;
grant execute on function public.leaderboard(date, date) to authenticated;

-- Profiel van één speler zoals in 011_races.sql, met cardio_min/cardio_km en de cardiosoort per training.
create or replace function public.player_profile(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'created_at', p.created_at,
    'share_workouts', p.share_workouts,
    'race', case when p.race_date is not null then jsonb_build_object('name', p.race_name, 'date', p.race_date, 'type', p.race_type) end,
    'totals', (
      select jsonb_build_object(
        'sessions',     count(*),
        'active_days',  count(distinct date),
        'first_date',   min(date),
        'last_date',    max(date),
        'total_min',    coalesce(sum(duration_min), 0),
        'swim_min',     coalesce(sum(duration_min) filter (where sport = 'swim'), 0),
        'bike_min',     coalesce(sum(duration_min) filter (where sport = 'bike'), 0),
        'run_min',      coalesce(sum(duration_min) filter (where sport = 'run'), 0),
        'strength_min', coalesce(sum(duration_min) filter (where sport = 'strength'), 0),
        'cardio_min',   coalesce(sum(duration_min) filter (where sport = 'cardio'), 0),
        'swim_km',      coalesce(sum(distance_km) filter (where sport = 'swim'), 0),
        'bike_km',      coalesce(sum(distance_km) filter (where sport = 'bike'), 0),
        'run_km',       coalesce(sum(distance_km) filter (where sport = 'run'), 0),
        'cardio_km',    coalesce(sum(distance_km) filter (where sport = 'cardio'), 0)
      )
      from public.workouts w
      where w.user_id = p.id
    ),
    -- Langste sessie per sport, in km en in tijd.
    'records', (
      select coalesce(jsonb_object_agg(sport, jsonb_build_object('km', max_km, 'min', max_min)), '{}'::jsonb)
      from (
        select sport, max(distance_km) as max_km, max(duration_min) as max_min
        from public.workouts w
        where w.user_id = p.id
        group by sport
      ) r
    ),
    -- Schema-trouw telt alleen sessies tot en met vandaag, zoals op het leaderboard.
    'planned', (select count(*) from public.planned_workouts pw where pw.user_id = p.id and pw.date <= current_date),
    'planned_done', (select count(workout_id) from public.planned_workouts pw where pw.user_id = p.id and pw.date <= current_date),
    -- Minuten en km per sport per week (maandag), de laatste 12 weken.
    'weeks', (
      select coalesce(jsonb_agg(jsonb_build_object('week', week, 'sport', sport, 'minutes', minutes, 'km', km)), '[]'::jsonb)
      from (
        select date - (extract(isodow from date)::integer - 1) as week, sport,
               sum(duration_min) as minutes, coalesce(sum(distance_km), 0) as km
        from public.workouts w
        where w.user_id = p.id
          and date >= current_date - (extract(isodow from current_date)::integer - 1) - 77
        group by 1, 2
      ) x
    ),
    'workouts', case when p.share_workouts then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'date', date, 'sport', sport, 'cardio_type', cardio_type, 'duration_min', duration_min,
        'distance_km', distance_km, 'created_at', created_at
      ) order by date desc, created_at desc), '[]'::jsonb)
      from public.workouts w
      where w.user_id = p.id
    ) end
  )
  from public.profiles p
  where p.id = p_user
    and (p.show_on_leaderboard or p.id = (select auth.uid()))
    and (select auth.uid()) is not null;
$$;

revoke execute on function public.player_profile(uuid) from public, anon;
grant execute on function public.player_profile(uuid) to authenticated;

-- Feed zoals in 012_highlights.sql, met de cardiosoort erbij.
create or replace function public.social_feed(p_limit integer default 20, p_offset integer default 0, p_following boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed as (
    select w.id, w.user_id, p.display_name, w.date, w.sport, w.cardio_type, w.duration_min, w.distance_km, w.created_at,
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
    'cardio_type', f.cardio_type,
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
