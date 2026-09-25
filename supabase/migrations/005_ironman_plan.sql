-- Voer dit uit in Supabase > SQL Editor (na 004_duration_seconds.sql).

-- Instellingen van het gegenereerde IRONMAN-plan (niveau, rustdag, lange dagen, startdatum).
create table if not exists public.plan_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings   jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.plan_settings enable row level security;

create policy "plan_settings_all_own" on public.plan_settings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Herkomst van een geplande sessie: zelf ingepland of uit het IRONMAN-plan.
-- Opnieuw toepassen van het plan vervangt alleen 'plan'-sessies die nog niet gedaan zijn.
alter table public.planned_workouts
  add column if not exists source text not null default 'manual' check (source in ('manual', 'plan'));
