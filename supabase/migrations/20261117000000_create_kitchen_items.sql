create table if not exists public.kitchen_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists kitchen_items_user_name_idx on public.kitchen_items (user_id, name);
alter table public.kitchen_items enable row level security;
revoke all on public.kitchen_items from anon, authenticated;
grant select, insert, delete on public.kitchen_items to authenticated;

create policy "Users can view their own kitchen items"
  on public.kitchen_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own kitchen items"
  on public.kitchen_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own kitchen items"
  on public.kitchen_items for delete to authenticated
  using ((select auth.uid()) = user_id);
