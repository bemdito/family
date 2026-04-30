# Relatório de Correções - Árvore Genealógica

## Data: 05/04/2026

---

## ✅ Correções Implementadas

### 1. **Glauce Thaís - Filhos Exibidos Incorretamente**

**Problema:** Glauce Thaís aparecia com filhos na página de visualização e na página de edição, mesmo não tendo filhos reais.

**Causa Raiz:** A lógica em `/src/app/services/dataService.ts` (função `obterRelacionamentosDaPessoa`) estava **invertida**. O código buscava relacionamentos onde a pessoa era **DESTINO** de um tipo 'filho', quando deveria buscar onde ela é **ORIGEM**.

Código Antigo (INCORRETO):
```typescript
if (rel.pessoa_destino_id === pessoaId && rel.tipo_relacionamento === 'filho') {
  const origem = pessoasMap.get(rel.pessoa_origem_id);
  if (origem) filhos.push(origem); // ❌ ERRADO: Adiciona os PAIS como filhos!
}
```

Código Novo (CORRETO):
```typescript
if (rel.pessoa_origem_id === pessoaId) {
  const destino = pessoasMap.get(rel.pessoa_destino_id);
  if (destino) {
    if (rel.tipo_relacionamento === 'filho') filhos.push(destino); // ✅ CORRETO
  }
}
```

**Impacto:** 
- ✅ Corrige exibição de filhos em TODAS as pessoas
- ✅ Página de perfil agora mostra filhos corretos
- ✅ Página de edição de relacionamentos agora mostra filhos corretos

---

### 2. **Maria Acileide - Linhas de Irmãos Duplicadas**

**Problema:** Maria Acileide tinha múltiplas linhas pontilhadas amarelas conectando aos irmãos (2 para esquerda e 2 para direita), quando deveria ter apenas UMA linha para o irmão imediatamente mais velho (esquerda) e UMA para o irmão imediatamente mais novo (direita).

**Causa Raiz:** A lógica de criação de edges de irmãos em `/src/app/components/FamilyTree/FamilyTree.tsx` não verificava se o mesmo grupo de irmãos já havia sido processado, resultando em duplicação.

**Correção Implementada:**
```typescript
// Agrupar irmãos por pais comuns para evitar duplicação
const processedSiblingGroups = new Set<string>();

childrenByMarriage.forEach((childrenIds, marriageNodeId) => {
  if (childrenIds.length < 2) return;
  
  // Criar ID único para o grupo de irmãos (ordenado)
  const groupId = [...childrenIds].sort().join('::');
  if (processedSiblingGroups.has(groupId)) return; // ✅ Previne duplicação
  processedSiblingGroups.add(groupId);
  
  // Restante da lógica...
});
```

**Impacto:**
- ✅ Cada grupo de irmãos é processado apenas UMA vez
- ✅ Linhas em cadeia seguem a ordem de nascimento (mais velho → mais novo)
- ✅ Visual limpo e correto na árvore genealógica

---

### 3. **Tulius - Linha Verde Conjugal e Linha de Filiação Ausentes**

**Status:** ⏳ **Requer Análise de Dados**

**Possíveis Causas:**
1. **Relacionamento conjugal não bidirecional** - Tulius pode ter apenas um lado do relacionamento com o cônjuge cadastrado
2. **Pais sem relacionamento conjugal** - Se os pais de Tulius não têm relacionamento conjugal entre eles, o marriage node não é criado e a linha de filiação não aparece

**Ferramenta de Diagnóstico Criada:**
Arquivo `/diagnostico-tulius.sql` foi criado para executar no Supabase SQL Editor.

**Instruções de Uso:**
1. Acesse o Supabase SQL Editor
2. Execute o script `/diagnostico-tulius.sql`
3. Analise os resultados de cada seção:
   - **Seção 2**: Verifica se relacionamento conjugal de Tulius é bidirecional
   - **Seção 4**: Verifica se os pais de Tulius têm relacionamento conjugal entre eles
   - **Seção 5**: Verifica se Tulius tem filhos (necessário para marriage node)

**Possíveis Soluções:**
- Se faltar relacionamento bidirecional: Adicionar o relacionamento reverso no painel admin
- Se pais não têm relacionamento conjugal: Adicionar relacionamento entre os pais no painel admin

---

## 📋 Resumo de Impacto

| Problema | Status | Arquivos Modificados | Impacto |
|----------|--------|---------------------|---------|
| Glauce Thaís - Filhos Incorretos | ✅ Corrigido | `dataService.ts` | Crítico - Afetava todas as pessoas |
| Maria Acileide - Linhas Duplicadas | ✅ Corrigido | `FamilyTree.tsx` | Médio - Visual confuso na árvore |
| Tulius - Linhas Ausentes | ⏳ Análise Pendente | N/A | Médio - Depende dos dados no banco |

---

## 🎯 Próximos Passos

1. **Executar diagnóstico do Tulius:**
   ```sql
   -- Executar no Supabase SQL Editor
   -- Ver arquivo: /diagnostico-tulius.sql
   ```

2. **Verificar outros casos similares:**
   - Executar `/diagnostico-rapido.sql` para verificar integridade de todos os relacionamentos
   - Identificar outros casos de relacionamentos unidirecionais

3. **Testes recomendados:**
   - ✅ Verificar Glauce Thaís não mostra mais filhos
   - ✅ Verificar Maria Acileide tem apenas 2 linhas de irmãos (1 esquerda + 1 direita)
   - ⏳ Após corrigir dados do Tulius, verificar linhas aparecem corretamente

---

## 📝 Notas Técnicas

### Lógica de Relacionamentos (Relembrando)

Em nosso sistema, os relacionamentos são **bidirecionais** no banco de dados:

**Exemplo - Pai e Filho:**
```
João (Pai) --[tipo: 'filho']--> Maria (Filha)
Maria (Filha) --[tipo: 'pai']--> João (Pai)
```

**Exemplo - Cônjuges:**
```
João --[tipo: 'conjuge']--> Maria
Maria --[tipo: 'conjuge']--> João
```

### Como a Árvore Processa Irmãos

1. **Agrupa** filhos por marriage node (casal de pais)
2. **Ordena** por data de nascimento (mais velho primeiro)
3. **Conecta em cadeia**: Irmão[i] → Irmão[i+1]
4. **Resultado**: Maria Acilda (1949) → Maria Acileide (1952) → Mário Assis (1963)

### Marriage Nodes

- **COM filhos**: Cria marriage node 💑 no centro do casal
  - Linha verde: Pai ↔ 💑 ↔ Mãe
  - Linha de filiação: 💑 → Filho
  
- **SEM filhos**: Linha verde direta
  - Linha verde: Pessoa1 ↔ 💑 ↔ Pessoa2 (emoji na linha)

---

## 🔍 Arquivos de Diagnóstico Disponíveis

1. `/diagnostico-tulius.sql` - Diagnóstico específico do Tulius
2. `/diagnostico-rapido.sql` - Verificação geral de irmãos
3. `/verificar-irmaos.sql` - Verificação detalhada de irmãos

---

## ✨ Melhorias de Código

- Lógica de busca de filhos agora é **consistente** com pai/mãe
- Sistema de **deduplicação** para grupos de irmãos
- Código mais **robusto** e **manutenível**
- Comentários explicativos adicionados

---

**Desenvolvedor:** Sistema de Árvore Genealógica  
**Versão:** 1.0  
**Data:** 05 de Abril de 2026
