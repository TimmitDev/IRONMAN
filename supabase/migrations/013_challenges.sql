-- Voer dit uit in Supabase > SQL Editor (na de eerdere migraties).

-- Uitdagingen: een groepsdoel binnen een periode, bv. "100 km lopen in oktober" of "10 uur trainen deze week".
-- Voortgang wordt niet opgeslagen maar telkens berekend uit de gelogde trainingen (ook Strava-imports).
-- Meedoen is een bewuste keuze: wie meedoet, deelt zijn totaal voor die uitdaging met de groep (nooit losse trainingen).
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  -- null = alle sporten.
  sport       text check (sport is null or sport in ('swim', 'bike', 'run', 'strength')),
  -- distance = km, duration = minuten, sessions = aantal trainingen.
  metric      text not null check (metric in ('distance', 'duration', 'sessions')),
  target      numeric(10, 2) not null check (target > 0),
  starts_on   date not null,
  ends_on     date not null,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 366),
  -- Krachttraining heeft geen afstand.
  check (not (metric = 'distance' and sport is not distinct from 'strength'))
);

create index if not exists challenges_ends_on_idx on public.challenges (ends_on);

alter table public.challenges enable row level security;

create policy "challenges_select_all" on public.challenges
  for select to authenticated using (true);

create policy "challenges_insert_own" on public.challenges
  for insert to authenticated with check ((select auth.uid()) = created_by);

create policy "challenges_update_own" on public.challenges
  for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy "challenges_delete_own" on public.challenges
  for delete to authenticated using ((select auth.uid()) = created_by);

-- Deelnemers: meedoen en stoppen kan alleen voor jezelf.
create table if not exists public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index if not exists challenge_participants_user_idx on public.challenge_participants (user_id);

alter table public.challenge_participants enable row level security;

create policy "challenge_participants_select_all" on public.challenge_participants
  for select to authenticated using (true);

-- Meedoen kan tot en met de laatste dag van de uitdaging.
create policy "challenge_participants_insert_own" on public.challenge_participants
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.ends_on >= current_date)
  );

create policy "challenge_participants_delete_own" on public.challenge_participants
  for delete to authenticated using ((select auth.uid()) = user_id);

-- De maker doet automatisch mee. In de database i.p.v. in de client: zo is het één transactie
-- en kan een uitdaging nooit zonder maker-deelnemer achterblijven.
create or replace function public.challenge_add_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.challenge_participants (challenge_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.challenge_add_creator() from public, anon, authenticated;

drop trigger if exists challenge_add_creator on public.challenges;
create trigger challenge_add_creator
  after insert on public.challenges
  for each row execute function public.challenge_add_creator();

-- Alle lopende en komende uitdagingen, plus die van de laatste 60 dagen, met per deelnemer het totaal.
-- security definer omdat de workouts-RLS alleen eigen rijen toont; de functie geeft enkel aggregaten terug.
create or replace function public.list_challenges()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'created_by', c.created_by,
    'creator_name', cp.display_name,
    'title', c.title,
    'description', c.description,
    'sport', c.sport,
    'metric', c.metric,
    'target', c.target,
    'starts_on', c.starts_on,
    'ends_on', c.ends_on,
    'created_at', c.created_at,
    'participants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', pp.user_id, 'display_name', p.display_name, 'value', v.value
      ) order by v.value desc, pp.joined_at), '[]'::jsonb)
      from public.challenge_participants pp
      join public.profiles p on p.id = pp.user_id
      cross join lateral (
        select case c.metric
          when 'distance' then round(coalesce(sum(w.distance_km), 0), 2)
          when 'duration' then round(coalesce(sum(w.duration_min), 0), 2)
          else count(*)::numeric
        end as value
        from public.workouts w
        where w.user_id = pp.user_id
          and w.date between c.starts_on and c.ends_on
          and (c.sport is null or w.sport = c.sport)
      ) v
      where pp.challenge_id = c.id
    )
  ) order by c.starts_on, c.created_at), '[]'::jsonb)
  from public.challenges c
  join public.profiles cp on cp.id = c.created_by
  where c.ends_on >= current_date - 60
    and (select auth.uid()) is not null;
$$;

revoke execute on function public.list_challenges() from public, anon;
grant execute on function public.list_challenges() to authenticated;
