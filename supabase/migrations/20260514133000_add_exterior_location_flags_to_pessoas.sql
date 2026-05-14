alter table public.pessoas
  add column if not exists local_nascimento_exterior boolean not null default false,
  add column if not exists local_falecimento_exterior boolean not null default false;
