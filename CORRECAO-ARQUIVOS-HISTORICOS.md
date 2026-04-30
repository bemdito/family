# Correção: Erro arquivos_historicos

## Problema

```
Error: Could not find the 'arquivos_historicos' column of 'pessoas' in the schema cache
```

## Causa

O campo `arquivos_historicos` estava sendo enviado como parte do objeto `Pessoa` ao fazer INSERT/UPDATE no banco de dados, mas na realidade `arquivos_historicos` é uma **tabela separada**, não uma coluna da tabela `pessoas`.

## Schema do Banco de Dados

```sql
-- Tabela pessoas (NÃO tem coluna arquivos_historicos)
CREATE TABLE pessoas (
  id UUID PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  data_nascimento VARCHAR(50),
  local_nascimento VARCHAR(255),
  -- ... outros campos ...
  -- NOTA: arquivos_historicos NÃO é uma coluna aqui
);

-- Tabela arquivos_historicos (tabela separada com foreign key)
CREATE TABLE arquivos_historicos (
  id UUID PRIMARY KEY,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id),
  url TEXT NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  ano VARCHAR(10),
  tipo VARCHAR(50),
  ordem INT,
  -- ...
);
```

## Solução Implementada

No arquivo `/src/app/pages/admin/AdminPessoaForm.tsx`, modificamos o `handleSubmit` para remover `arquivos_historicos` do payload antes de enviar para o banco:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ...
  
  // 🔧 CORREÇÃO: Remover arquivos_historicos do payload
  const { arquivos_historicos, ...pessoaDadosSemArquivos } = formData;
  
  const pessoaData = {
    ...pessoaDadosSemArquivos,
    data_nascimento: formData.data_nascimento || undefined,
    data_falecimento: formData.data_falecimento || undefined,
  };

  // Agora pessoaData NÃO contém arquivos_historicos
  if (isEdit && id) {
    pessoaCriada = await atualizarPessoa(id, pessoaData);
  } else {
    pessoaCriada = await adicionarPessoa(pessoaData);
  }
  
  // ...
};
```

## Por que mantemos no formData?

O campo `arquivos_historicos` ainda existe no `formData` local porque:
1. O componente `<ArquivosHistoricos>` usa esse campo para renderizar a UI
2. No modo de edição, carregamos os arquivos da API e mostramos na interface
3. Apenas **removemos do payload** na hora de salvar

## Status

✅ **CORRIGIDO** - O formulário agora cria pessoas corretamente sem enviar o campo `arquivos_historicos` para o banco.

## Próximos Passos (se necessário)

Para implementar gerenciamento completo de arquivos históricos:
1. Criar API endpoints no servidor para CRUD de `arquivos_historicos`
2. Ao salvar pessoa, fazer requisições separadas para inserir/atualizar arquivos
3. Implementar upload de arquivos para Supabase Storage
