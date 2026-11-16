alter table public.saved_recipes
  add column if not exists category text,
  add column if not exists note text;

grant update on public.saved_recipes to authenticated;

create policy "Users can update their own saved recipes"
  on public.saved_recipes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
