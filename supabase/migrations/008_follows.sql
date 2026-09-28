-- Voer dit uit in Supabase > SQL Editor (na 007_social.sql).

-- Volgen, zoals op Strava: één klik, geen goedkeuring. "Vrienden" in de app = wie je volgt.
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Je ziet alleen volg-relaties waar je zelf in zit.
create policy "follows_select_own" on public.follows
  for select to authenticated using ((select auth.uid()) in (follower_id, followee_id));

-- Volgen kan alleen spelers die zichtbaar zijn (de profiles-RLS toont enkel die).
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (
    (select auth.uid()) = follower_id
    and exists (select 1 from public.profiles p where p.id = followee_id and p.show_on_leaderboard)
  );

create policy "follows_delete_own" on public.follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- Wie volg ik en wie volgt mij, met namen. Alleen zichtbare spelers.
create or replace function public.my_follows()
returns table (user_id uuid, display_name text, i_follow boolean, follows_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name,
         bool_or(f.follower_id = (select auth.uid())),
         bool_or(f.followee_id = (select auth.uid()))
  from public.follows f
  join public.profiles p
    on p.id = case when f.follower_id = (select auth.uid()) then f.followee_id else f.follower_id end
  where (select auth.uid()) in (f.follower_id, f.followee_id)
    and p.show_on_leaderboard
  group by p.id, p.display_name
  order by p.display_name;
$$;

revoke execute on function public.my_follows() from public, anon;
grant execute on function public.my_follows() to authenticated;

-- Feed opnieuw, met een filter op gevolgde spelers (plus jezelf).
drop function if exists public.social_feed(integer, integer);

create or replace function public.social_feed(p_limit integer default 20, p_offset integer default 0, p_following boolean default false)
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

revoke execute on function public.social_feed(integer, integer, boolean) from public, anon;
grant execute on function public.social_feed(integer, integer, boolean) to authenticated;
