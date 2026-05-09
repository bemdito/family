-- =====================================================
-- VERSION PESSOA SOCIAL PROFILES
-- Data: 2026-05-09
-- Objetivo: versionar tabela remota existente sem apagar dados nem integrar o frontend ainda.
-- =====================================================

create table if not exists public.pessoa_social_profiles (
  id uuid primary key default uuid_generate_v4(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  rede text not null,
  perfil text,
  url text,
  exibir_no_perfil boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pessoa_social_profiles
  add column if not exists id uuid default uuid_generate_v4(),
  add column if not exists pessoa_id uuid,
  add column if not exists rede text,
  add column if not exists perfil text,
  add column if not exists url text,
  add column if not exists exibir_no_perfil boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.pessoa_social_profiles
set exibir_no_perfil = true
where exibir_no_perfil is null;

alter table public.pessoa_social_profiles
  alter column id set default uuid_generate_v4(),
  alter column exibir_no_perfil set default true,
  alter column exibir_no_perfil set not null,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pessoa_social_profiles_pessoa_id_fkey'
      and conrelid = 'public.pessoa_social_profiles'::regclass
  ) then
    alter table public.pessoa_social_profiles
      add constraint pessoa_social_profiles_pessoa_id_fkey
      foreign key (pessoa_id) references public.pessoas(id) on delete cascade not valid;
  end if;
end $$;

create index if not exists idx_pessoa_social_profiles_pessoa_id
  on public.pessoa_social_profiles (pessoa_id);

create index if not exists idx_pessoa_social_profiles_rede
  on public.pessoa_social_profiles (rede);

create index if not exists idx_pessoa_social_profiles_exibiveis
  on public.pessoa_social_profiles (pessoa_id, exibir_no_perfil);

drop trigger if exists update_pessoa_social_profiles_updated_at on public.pessoa_social_profiles;

create trigger update_pessoa_social_profiles_updated_at
before update on public.pessoa_social_profiles
for each row
execute function public.update_updated_at_column();

alter table public.pessoa_social_profiles enable row level security;

drop policy if exists "authenticated users can read visible pessoa social profiles" on public.pessoa_social_profiles;
create policy "authenticated users can read visible pessoa social profiles"
on public.pessoa_social_profiles
for select
to authenticated
using (exibir_no_perfil = true);

drop policy if exists "linked users can read own pessoa social profiles" on public.pessoa_social_profiles;
create policy "linked users can read own pessoa social profiles"
on public.pessoa_social_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoa_social_profiles.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "admins can read pessoa social profiles" on public.pessoa_social_profiles;
create policy "admins can read pessoa social profiles"
on public.pessoa_social_profiles
for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "admins can insert pessoa social profiles" on public.pessoa_social_profiles;
create policy "admins can insert pessoa social profiles"
on public.pessoa_social_profiles
for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can update pessoa social profiles" on public.pessoa_social_profiles;
create policy "admins can update pessoa social profiles"
on public.pessoa_social_profiles
for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "admins can delete pessoa social profiles" on public.pessoa_social_profiles;
create policy "admins can delete pessoa social profiles"
on public.pessoa_social_profiles
for delete
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "linked users can insert own pessoa social profiles" on public.pessoa_social_profiles;
create policy "linked users can insert own pessoa social profiles"
on public.pessoa_social_profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoa_social_profiles.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can update own pessoa social profiles" on public.pessoa_social_profiles;
create policy "linked users can update own pessoa social profiles"
on public.pessoa_social_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoa_social_profiles.pessoa_id
      and upl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoa_social_profiles.pessoa_id
      and upl.user_id = auth.uid()
  )
);

drop policy if exists "linked users can delete own pessoa social profiles" on public.pessoa_social_profiles;
create policy "linked users can delete own pessoa social profiles"
on public.pessoa_social_profiles
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = pessoa_social_profiles.pessoa_id
      and upl.user_id = auth.uid()
  )
);
