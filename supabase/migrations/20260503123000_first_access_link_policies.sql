do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_person_links'
      and policyname = 'users can create own person link'
  ) then
    create policy "users can create own person link"
    on public.user_person_links
    for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_person_links'
      and policyname = 'users can read own person links'
  ) then
    create policy "users can read own person links"
    on public.user_person_links
    for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_person_links'
      and policyname = 'users can update own person links'
  ) then
    create policy "users can update own person links"
    on public.user_person_links
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pessoas'
      and policyname = 'users can update own linked person'
  ) then
    create policy "users can update own linked person"
    on public.pessoas
    for update
    using (
      exists (
        select 1
        from public.user_person_links upl
        where upl.pessoa_id = pessoas.id
          and upl.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.user_person_links upl
        where upl.pessoa_id = pessoas.id
          and upl.user_id = auth.uid()
      )
    );
  end if;
end $$;
