# 🌳 Guia de Migração para Banco de Dados Supabase

## 📋 Visão Geral

Este guia explica como migrar os dados da árvore genealógica do armazenamento em memória para o banco de dados PostgreSQL do Supabase.

## 🏗️ Arquitetura do Banco de Dados

### Tabelas Criadas:

1. **`pessoas`** - Armazena informações sobre membros da família e pets
   - Campos: id, nome_completo, data_nascimento, local_nascimento, foto_principal_url, etc.
   - Chave primária: UUID gerado automaticamente

2. **`relacionamentos`** - Define as conexões entre pessoas
   - Campos: id, pessoa_origem_id, pessoa_destino_id, tipo_relacionamento, subtipo_relacionamento
   - Chaves estrangeiras: pessoa_origem_id → pessoas.id, pessoa_destino_id → pessoas.id
   - Tipos: pai, mae, filho, conjuge, irmao

3. **`arquivos_historicos`** - Fotos e documentos históricos
   - Campos: id, pessoa_id, url, titulo, descricao, ano, tipo
   - Chave estrangeira: pessoa_id → pessoas.id

### Relacionamentos entre Tabelas:

```
pessoas (1) ─── (N) relacionamentos
pessoas (1) ─── (N) arquivos_historicos
```

## 📝 Passo a Passo da Migração

### 1️⃣ Executar o Schema SQL

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Abra o arquivo `/database-schema.sql` deste projeto
5. **Copie todo o conteúdo** e cole no SQL Editor
6. Clique em **Run** para executar

**O que esse script faz:**
- ✅ Cria as 3 tabelas com todos os campos e tipos corretos
- ✅ Define chaves primárias e estrangeiras
- ✅ Cria índices para otimização de queries
- ✅ Configura triggers para atualizar `updated_at` automaticamente
- ✅ Habilita RLS (Row Level Security) com políticas de acesso
- ✅ Cria views úteis para estatísticas

### 2️⃣ Executar a Migração dos Dados

**Opção A: Via Interface Admin (Recomendado)**

1. Faça login no painel administrativo: `/admin/login`
   - Senha padrão: `admin123`
2. No dashboard, clique em **"Migrar para Banco"**
3. Leia atentamente o aviso (irá apagar dados existentes!)
4. Clique em **"Executar Migração"**
5. Aguarde a conclusão (pode levar alguns segundos)
6. Verifique os stats: deve mostrar 62 pessoas criadas

**Opção B: Via API**

```bash
curl -X POST \
  https://{PROJECT_ID}.supabase.co/functions/v1/make-server-055bf375/migrar-dados \
  -H "Authorization: Bearer {ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"seed": [...dados do seed...]}'
```

### 3️⃣ Verificar a Migração

**No Supabase Dashboard:**

1. Vá em **Table Editor**
2. Verifique a tabela `pessoas`:
   - Deve ter 62 registros
   - Todos com UUIDs gerados automaticamente
3. Verifique a tabela `relacionamentos`:
   - Deve ter centenas de registros (filiação, conjugal, irmãos)
4. Confirme que os relacionamentos estão corretos

**Na Aplicação:**

1. Acesse a home `/` para ver a árvore genealógica
2. Navegue entre as pessoas
3. Teste a busca
4. Verifique se as fotos e dados aparecem corretamente
5. Acesse `/pessoa/{id}` de algum membro para ver detalhes

## 🔧 Endpoints da API

O servidor Hono expõe os seguintes endpoints:

### Pessoas

- `GET /make-server-055bf375/pessoas` - Listar todas
- `GET /make-server-055bf375/pessoas/:id` - Obter por ID
- `POST /make-server-055bf375/pessoas` - Criar nova
- `PUT /make-server-055bf375/pessoas/:id` - Atualizar
- `DELETE /make-server-055bf375/pessoas/:id` - Deletar

### Relacionamentos

- `GET /make-server-055bf375/relacionamentos` - Listar todos
- `GET /make-server-055bf375/pessoas/:id/relacionamentos` - Por pessoa
- `POST /make-server-055bf375/relacionamentos` - Criar novo
- `PUT /make-server-055bf375/relacionamentos/:id` - Atualizar
- `DELETE /make-server-055bf375/relacionamentos/:id` - Deletar

### Arquivos Históricos

- `GET /make-server-055bf375/pessoas/:id/arquivos` - Listar de uma pessoa
- `POST /make-server-055bf375/arquivos` - Criar novo
- `PUT /make-server-055bf375/arquivos/:id` - Atualizar
- `DELETE /make-server-055bf375/arquivos/:id` - Deletar

### Migração

- `POST /make-server-055bf375/migrar-dados` - Executar migração inicial

## 🎯 O Que Foi Implementado

✅ **Schema Relacional Completo**
- 3 tabelas normalizadas
- Chaves primárias e estrangeiras
- Índices para performance
- Triggers automáticos

✅ **API RESTful Completa**
- CRUD para todas as entidades
- Endpoints específicos para relacionamentos
- Tratamento de erros
- CORS habilitado

✅ **Detecção Automática de Irmãos**
- Algoritmo que identifica irmãos pelos pais
- Criação automática de relacionamentos
- Evita duplicatas

✅ **Integração Frontend**
- dataService atualizado para usar API
- Carregamento assíncrono de dados
- Interface de migração no admin

✅ **Segurança**
- RLS habilitado
- Service role para operações de escrita
- Anon key para leitura pública

## ⚠️ Avisos Importantes

1. **Backup**: A migração apaga todos os dados existentes. Sempre faça backup antes!

2. **UUID vs String**: Os IDs agora são UUIDs gerados pelo Supabase. O frontend foi atualizado para lidar com isso.

3. **Async/Await**: Todas as operações de dados agora são assíncronas. Certifique-se de usar `await` nas chamadas.

4. **Performance**: Para grandes volumes de dados, considere implementar paginação e cache.

5. **RLS em Produção**: As políticas atuais permitem acesso público para leitura. Em produção, implemente autenticação e restrinja adequadamente.

## 🚀 Próximos Passos (Opcional)

1. **Implementar Paginação**: Para listas grandes de pessoas
2. **Adicionar Cache**: Redis ou similar para performance
3. **Upload de Fotos**: Integrar com Supabase Storage para uploads reais
4. **Autenticação**: Implementar login com Supabase Auth
5. **Logs de Auditoria**: Rastrear quem fez o quê e quando
6. **Backup Automático**: Schedule para backups regulares
7. **Search Otimizado**: Implementar full-text search no Postgres

## 🐛 Troubleshooting

### Erro: "relation pessoas does not exist"
**Solução**: Execute o `database-schema.sql` primeiro no SQL Editor

### Erro: "CORS policy blocked"
**Solução**: Verifique se o servidor Hono está rodando e o CORS está habilitado

### Erro: "Authentication required"
**Solução**: Verifique se está usando `publicAnonKey` nos headers

### Dados não aparecem
**Solução**: 
1. Verifique no Supabase Table Editor se os dados foram criados
2. Abra o Console do navegador e veja os erros
3. Confirme que a migração foi executada com sucesso

## 📚 Documentação Adicional

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Hono Framework](https://hono.dev/)
- [React Router](https://reactrouter.com/)

---

**Criado por**: Sistema de Árvore Genealógica
**Data**: 2026-04-05
