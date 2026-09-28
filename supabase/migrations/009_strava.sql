-- Voer dit uit in Supabase > SQL Editor (na 008_follows.sql).

-- Strava-koppeling. Tokens staan hier, maar de browser kan ze nooit lezen: alleen de Edge Functions
-- (met de service-role key) schrijven en lezen deze tabel volledig.
create table if not exists public.strava_connections (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  athlete_id     bigint not null unique,
  athlete_name   text,
  access_token   text not null,
  refresh_token  text not null,
  expires_at     timestamptz not null,
  scope          text,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.strava_connections enable row level security;

create policy "strava_select_own" on public.strava_connections
  for select to authenticated using ((select auth.uid()) = user_id);

-- Kolomrechten: de app mag de status zien, niet de tokens. Schrijven kan enkel server-side.
revoke all on public.strava_connections from anon, authenticated;
grant select (user_id, athlete_id, athlete_name, last_synced_at, created_at) on public.strava_connections to authenticated;

-- Geïmporteerde trainingen onthouden hun Strava-ID: zo komt niets dubbel binnen en werken updates/verwijderingen.
alter table public.workouts
  add column if not exists strava_activity_id bigint unique;
