# Addendum técnico — comparação dump remoto x migrations

**Arquivo:** `docs/ADDENDUM-COMPARACAO-DUMP-REMOTO-MIGRATIONS-2026-05-09.md`  
**Documento principal atualizado:** `docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md`  
**Data:** 2026-05-09  
**Status:** addendum mantido como referência histórica. O estado consolidado, decisões finais, pendências e próximos passos estão no registro técnico principal.

---

## 1. Finalidade deste addendum

Este arquivo nasceu como uma comparação entre o dump remoto inicial e as migrations locais. Depois da rodada de correções, diagnósticos e reparo do histórico remoto, a documentação operacional passou a ficar centralizada em:

```text
docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md
```

Manter este addendum evita perda de histórico, mas a referência de manutenção deve ser o registro consolidado.

---

## 2. Achados originais

A comparação inicial identificou drift entre banco remoto e migrations em pontos como:

- policies legadas permissivas em `public.relacionamentos`;
- divergências estruturais em `public.relacionamentos`;
- existência da coluna legada `public.pessoas.arquivos_historicos`;
- tabela remota `public.pessoa_social_profiles` sem migration correspondente;
- tabela `public.imagens_pessoa` presente em migration antiga, mas ausente no remoto;
- view remota `public.pessoas_com_estatisticas` sem migration correspondente;
- histórico de migrations remoto desalinhado em relação aos arquivos locais.

---

## 3. Decisões tomadas após a auditoria

| Objeto / frente | Decisão final da rodada |
|---|---|
| `public.relacionamentos` policies | Criada migration para remover policies legadas permissivas |
| `public.relacionamentos` schema | Criada migration para alinhar colunas, check de subtipo e unique index |
| `public.pessoa_social_profiles` | Criada migration de versionamento com RLS/policies, sem integrar frontend ainda |
| `public.imagens_pessoa` | Não criar agora; sem uso runtime; tratado como legado/migrations-only |
| `public.pessoas_com_estatisticas` | Não versionar agora; view remota legada sem uso runtime |
| `public.pessoas.arquivos_historicos` | Não remover agora; preparar remoção futura somente após validação SQL/admin e testes visuais |
| Histórico de migrations | Corrigido com `supabase migration repair --status applied` |
| `supabase db push` | Não executado; não era necessário após o repair |

---

## 4. Migrations novas relevantes

Foram adicionadas e commitadas:

```text
supabase/migrations/20260509100600_remove_legacy_relacionamentos_policies.sql
supabase/migrations/20260509100700_align_relacionamentos_schema.sql
supabase/migrations/20260509100800_version_pessoa_social_profiles.sql
```

Essas migrations foram posteriormente marcadas como aplicadas no histórico remoto com `supabase migration repair --status applied`, pois o dump e os diagnósticos indicaram que seus efeitos já estavam refletidos no banco remoto.

---

## 5. Backup/dump usado na rodada

Foi gerado um dump manual válido via Docker/Postgres 17:

```text
supabase/dumps/supabase_schema_before_push_20260509062036.sql
```

O arquivo tinha aproximadamente 3.9 MB e terminou com:

```text
-- PostgreSQL database dump complete
```

Dumps continuam ignorados pelo Git e não devem ser commitados.

---

## 6. Estado final

Após o repair, `supabase migration list` mostrou Local e Remote alinhados para todas as migrations locais. O build passou com o aviso conhecido do Vite sobre bundle acima de 500 kB.

Estado operacional final:

- Git limpo e sincronizado com `origin/main`;
- build aprovado;
- dump manual válido gerado;
- migrations Local x Remote alinhadas;
- nenhuma migration pendente para aplicar;
- `supabase db push` não necessário no momento.

---

## 7. Próximos passos

Consultar o documento principal para a lista completa e atualizada:

```text
docs/REGISTRO-TECNICO-IMPLEMENTACOES-2026-05-09.md
```

Pendências principais resumidas:

1. Executar testes manuais funcionais de admin, RLS, relacionamentos, arquivos históricos, fórum e Google Calendar.
2. Confirmar via Supabase SQL Editor se `public.pessoas.arquivos_historicos` está realmente sem dados úteis.
3. Validar visualmente se `total_arquivos_relacionais = 0` é esperado no ambiente remoto.
4. Criar migration futura para remover `public.pessoas.arquivos_historicos` somente após validações e dump recente.
5. Atualizar `MIGRATION-GUIDE.md` com o fluxo correto de dump, repair e validação.
6. Arquivar ou revisar scripts SQL legados.
