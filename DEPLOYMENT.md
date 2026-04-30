# 🚀 Guia de Deploy e Integração Supabase

## Preparando para Produção

### 1. Configurar Supabase

#### Criar Projeto
```bash
# Visite https://supabase.com
# Crie um novo projeto
# Anote a URL e ANON KEY
```

#### Schema do Banco de Dados
```sql
-- Tabela de pessoas
CREATE TABLE pessoas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_completo TEXT NOT NULL,
  data_nascimento TEXT,
  local_nascimento TEXT,
  data_falecimento TEXT,
  local_falecimento TEXT,
  local_atual TEXT,
  foto_principal_url TEXT,
  humano_ou_pet TEXT NOT NULL DEFAULT 'Humano',
  cor_bg_card TEXT,
  minibio TEXT,
  curiosidades TEXT,
  telefone TEXT,
  endereco TEXT,
  rede_social TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamentos
CREATE TABLE relacionamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_origem_id UUID REFERENCES pessoas(id) ON DELETE CASCADE,
  pessoa_destino_id UUID REFERENCES pessoas(id) ON DELETE CASCADE,
  tipo_relacionamento TEXT NOT NULL,
  subtipo_relacionamento TEXT,
  data_casamento TEXT,
  data_separacao TEXT,
  local_casamento TEXT,
  local_separacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de imagens
CREATE TABLE imagens_pessoa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  legenda TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_relacionamentos_origem ON relacionamentos(pessoa_origem_id);
CREATE INDEX idx_relacionamentos_destino ON relacionamentos(pessoa_destino_id);
CREATE INDEX idx_imagens_pessoa ON imagens_pessoa(pessoa_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pessoas_updated_at BEFORE UPDATE ON pessoas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Políticas de Segurança (Row Level Security)
```sql
-- Habilitar RLS
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relacionamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_pessoa ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "Leitura pública de pessoas"
  ON pessoas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Leitura pública de relacionamentos"
  ON relacionamentos FOR SELECT
  TO public
  USING (true);

-- Escrita apenas para autenticados
CREATE POLICY "Admin pode inserir pessoas"
  ON pessoas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin pode atualizar pessoas"
  ON pessoas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admin pode deletar pessoas"
  ON pessoas FOR DELETE
  TO authenticated
  USING (true);

-- Aplicar mesmas políticas para relacionamentos e imagens
```

### 2. Configurar Storage (para fotos)
```sql
-- Criar bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Política de upload (apenas autenticados)
CREATE POLICY "Autenticados podem fazer upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Política de leitura pública
CREATE POLICY "Todos podem ver avatares"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
```

### 3. Integração no Código

#### Instalar Cliente Supabase
```bash
npm install @supabase/supabase-js
```

#### Criar Cliente Supabase
```typescript
// src/app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### Atualizar dataService.ts
```typescript
// Substituir funções mock por chamadas Supabase
export async function obterTodasPessoas() {
  const { data, error } = await supabase
    .from('pessoas')
    .select('*')
    .order('nome_completo');
  
  if (error) throw error;
  return data;
}

export async function adicionarPessoa(pessoa: Omit<Pessoa, 'id'>) {
  const { data, error } = await supabase
    .from('pessoas')
    .insert([pessoa])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ... implementar outras funções
```

#### Autenticação Real
```typescript
// Substituir mock auth por Supabase Auth
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function useAuth() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  return session;
}
```

### 4. Variáveis de Ambiente

Criar `.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Adicionar ao `.gitignore`:
```
.env
.env.local
```

### 5. Deploy

#### Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente no dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

#### Netlify
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Configurar env vars no dashboard
```

#### Build Manual
```bash
npm run build
# Arquivos gerados em /dist
# Upload para qualquer servidor estático
```

### 6. Migrar Dados Existentes

```typescript
// Script de migração
import { supabase } from './lib/supabase';
import { DADOS_FAMILIA } from './data/seed';

async function migrarDados() {
  // Importar pessoas
  const { data: pessoas, error: pessoasError } = await supabase
    .from('pessoas')
    .insert(DADOS_FAMILIA.map(d => ({
      nome_completo: d['Nome completo'],
      data_nascimento: d['Data de nascimento'],
      local_nascimento: d['Local de Nascimento'],
      // ... mapear todos os campos
    })))
    .select();

  // Criar relacionamentos
  // ... lógica de relacionamentos
}

migrarDados();
```

### 7. Otimizações

#### Performance
- Implementar cache com React Query
- Lazy loading de imagens
- Virtualização para listas grandes
- Code splitting por rota

#### SEO
- Adicionar meta tags
- Sitemap
- robots.txt
- Open Graph tags

#### PWA
- Service Worker
- Manifest.json
- Ícones para mobile
- Funcionamento offline básico

### 8. Monitoramento

#### Sentry (Erros)
```bash
npm install @sentry/react
```

#### Analytics
```bash
npm install @vercel/analytics
# ou
npm install react-ga4
```

### 9. Segurança

- ✅ Sempre use RLS no Supabase
- ✅ Valide dados no backend
- ✅ Sanitize inputs do usuário
- ✅ Use HTTPS (obrigatório)
- ✅ Configure CORS adequadamente
- ✅ Implemente rate limiting
- ✅ Backup regular do banco

### 10. Backup e Recovery

```sql
-- Backup automático está incluso no Supabase
-- Export manual via dashboard
-- Ou via pg_dump

pg_dump -U postgres -h seu-db.supabase.co -d postgres > backup.sql
```

---

## Checklist de Deploy

- [ ] Supabase configurado
- [ ] Schema do banco criado
- [ ] RLS policies configuradas
- [ ] Storage bucket criado
- [ ] Variáveis de ambiente configuradas
- [ ] Código atualizado para usar Supabase
- [ ] Build testado localmente
- [ ] Deploy realizado
- [ ] Domínio customizado configurado (opcional)
- [ ] SSL/HTTPS ativo
- [ ] Analytics configurado
- [ ] Monitoramento de erros ativo
- [ ] Backup configurado

## Suporte

Para dúvidas sobre Supabase: https://supabase.com/docs
Para dúvidas sobre Vercel: https://vercel.com/docs
