-- Voer dit uit in Supabase > SQL Editor (na 002_plan_goals.sql).

-- Publiek profiel: de naam op het leaderboard en of je meedoet.
create table if not exists public.profiles (
  id                  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 30),
  show_on_leaderboard boolean not null default true,
  created_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_visible" on public.profiles
  for select to authenticated using (show_on_leaderboard or (select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Leaderboard: alleen totalen per gebruiker, nooit losse trainingen of notities.
-- security definer omzeilt RLS bewust, daarom geeft de functie uitsluitend aggregaten terug.
create or replace function public.leaderboard(p_from date, p_to date)
returns table (
  user_id      uuid,
  display_name text,
  total_min    integer,
  swim_min     integer,
  bike_min     integer,
  run_min      integer,
  strength_min integer,
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
    w.total_min, w.swim_min, w.bike_min, w.run_min, w.strength_min,
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
