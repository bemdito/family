alter table public.pessoas
  add column if not exists falecido boolean not null default false;

update public.pessoas
set falecido = true
where falecido = false
  and (
    data_falecimento is not null
    or local_falecimento is not null
  );
