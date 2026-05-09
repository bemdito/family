# Addendum técnico — Comparação dump remoto x migrations

**Arquivo sugerido:** `docs/ADDENDUM-COMPARACAO-DUMP-REMOTO-MIGRATIONS-2026-05-09.md`  
**Relacionado a:** `docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md`  
**Data:** 2026-05-09  
**Escopo:** comparação somente leitura entre o dump remoto `supabase/dumps/supabase_schema_remote_20260509043321.sql` e as migrations em `supabase/migrations`.

---

## 1. Resumo executivo

A comparação entre o banco remoto e as migrations mostrou que o projeto está bem mais alinhado do que no início da auditoria, principalmente nas áreas de:

- fórum;
- Google Calendar;
- first access;
- RLS novo;
- admin via `profiles.role`;
- arquivos históricos em tabela relacional.

Ainda assim, existem divergências relevantes no **core familiar**, especialmente em:

- policies legadas de `relacionamentos`;
- divergência de colunas e constraints em `relacionamentos`;
- coluna legada `pessoas.arquivos_historicos`;
- tabela remota `pessoa_social_profiles` sem migration;
- tabela `imagens_pessoa` versionada, mas ausente no remoto;
- view `pessoas_com_estatisticas` existente só no remoto.

Essas diferenças indicam que o banco remoto ainda carrega partes de schemas antigos e precisa de uma próxima rodada de migrations corretivas, preferencialmente após backup e validação em ambiente seguro.

---

## 2. Matriz remoto x migrations

| Objeto | Remoto | Migrations | Status |
|---|---:|---:|---|
| Tabelas principais | 20 | 20 | Divergem por composição |
| `pessoa_social_profiles` | Sim | Não | Remoto-only |
| `imagens_pessoa` | Não | Sim | Migrations-only |
| `pessoas.arquivos_historicos` | Sim | Usada só para migração | Legado ainda presente |
| `pessoas.complemento` | Sim | Não | Remoto-only |
| `relacionamentos` com colunas extras versionadas | Não | Sim | Remoto atrasado |
| Fórum tabelas/funções/policies | Sim | Sim | Alinhado em geral |
| Google Calendar tabelas/view/RLS | Sim | Sim | Alinhado em geral |
| `pessoas_com_estatisticas` | Sim | Não | Remoto-only |
| Trigger `auth.users` first access | Não visível no dump public | Sim | Não conclusivo pelo dump |
| Policies legadas em `relacionamentos` | Sim | Não removidas | Crítico |
| Índices equivalentes com nomes diferentes | Sim | Sim | Aceitável/normalizável |

---

## 3. Divergências críticas

### 3.1 Coluna legada `pessoas.arquivos_historicos`

A coluna `public.pessoas.arquivos_historicos` ainda existe no remoto.

Status atual:

- os dados legados foram migrados para `public.arquivos_historicos`;
- a coluna antiga não foi removida;
- o frontend já foi ajustado para usar a tabela relacional;
- a coluna legada ainda deve ser mantida até validação final.

Risco:

- manutenção de dois modelos de dados para o mesmo conceito;
- confusão em futuras manutenções;
- possibilidade de algum código legado voltar a gravar no JSONB.

Recomendação:

1. Validar que todos os arquivos históricos aparecem no perfil.
2. Confirmar que o frontend não lê nem grava mais `pessoas.arquivos_historicos`.
3. Criar migration futura para remover a coluna antiga.

---

### 3.2 Policies legadas permissivas em `relacionamentos`

O remoto ainda contém policies antigas permissivas em `public.relacionamentos`:

- `Permitir leitura pública de relacionamentos`;
- `Permitir inserção de relacionamentos via service role`;
- `Permitir atualização de relacionamentos via service role`;
- `Permitir deleção de relacionamentos via service role`.

Essas policies usam `USING (true)` ou `WITH CHECK (true)` e podem anular a intenção das policies novas.

Risco:

- usuário não admin pode ter acesso indevido;
- RLS fica semanticamente habilitado, mas permissivo demais;
- segurança passa a depender de UI, o que não é aceitável.

Recomendação:

Criar migration corretiva para remover essas policies:

```sql
drop policy if exists "Permitir leitura pública de relacionamentos" on public.relacionamentos;
drop policy if exists "Permitir inserção de relacionamentos via service role" on public.relacionamentos;
drop policy if exists "Permitir atualização de relacionamentos via service role" on public.relacionamentos;
drop policy if exists "Permitir deleção de relacionamentos via service role" on public.relacionamentos;
```

Depois validar:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'relacionamentos'
order by policyname;
```

---

### 3.3 Divergência estrutural em `relacionamentos`

O remoto não possui colunas que já aparecem versionadas nas migrations:

- `ativo`;
- `data_casamento`;
- `data_separacao`;
- `local_casamento`;
- `local_separacao`;
- `observacoes`.

Também há divergência no check de `subtipo_relacionamento`:

- remoto aceita `uniao_estavel`;
- migration aceita `uniao` e `separado`.

A unicidade também diverge:

- remoto: unique por `pessoa_origem_id`, `pessoa_destino_id`, `tipo_relacionamento`;
- migration: unique incluindo `coalesce(subtipo_relacionamento, '')`.

Riscos:

- inserts/updates podem falhar ou se comportar de modo diferente entre local/staging/produção;
- futuras migrations podem quebrar por constraints divergentes;
- a lógica de relacionamentos inversos pode sofrer com duplicidade ou bloqueios inesperados.

Recomendação:

Criar migration corretiva para alinhar `public.relacionamentos` ao contrato desejado.

---

### 3.4 `pessoa_social_profiles` existe só no remoto

A tabela `public.pessoa_social_profiles` existe no remoto, mas não está versionada nas migrations.

Risco:

- objeto não reprodutível em ambiente novo;
- funcionalidade associada pode quebrar em reset/local/staging;
- drift permanente entre produção e versionamento.

Recomendação:

Decidir entre:

1. versionar oficialmente em migration; ou
2. dropar se for legado e não tiver uso.

Antes de decidir, buscar no código:

```bash
grep -R "pessoa_social_profiles" -n src supabase
```

---

### 3.5 `imagens_pessoa` está nas migrations, mas não no remoto

A tabela `public.imagens_pessoa` é criada por migration, mas não aparece no remoto.

Risco:

- migration local e remoto seguem modelos diferentes;
- funcionalidades futuras podem presumir tabela inexistente no remoto.

Recomendação:

Decidir entre:

1. aplicar migration corretiva criando `imagens_pessoa` no remoto; ou
2. remover/aposentar essa tabela do modelo, se foi substituída por `arquivos_historicos` ou Storage.

Antes de decidir, buscar uso no código:

```bash
grep -R "imagens_pessoa" -n src supabase
```

---

### 3.6 `pessoas_com_estatisticas` existe só no remoto

A view `public.pessoas_com_estatisticas` existe no remoto, mas não aparece em migrations.

Risco:

- uso oculto em consultas ou diagnósticos;
- drift entre banco remoto e ambientes recriados.

Recomendação:

Buscar uso:

```bash
grep -R "pessoas_com_estatisticas" -n src supabase
```

Depois decidir entre:

1. versionar a view; ou
2. removê-la se for legado.

---

## 4. Divergências aceitáveis ou não prioritárias

### 4.1 Índices com nomes diferentes

Foram encontrados índices equivalentes com nomes diferentes.

Exemplos:

| Remoto | Migration |
|---|---|
| `idx_pessoas_nome` | `idx_pessoas_nome_completo` |
| `idx_pessoas_tipo` | `idx_pessoas_humano_ou_pet` |
| `idx_rel_origem` | `idx_relacionamentos_origem` |
| `idx_rel_destino` | `idx_relacionamentos_destino` |
| `idx_arquivos_pessoa` | `idx_arquivos_historicos_pessoa_id` |
| `idx_arquivos_ordem` | `idx_arquivos_historicos_ordem` |

Avaliação:

- não é crítico se as colunas indexadas são equivalentes;
- pode ser normalizado futuramente para limpar o dump;
- não deve ser prioridade frente a RLS/constraints.

### 4.2 Diferenças `text` vs `varchar(...)`

Algumas colunas divergem entre `text` e `varchar`.

Avaliação:

- divergência real;
- geralmente não bloqueante;
- só deve ser corrigida se houver validação de domínio ou necessidade de padronização.

### 4.3 Trigger em `auth.users`

O trigger `create_first_access_link_after_auth_confirmation` aparece nas migrations, mas não no dump analisado porque o dump foi limitado ao schema `public`.

Avaliação:

- ausência no dump `public` não prova ausência no remoto;
- validar separadamente com consulta no schema `auth`.

SQL sugerido:

```sql
select
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgname = 'create_first_access_link_after_auth_confirmation';
```

---

## 5. Recomendações de próximas migrations corretivas

### 5.1 Migration para remover policies legadas de `relacionamentos`

Prioridade: alta.

Arquivo sugerido:

```text
supabase/migrations/YYYYMMDDHHMMSS_remove_legacy_relacionamentos_policies.sql
```

Conteúdo esperado:

```sql
drop policy if exists "Permitir leitura pública de relacionamentos" on public.relacionamentos;
drop policy if exists "Permitir inserção de relacionamentos via service role" on public.relacionamentos;
drop policy if exists "Permitir atualização de relacionamentos via service role" on public.relacionamentos;
drop policy if exists "Permitir deleção de relacionamentos via service role" on public.relacionamentos;
```

---

### 5.2 Migration para alinhar `relacionamentos`

Prioridade: alta/média.

A migration deve:

1. adicionar colunas ausentes:
   - `ativo`;
   - `data_casamento`;
   - `data_separacao`;
   - `local_casamento`;
   - `local_separacao`;
   - `observacoes`;

2. ajustar check de `subtipo_relacionamento`;

3. decidir se `uniao_estavel` deve virar `uniao` ou se ambos devem ser aceitos;

4. revisar constraint/índice unique.

Cuidado:

- revisar dados existentes antes de trocar checks;
- evitar quebrar registros com `uniao_estavel`;
- validar duplicidade antes de alterar unique.

SQL diagnóstico sugerido:

```sql
select subtipo_relacionamento, count(*)
from public.relacionamentos
group by subtipo_relacionamento
order by subtipo_relacionamento;
```

Diagnóstico de duplicidade:

```sql
select
  pessoa_origem_id,
  pessoa_destino_id,
  tipo_relacionamento,
  coalesce(subtipo_relacionamento, '') as subtipo,
  count(*)
from public.relacionamentos
group by
  pessoa_origem_id,
  pessoa_destino_id,
  tipo_relacionamento,
  coalesce(subtipo_relacionamento, '')
having count(*) > 1;
```

---

### 5.3 Migration futura para remover `pessoas.arquivos_historicos`

Prioridade: média, após testes.

Pré-condições:

- confirmar que a tabela relacional tem todos os arquivos;
- validar perfil visualmente;
- confirmar que frontend não usa coluna antiga;
- backup gerado.

Migration futura:

```sql
alter table public.pessoas
drop column if exists arquivos_historicos;
```

Não executar antes dos testes.

---

### 5.4 Decidir destino de `pessoa_social_profiles`

Prioridade: média.

Etapas:

1. buscar uso no código;
2. verificar dados existentes;
3. decidir se é funcionalidade real ou legado;
4. versionar ou remover.

SQL diagnóstico:

```sql
select count(*) from public.pessoa_social_profiles;
```

---

### 5.5 Decidir destino de `imagens_pessoa`

Prioridade: média/baixa.

Etapas:

1. buscar uso no código;
2. confirmar se foi substituída por `arquivos_historicos`;
3. criar no remoto ou remover das migrations futuras.

---

### 5.6 Versionar ou remover `pessoas_com_estatisticas`

Prioridade: baixa/média.

Etapas:

1. buscar uso;
2. decidir se a view ainda agrega valor;
3. versionar se for útil;
4. remover se for legado.

---

## 6. Prompt recomendado para Codex — próxima rodada

```text
Comparei o dump remoto com as migrations. Não altere arquivos ainda até confirmar cada ponto.

Achados principais:
- public.pessoas.arquivos_historicos ainda existe no remoto.
- public.relacionamentos ainda tem policies legadas permissivas:
  - Permitir leitura pública de relacionamentos
  - Permitir inserção de relacionamentos via service role
  - Permitir atualização de relacionamentos via service role
  - Permitir deleção de relacionamentos via service role
- public.relacionamentos diverge das migrations em colunas, checks e unicidade.
- public.pessoa_social_profiles existe no remoto, mas não está nas migrations.
- public.imagens_pessoa está nas migrations, mas não existe no remoto.
- public.pessoas_com_estatisticas existe no remoto, mas não está nas migrations.

Objetivo:
Criar um plano de migrations corretivas, sem aplicar no banco remoto.

Tarefas:
1. Criar migration para remover policies legadas de public.relacionamentos.
2. Diagnosticar e propor migration para alinhar public.relacionamentos:
   - colunas ausentes;
   - check de subtipo;
   - unique index/constraint;
   - compatibilidade com dados existentes.
3. Buscar uso no código de:
   - pessoa_social_profiles;
   - imagens_pessoa;
   - pessoas_com_estatisticas.
4. Recomendar se cada objeto deve ser versionado, removido ou mantido como legado.
5. Criar apenas migrations seguras e incrementais.
6. Não remover pessoas.arquivos_historicos ainda; apenas deixar plano para remover depois dos testes.
7. Rodar npm run build.
8. Entregar resumo com arquivos alterados e SQL de validação.

Regras:
- Não executar supabase db push.
- Não apagar dados.
- Não remover coluna antiga de arquivos históricos nesta rodada.
- Não alterar frontend salvo se encontrar uso real divergente.
```

---

## 7. Status final deste addendum

A comparação dump remoto x migrations revelou que as áreas recém-ajustadas estão mais próximas do modelo desejado, mas o core familiar ainda tem drift relevante.

Prioridade imediata:

1. remover policies legadas de `relacionamentos`;
2. alinhar schema de `relacionamentos`;
3. decidir destino de `pessoa_social_profiles`;
4. decidir destino de `imagens_pessoa`;
5. decidir destino de `pessoas_com_estatisticas`;
6. remover `pessoas.arquivos_historicos` somente depois de validação final.
