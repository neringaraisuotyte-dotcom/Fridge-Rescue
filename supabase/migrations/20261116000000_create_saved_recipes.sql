create table if not exists public.saved_recipes (
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_id text not null,
  meal_name text not null,
  meal_thumb text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, meal_id)
);

alter table public.saved_recipes enable row level security;

grant select, insert, delete on public.saved_recipes to authenticated;

create policy "Users can view their own saved recipes"
  on public.saved_recipes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save recipes for themselves"
  on public.saved_recipes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own saved recipes"
  on public.saved_recipes for delete
  to authenticated
  using ((select auth.uid()) = user_id);
