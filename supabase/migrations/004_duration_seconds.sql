-- Voer dit uit in Supabase > SQL Editor (na 003_leaderboard.sql).
-- Duur mag voortaan seconden bevatten: minuten als decimaal getal (45 min 30 s = 45.5).

alter table public.workouts alter column duration_min type numeric(10, 4);
alter table public.planned_workouts alter column duration_min type numeric(10, 4);
