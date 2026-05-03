alter table public.user_person_links
add column if not exists dados_confirmados boolean not null default false;

alter table public.user_person_links
add column if not exists dados_confirmados_em timestamptz;

create index if not exists idx_user_person_links_user_confirmed
on public.user_person_links (user_id, dados_confirmados);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'users can insert own profile'
  ) then
    create policy "users can insert own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);
  end if;
end $$;

create or replace function public.validate_first_access_code(access_code uuid)
returns table (
  pessoa_id uuid,
  nome_completo text,
  data_nascimento text,
  local_nascimento text,
  already_used boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as pessoa_id,
    p.nome_completo::text,
    p.data_nascimento::text,
    p.local_nascimento::text,
    exists (
      select 1
      from public.user_person_links upl
      where upl.pessoa_id = p.id
    ) as already_used
  from public.pessoas p
  where p.id = access_code
  limit 1;
$$;

grant execute on function public.validate_first_access_code(uuid) to anon, authenticated;

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
