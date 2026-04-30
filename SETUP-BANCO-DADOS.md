# 🗄️ Setup do Banco de Dados no Supabase

## ✅ O que precisa ser criado no Supabase

### 1️⃣ **Tabelas**
- ✅ `pessoas` - Membros da família e pets
- ✅ `relacionamentos` - Conexões entre pessoas (pai, mãe, cônjuge, filho, irmão)
- ✅ `arquivos_historicos` - Fotos e documentos históricos

### 2️⃣ **Função**
- ✅ `update_updated_at_column()` - Atualiza automaticamente o campo `updated_at`

### 3️⃣ **Triggers**
- ✅ `update_pessoas_updated_at` - Atualiza `updated_at` na tabela `pessoas`
- ✅ `update_relacionamentos_updated_at` - Atualiza `updated_at` na tabela `relacionamentos`
- ✅ `update_arquivos_updated_at` - Atualiza `updated_at` na tabela `arquivos_historicos`

### 4️⃣ **Índices**
- ✅ Índices em `pessoas` (nome, tipo, created_at)
- ✅ Índices em `relacionamentos` (origem, destino, tipo)
- ✅ Índices em `arquivos_historicos` (pessoa_id, ordem)

### 5️⃣ **Políticas RLS (Row Level Security)**
- ✅ Leitura pública para todas as tabelas (área pública do site)
- ✅ Escrita permitida via `service_role` (backend)

### 6️⃣ **View (opcional)**
- ✅ `pessoas_com_estatisticas` - Estatísticas agregadas por pessoa

### 7️⃣ **Extensão**
- ✅ `uuid-ossp` - Para gerar UUIDs automaticamente

---

## 📝 Como Executar o Setup

### **Passo 1: Acessar o Supabase SQL Editor**
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**

### **Passo 2: Executar o Schema**
1. Abra o arquivo `database-schema.sql` (na raiz do projeto)
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

### **Passo 3: Verificar Criação**
Após executar, você deve ver:
- ✅ 3 tabelas criadas
- ✅ 1 função criada
- ✅ 3 triggers criados
- ✅ 9 índices criados
- ✅ 12 políticas RLS criadas
- ✅ 1 view criada
- ✅ 1 extensão habilitada

### **Passo 4: Migrar os Dados**
1. Acesse o painel administrativo: `/admin/login`
2. Faça login (senha padrão: `admin123`)
3. Vá em **Migrar para Banco** ou acesse `/admin/migrar-dados`
4. Clique em **Migrar Dados do Seed para o Banco**
5. Aguarde a conclusão (62 pessoas + relacionamentos serão criados)

---

## 🔍 Como Verificar se Está Funcionando

### **Método 1: Via Interface**
1. Acesse `/admin/diagnostico`
2. Verifique as estatísticas:
   - Total de pessoas cadastradas
   - Total de relacionamentos
   - Total de relacionamentos de irmãos
   - Avisos sobre integridade dos dados

### **Método 2: Via Supabase Dashboard**
1. No Supabase, vá em **Table Editor**
2. Selecione a tabela `pessoas` - deve ter 62 registros
3. Selecione a tabela `relacionamentos` - deve ter centenas de registros
4. Filtre por `tipo_relacionamento = 'irmao'` - deve ter muitos registros
5. Verifique se os dados estão corretos

### **Método 3: Via SQL (RECOMENDADO para verificar irmãos)**
Execute o arquivo `verificar-irmaos.sql` no SQL Editor do Supabase:
```sql
-- Ver total de relacionamentos por tipo
SELECT tipo_relacionamento, COUNT(*) as total
FROM relacionamentos
GROUP BY tipo_relacionamento;

-- Ver pessoas com seus irmãos
SELECT 
  p1.nome_completo as pessoa,
  COUNT(r.id) as total_irmaos,
  STRING_AGG(p2.nome_completo, ', ') as nomes_irmaos
FROM pessoas p1
LEFT JOIN relacionamentos r ON r.pessoa_origem_id = p1.id AND r.tipo_relacionamento = 'irmao'
LEFT JOIN pessoas p2 ON p2.id = r.pessoa_destino_id
WHERE p1.humano_ou_pet = 'Humano'
GROUP BY p1.id, p1.nome_completo
HAVING COUNT(r.id) > 0
ORDER BY total_irmaos DESC
LIMIT 10;
```

✅ **Arquivo completo de verificação disponível em:** `/verificar-irmaos.sql`

### **Método 4: Via SQL Básico**
Execute no SQL Editor:
```sql
-- Ver total de pessoas
SELECT COUNT(*) FROM pessoas;

-- Ver total de relacionamentos
SELECT COUNT(*) FROM relacionamentos;

-- Ver estatísticas por tipo de relacionamento
SELECT tipo_relacionamento, COUNT(*) 
FROM relacionamentos 
GROUP BY tipo_relacionamento;

-- IMPORTANTE: Verificar se existe relacionamento de irmãos
SELECT COUNT(*) as total_irmaos
FROM relacionamentos 
WHERE tipo_relacionamento = 'irmao';
-- Este número deve ser > 0 (geralmente centenas)

-- Ver algumas pessoas de exemplo
SELECT id, nome_completo, humano_ou_pet 
FROM pessoas 
LIMIT 10;
```

---

## ⚠️ Solução de Problemas

### **Erro: "relation already exists"**
- **Causa:** Tabelas já foram criadas anteriormente
- **Solução:** O script usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar novamente

### **Erro: "permission denied"**
- **Causa:** Usuário sem permissões adequadas
- **Solução:** Use o SQL Editor do Supabase (já tem permissões corretas)

### **Erro: "extension uuid-ossp does not exist"**
- **Causa:** Extensão não instalada
- **Solução:** Execute primeiro: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### **Tabelas criadas mas vazias**
- **Causa:** Migração de dados não foi executada
- **Solução:** Acesse `/admin/migrar-dados` e execute a migração

### **Erro na migração: "seed inválido"**
- **Causa:** Arquivo seed.ts não está acessível
- **Solução:** Verifique se o arquivo `/src/app/data/seed.ts` existe

---

## 🎯 Checklist Completo

Antes de considerar o setup completo, verifique:

- [ ] Extensão `uuid-ossp` habilitada
- [ ] Tabela `pessoas` criada (62 registros após migração)
- [ ] Tabela `relacionamentos` criada (centenas de registros após migração)
- [ ] Tabela `arquivos_historicos` criada (vazia inicialmente)
- [ ] Função `update_updated_at_column()` criada
- [ ] 3 triggers criados (um para cada tabela)
- [ ] Índices criados em todas as tabelas
- [ ] Políticas RLS configuradas
- [ ] View `pessoas_com_estatisticas` criada
- [ ] Migração de dados executada com sucesso
- [ ] Árvore genealógica aparecendo na home (`/`)
- [ ] Diagnóstico em `/admin/diagnostico` mostrando dados corretos

---

## 📚 Estrutura das Tabelas

### **Tabela: pessoas**
```
id                  UUID (PK)
nome_completo       VARCHAR(255) NOT NULL
data_nascimento     VARCHAR(50)
local_nascimento    VARCHAR(255)
data_falecimento    VARCHAR(50)
local_falecimento   VARCHAR(255)
local_atual         VARCHAR(255)
foto_principal_url  TEXT
humano_ou_pet       VARCHAR(20) NOT NULL DEFAULT 'Humano'
cor_bg_card         VARCHAR(20)
minibio             TEXT
curiosidades        TEXT
telefone            VARCHAR(20)
endereco            TEXT
rede_social         VARCHAR(500)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### **Tabela: relacionamentos**
```
id                      UUID (PK)
pessoa_origem_id        UUID (FK -> pessoas.id)
pessoa_destino_id       UUID (FK -> pessoas.id)
tipo_relacionamento     VARCHAR(50) NOT NULL
subtipo_relacionamento  VARCHAR(50)
created_at              TIMESTAMP
updated_at              TIMESTAMP

UNIQUE (pessoa_origem_id, pessoa_destino_id, tipo_relacionamento)
```

### **Tabela: arquivos_historicos**
```
id          UUID (PK)
pessoa_id   UUID (FK -> pessoas.id)
url         TEXT NOT NULL
titulo      VARCHAR(255)
descricao   TEXT
ano         VARCHAR(10)
tipo        VARCHAR(50) DEFAULT 'foto'
ordem       INT DEFAULT 0
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

---

## 🚀 Próximos Passos

Após concluir o setup:

1. ✅ Acesse a home (`/`) para ver a árvore genealógica
2. ✅ Teste a navegação clicando nas pessoas
3. ✅ Acesse o painel admin (`/admin`) para gerenciar dados
4. ✅ Use o diagnóstico (`/admin/diagnostico`) para verificar integridade
5. ✅ Experimente adicionar/editar pessoas e relacionamentos

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor Supabase
2. Verifique os logs do navegador (Console do DevTools)
3. Execute o diagnóstico em `/admin/diagnostico`
4. Consulte a documentação do Supabase: https://supabase.com/docs