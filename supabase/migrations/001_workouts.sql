-- Voer dit uit in Supabase > SQL Editor.

create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null default current_date,
  sport        text not null check (sport in ('swim', 'bike', 'run', 'strength')),
  duration_min integer not null check (duration_min > 0),
  distance_km  numeric(6, 2) check (distance_km >= 0),
  rpe          smallint check (rpe between 1 and 10),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

-- Row Level Security: iedereen ziet en bewerkt alleen zijn eigen trainingen.
alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select using ((select auth.uid()) = user_id);

create policy "workouts_insert_own" on public.workouts
  for insert with check ((select auth.uid()) = user_id);

create policy "workouts_update_own" on public.workouts
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "workouts_delete_own" on public.workouts
  for delete using ((select auth.uid()) = user_id);
