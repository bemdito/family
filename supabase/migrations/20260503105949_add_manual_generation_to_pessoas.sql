alter table public.pessoas
add column if not exists manual_generation smallint;

alter table public.pessoas
drop constraint if exists pessoas_manual_generation_check;

alter table public.pessoas
add constraint pessoas_manual_generation_check
check (
  manual_generation is null
  or manual_generation between 1 and 7
);

comment on column public.pessoas.manual_generation is
'Geração manual da pessoa na árvore genealógica. Valores permitidos: 1 a 7. Quando null, o sistema usa a geração calculada automaticamente.';

create index if not exists idx_pessoas_manual_generation
on public.pessoas (manual_generation);
