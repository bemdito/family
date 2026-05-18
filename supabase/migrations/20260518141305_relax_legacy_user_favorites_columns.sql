alter table public.user_favorites
  alter column tipo_conteudo drop not null,
  alter column conteudo_id drop not null;

alter table public.user_favorites
  drop constraint if exists user_favorites_user_id_tipo_conteudo_conteudo_id_key;

drop index if exists public.idx_user_favorites_tipo;