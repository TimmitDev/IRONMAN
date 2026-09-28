-- Voer dit uit in Supabase > SQL Editor (na 006_player_profiles.sql).

-- Social hub: een feed van gedeelde trainingen, met kudos en reacties.
-- Alleen trainingen van spelers die zichtbaar zijn én share_workouts aanzetten komen in de feed.
-- Notities en RPE blijven altijd privé.

-- Mag de huidige gebruiker deze training zien? Eigen trainingen altijd, die van anderen alleen als ze gedeeld zijn.
-- security definer omdat de workouts-RLS alleen eigen rijen toont; de functie geeft enkel een boolean terug.
create or replace function public.can_see_workout(p_workout uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workouts w
    left join public.profiles p on p.id = w.user_id
    where w.id = p_workout
      and (w.user_id = (select auth.uid()) or (p.show_on_leaderboard and p.share_workouts))
  );
$$;

revoke execute on function public.can_see_workout(uuid) from public, anon;
grant execute on function public.can_see_workout(uuid) to authenticated;

-- Kudos: één per speler per training. Verwijst naar profiles, dus alleen wie meedoet kan kudos geven.
create table if not exists public.kudos (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

alter table public.kudos enable row level security;

create policy "kudos_select_visible" on public.kudos
  for select to authenticated using (public.can_see_workout(workout_id));

-- Geen kudos op je eigen training.
create policy "kudos_insert_own" on public.kudos
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and public.can_see_workout(workout_id)
    and not exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );

create policy "kudos_delete_own" on public.kudos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Reacties: kort, niet bewerkbaar. Verwijderen mag de schrijver én de eigenaar van de training.
create table if not exists public.workout_comments (
  id         uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists workout_comments_workout_idx on public.workout_comments (workout_id, created_at);

alter table public.workout_comments enable row level security;

create policy "comments_select_visible" on public.workout_comments
  for select to authenticated using (public.can_see_workout(workout_id));

create policy "comments_insert_own" on public.workout_comments
  for insert to authenticated with check ((select auth.uid()) = user_id and public.can_see_workout(workout_id));

create policy "comments_delete_own_or_owner" on public.workout_comments
  for delete to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );

-- Feed: gedeelde trainingen, nieuwste eerst, met kudos en reacties (inclusief namen).
create or replace function public.social_feed(p_limit integer default 20, p_offset integer default 0)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed as (
    select w.id, w.user_id, p.display_name, w.date, w.sport, w.duration_min, w.distance_km, w.created_at
    from public.workouts w
    join public.profiles p on p.id = w.user_id
    where p.show_on_leaderboard
      and p.share_workouts
      and (select auth.uid()) is not null
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

revoke execute on function public.social_feed(integer, integer) from public, anon;
grant execute on function public.social_feed(integer, integer) to authenticated;

-- Meldingen: recente kudos en reacties van anderen op jouw trainingen.
create or replace function public.social_inbox(p_limit integer default 10)
returns table (
  kind         text,
  workout_id   uuid,
  sport        text,
  date         date,
  user_id      uuid,
  display_name text,
  body         text,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.*
  from (
    select 'kudos', k.workout_id, w.sport, w.date, k.user_id, p.display_name, null::text, k.created_at
    from public.kudos k
    join public.workouts w on w.id = k.workout_id
    join public.profiles p on p.id = k.user_id
    where w.user_id = (select auth.uid()) and k.user_id <> w.user_id
    union all
    select 'comment', c.workout_id, w.sport, w.date, c.user_id, p.display_name, c.body, c.created_at
    from public.workout_comments c
    join public.workouts w on w.id = c.workout_id
    join public.profiles p on p.id = c.user_id
    where w.user_id = (select auth.uid()) and c.user_id <> w.user_id
  ) x (kind, workout_id, sport, date, user_id, display_name, body, created_at)
  order by x.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.social_inbox(integer) from public, anon;
grant execute on function public.social_inbox(integer) to authenticated;
