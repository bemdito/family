create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_favorites
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists label text,
  add column if not exists description text,
  add column if not exists href text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_favorites'
      and column_name = 'tipo_conteudo'
  ) then
    execute $sql$
      update public.user_favorites
      set entity_type = coalesce(
        entity_type,
        case tipo_conteudo
          when 'pessoa' then 'person'
          when 'arquivo' then 'historical_file'
          when 'topico' then 'forum_topic'
          when 'evento' then 'family_event'
          when 'pagina' then 'page'
          when 'historia' then 'story'
          else 'page'
        end
      )
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_favorites'
      and column_name = 'conteudo_id'
  ) then
    execute $sql$
      update public.user_favorites
      set entity_id = coalesce(entity_id, conteudo_id::text)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_favorites'
      and column_name = 'titulo'
  ) then
    execute $sql$
      update public.user_favorites
      set label = coalesce(label, titulo)
    $sql$;
  end if;
end $$;

update public.user_favorites
set
  entity_type = coalesce(entity_type, 'page'),
  entity_id = coalesce(entity_id, id::text),
  label = coalesce(label, 'Favorito'),
  metadata = coalesce(metadata, '{}'::jsonb);

alter table public.user_favorites
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column label set not null,
  alter column metadata set not null;

alter table public.user_favorites
  drop constraint if exists user_favorites_entity_type_check;

alter table public.user_favorites
  add constraint user_favorites_entity_type_check
  check (
    entity_type in (
      'person',
      'historical_file',
      'relationship',
      'forum_topic',
      'family_event',
      'person_event',
      'page',
      'timeline_item',
      'story'
    )
  );

create index if not exists idx_user_favorites_user_id_created_at_desc
  on public.user_favorites (user_id, created_at desc);

create index if not exists idx_user_favorites_entity
  on public.user_favorites (entity_type, entity_id);

create unique index if not exists user_favorites_user_entity_unique
  on public.user_favorites (user_id, entity_type, entity_id);

drop trigger if exists update_user_favorites_updated_at on public.user_favorites;

create trigger update_user_favorites_updated_at
before update on public.user_favorites
for each row
execute function public.update_updated_at_column();

alter table public.user_favorites enable row level security;

drop policy if exists "users can manage own favorites" on public.user_favorites;
drop policy if exists "users can read own favorites" on public.user_favorites;
drop policy if exists "users can insert own favorites" on public.user_favorites;
drop policy if exists "users can update own favorites" on public.user_favorites;
drop policy if exists "users can delete own favorites" on public.user_favorites;

create policy "users can read own favorites"
on public.user_favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own favorites"
on public.user_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own favorites"
on public.user_favorites
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own favorites"
on public.user_favorites
for delete
to authenticated
using (auth.uid() = user_id);