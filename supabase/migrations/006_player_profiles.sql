-- Voer dit uit in Supabase > SQL Editor (na 005_ironman_plan.sql).

-- Opt-in: losse trainingen (datum, sport, duur, afstand) tonen op je profiel. Notities en RPE nooit.
alter table public.profiles
  add column if not exists share_workouts boolean not null default false;

-- Profiel van één speler. security definer omzeilt RLS bewust: de functie geeft totalen, records en
-- weektotalen terug, en losse trainingen enkel als de speler share_workouts aanzette.
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
        'swim_km',      coalesce(sum(distance_km) filter (where sport = 'swim'), 0),
        'bike_km',      coalesce(sum(distance_km) filter (where sport = 'bike'), 0),
        'run_km',       coalesce(sum(distance_km) filter (where sport = 'run'), 0)
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
        'id', id, 'date', date, 'sport', sport, 'duration_min', duration_min,
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
