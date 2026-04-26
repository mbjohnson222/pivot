create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
on public.profiles
for select
using (true);

create policy "users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
