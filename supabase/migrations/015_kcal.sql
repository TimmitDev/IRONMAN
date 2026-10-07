-- Voer dit uit in Supabase > SQL Editor (na 014_cardio.sql).

-- Gewicht voor de kcal-berekening. Bewust niet in `profiles`: die rijen zijn leesbaar voor alle spelers.
-- Deze tabel ziet en wijzigt enkel de eigenaar.
create table if not exists public.private_settings (
  user_id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) check (weight_kg between 30 and 250)
);

alter table public.private_settings enable row level security;

create policy "private_settings_all_own" on public.private_settings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Verbrande kcal per training: berekend in het formulier (en aanpasbaar), of gemeten door Strava.
-- Null = onbekend; de app schat dan uit gewicht, sport, duur en tempo (src/lib/kcal.ts).
-- De feed en het spelersprofiel geven kcal niet door: samen met tempo verraadt het je gewicht.
alter table public.workouts
  add column if not exists kcal integer check (kcal between 0 and 20000);
