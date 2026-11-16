create table if not exists public.ai_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_recipe_name text not null check (length(original_recipe_name) between 1 and 500),
  original_recipe_id text,
  user_request text not null default '' check (length(user_request) <= 500),
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  ai_result text not null check (length(ai_result) between 1 and 50000),
  created_at timestamptz not null default now()
);

create index if not exists ai_recipes_user_created_idx on public.ai_recipes (user_id, created_at desc);
alter table public.ai_recipes enable row level security;
revoke all on public.ai_recipes from anon, authenticated;
grant select, insert on public.ai_recipes to authenticated;

create policy "Users can view their own AI recipes"
  on public.ai_recipes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save their own AI recipes"
  on public.ai_recipes for insert to authenticated
  with check ((select auth.uid()) = user_id);
