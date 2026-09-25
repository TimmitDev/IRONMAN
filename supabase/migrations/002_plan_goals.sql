-- Voer dit uit in Supabase > SQL Editor (na 001_workouts.sql).

-- Geplande trainingen. workout_id wijst naar de gelogde training zodra de sessie is afgevinkt.
create table if not exists public.planned_workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null,
  sport        text not null check (sport in ('swim', 'bike', 'run', 'strength')),
  title        text,
  duration_min integer not null check (duration_min > 0),
  distance_km  numeric(6, 2) check (distance_km >= 0),
  notes        text,
  workout_id   uuid references public.workouts (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists planned_workouts_user_date_idx on public.planned_workouts (user_id, date);

alter table public.planned_workouts enable row level security;

create policy "planned_select_own" on public.planned_workouts
  for select using ((select auth.uid()) = user_id);

create policy "planned_insert_own" on public.planned_workouts
  for insert with check ((select auth.uid()) = user_id);

create policy "planned_update_own" on public.planned_workouts
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "planned_delete_own" on public.planned_workouts
  for delete using ((select auth.uid()) = user_id);

-- Weekdoelen: één rij per sport per gebruiker.
create table if not exists public.weekly_goals (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sport       text not null check (sport in ('swim', 'bike', 'run', 'strength')),
  minutes     integer not null default 0 check (minutes >= 0),
  distance_km numeric(6, 2) check (distance_km >= 0),
  primary key (user_id, sport)
);

alter table public.weekly_goals enable row level security;

create policy "goals_all_own" on public.weekly_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
