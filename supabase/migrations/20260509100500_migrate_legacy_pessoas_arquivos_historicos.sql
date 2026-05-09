-- =====================================================
-- MIGRATE LEGACY pessoas.arquivos_historicos JSONB
-- Data: 2026-05-09
-- Objetivo: copiar dados legados JSONB para public.arquivos_historicos.
-- Observacao: esta migration NAO remove a coluna antiga.
-- =====================================================

do $$
begin
  if to_regclass('public.arquivos_historicos') is not null then
    alter table public.arquivos_historicos
      drop constraint if exists arquivos_historicos_tipo_check;

    alter table public.arquivos_historicos
      alter column tipo set default 'imagem';

    alter table public.arquivos_historicos
      add constraint arquivos_historicos_tipo_check
      check (tipo in ('imagem', 'pdf', 'foto', 'documento', 'video', 'outro'));
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pessoas'
      and column_name = 'arquivos_historicos'
  ) then
    execute $migration$
      with legacy_normalized as (
        select
          p.id as pessoa_id,
          legacy.item,
          legacy.ordinality,
          case
            when legacy.item->>'tipo' in ('imagem', 'pdf') then legacy.item->>'tipo'
            when legacy.item->>'ano' in ('imagem', 'pdf') then legacy.item->>'ano'
            when coalesce(legacy.item->>'tipo', legacy.item->>'url', '') like 'data:application/pdf%' then 'pdf'
            else 'imagem'
          end as normalized_tipo,
          case
            -- Formato legado inconsistente observado no remoto:
            -- tipo=dataURL/base64, url=titulo, titulo=descricao, ano=tipo.
            when coalesce(legacy.item->>'tipo', '') like 'data:%' then legacy.item->>'tipo'
            else legacy.item->>'url'
          end as normalized_url,
          case
            when coalesce(legacy.item->>'tipo', '') like 'data:%' then legacy.item->>'url'
            else legacy.item->>'titulo'
          end as normalized_titulo,
          case
            when coalesce(legacy.item->>'tipo', '') like 'data:%' then legacy.item->>'titulo'
            else legacy.item->>'descricao'
          end as normalized_descricao,
          case
            when legacy.item->>'ano' in ('imagem', 'pdf') then null
            else legacy.item->>'ano'
          end as normalized_ano
        from public.pessoas p
        cross join lateral jsonb_array_elements(p.arquivos_historicos) with ordinality as legacy(item, ordinality)
        where jsonb_typeof(p.arquivos_historicos) = 'array'
          and jsonb_array_length(p.arquivos_historicos) > 0
      )
      insert into public.arquivos_historicos (
        id,
        pessoa_id,
        tipo,
        url,
        titulo,
        descricao,
        ano,
        ordem
      )
      select
        case
          when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            and not exists (
              select 1
              from public.arquivos_historicos existing_id
              where existing_id.id = (item->>'id')::uuid
            )
            then (item->>'id')::uuid
          else gen_random_uuid()
        end as id,
        pessoa_id,
        normalized_tipo,
        normalized_url,
        coalesce(nullif(normalized_titulo, ''), 'Arquivo historico'),
        nullif(normalized_descricao, ''),
        nullif(normalized_ano, ''),
        case
          when coalesce(item->>'ordem', '') ~ '^[0-9]+$' then (item->>'ordem')::integer
          else ordinality - 1
        end as ordem
      from legacy_normalized
      where nullif(normalized_url, '') is not null
        and not exists (
          select 1
          from public.arquivos_historicos existing
          where existing.pessoa_id = legacy_normalized.pessoa_id
            and existing.url = legacy_normalized.normalized_url
            and coalesce(existing.titulo, '') = coalesce(nullif(legacy_normalized.normalized_titulo, ''), 'Arquivo historico')
        );
    $migration$;
  end if;
end $$;
