alter table public.user_progress
  add column if not exists stars_by_level jsonb not null default '{}'::jsonb,
  add column if not exists total_stars_earned integer not null default 0,
  add column if not exists total_stars_spent integer not null default 0;

update public.user_progress
set
  stars_by_level = coalesce(stars_by_level, '{}'::jsonb),
  total_stars_earned = coalesce(total_stars_earned, 0),
  total_stars_spent = coalesce(total_stars_spent, 0);
