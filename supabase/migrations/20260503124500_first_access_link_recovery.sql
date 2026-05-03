create or replace function public.ensure_first_access_person_link(target_pessoa_id uuid)
returns public.user_person_links
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_user_link public.user_person_links;
  existing_person_link public.user_person_links;
  created_link public.user_person_links;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into existing_user_link
  from public.user_person_links
  where user_id = current_user_id
  order by principal desc, created_at asc
  limit 1;

  if found then
    return existing_user_link;
  end if;

  if not exists (
    select 1
    from public.pessoas
    where id = target_pessoa_id
  ) then
    raise exception 'person_not_found';
  end if;

  select *
  into existing_person_link
  from public.user_person_links
  where pessoa_id = target_pessoa_id
    and user_id <> current_user_id
  limit 1;

  if found then
    raise exception 'person_already_linked';
  end if;

  insert into public.user_person_links (
    user_id,
    pessoa_id,
    relacao_com_perfil,
    principal,
    dados_confirmados
  )
  values (
    current_user_id,
    target_pessoa_id,
    'Sou esta pessoa',
    true,
    false
  )
  on conflict (user_id, pessoa_id) do update
  set principal = true
  returning * into created_link;

  return created_link;
end;
$$;

grant execute on function public.ensure_first_access_person_link(uuid) to authenticated;

create or replace function public.create_first_access_link_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_pessoa_id uuid;
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  metadata_pessoa_id := nullif(new.raw_user_meta_data->>'pessoa_id', '')::uuid;

  if metadata_pessoa_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.pessoas
    where id = metadata_pessoa_id
  ) then
    return new;
  end if;

  if exists (
    select 1
    from public.user_person_links
    where pessoa_id = metadata_pessoa_id
      and user_id <> new.id
  ) then
    return new;
  end if;

  insert into public.user_person_links (
    user_id,
    pessoa_id,
    relacao_com_perfil,
    principal,
    dados_confirmados
  )
  values (
    new.id,
    metadata_pessoa_id,
    'Sou esta pessoa',
    true,
    false
  )
  on conflict (user_id, pessoa_id) do nothing;

  return new;
exception
  when invalid_text_representation then
    return new;
end;
$$;

drop trigger if exists create_first_access_link_after_auth_confirmation on auth.users;

create trigger create_first_access_link_after_auth_confirmation
after insert or update of email_confirmed_at on auth.users
for each row
execute function public.create_first_access_link_from_auth_user();

insert into public.user_person_links (
  user_id,
  pessoa_id,
  relacao_com_perfil,
  principal,
  dados_confirmados
)
select
  au.id,
  (au.raw_user_meta_data->>'pessoa_id')::uuid,
  'Sou esta pessoa',
  true,
  false
from auth.users au
where au.email_confirmed_at is not null
  and au.raw_user_meta_data ? 'pessoa_id'
  and (au.raw_user_meta_data->>'pessoa_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.pessoas p
    where p.id = (au.raw_user_meta_data->>'pessoa_id')::uuid
  )
  and not exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = au.id
  )
  and not exists (
    select 1
    from public.user_person_links upl
    where upl.pessoa_id = (au.raw_user_meta_data->>'pessoa_id')::uuid
      and upl.user_id <> au.id
  )
on conflict (user_id, pessoa_id) do nothing;
