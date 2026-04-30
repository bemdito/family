# Sistema de Árvore Genealógica

Sistema web completo para visualização e gestão de árvore genealógica familiar, com área pública interativa e painel administrativo.

## 🎯 Funcionalidades Principais

### Área Pública
- ✅ Visualização interativa da árvore genealógica
- ✅ Zoom, pan e navegação fluida
- ✅ Busca por nome ou localização
- ✅ Página individual de cada pessoa
- ✅ Filtros por tipo (humano/pet)
- ✅ Suporte a pets na família
- ✅ Indicação visual de pessoas falecidas
- ✅ Legenda explicativa
- ✅ Estatísticas em tempo real
- ✅ Layout automático baseado em relacionamentos

### Painel Administrativo
- ✅ Sistema de autenticação
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de pessoas
- ✅ CRUD completo de relacionamentos
- ✅ Importação de dados via JSON
- ✅ Suporte a múltiplos tipos de relacionamentos
- ✅ Gestão de filiação (sangue/adotiva)
- ✅ Gestão de relacionamentos conjugais

## 🏗️ Arquitetura

### Stack Tecnológica

- **Frontend Framework**: React 18.3 com TypeScript
- **Roteamento**: React Router 7 (Data Mode)
- **Estilização**: Tailwind CSS v4
- **Visualização da Árvore**: ReactFlow + Dagre (layout automático)
- **Ícones**: Lucide React
- **State Management**: Hooks do React + Service Layer

### Estrutura de Pastas

```
src/
├── app/
│   ├── components/
│   │   ├── FamilyTree/
│   │   │   ├── FamilyTree.tsx      # Componente principal da árvore
│   │   │   └── PersonNode.tsx      # Card de pessoa na árvore
│   │   └── ui/                      # Componentes reutilizáveis
│   ├── pages/
│   │   ├── Home.tsx                 # Página inicial com árvore
│   │   ├── PersonProfile.tsx        # Página individual da pessoa
│   │   └── admin/                   # Páginas administrativas
│   ├── services/
│   │   └── dataService.ts           # Lógica de negócio e CRUD
│   ├── data/
│   │   └── seed.ts                  # Dados iniciais da família
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   ├── lib/
│   │   └── utils.ts                 # Funções utilitárias
│   ├── routes.tsx                   # Configuração de rotas
│   └── App.tsx                      # Componente raiz
└── styles/                          # Estilos globais
```

## 📊 Modelagem de Dados

### Pessoa
```typescript
interface Pessoa {
  id: string;
  nome_completo: string;
  data_nascimento?: number | string;
  local_nascimento?: string;
  data_falecimento?: number | string;
  local_falecimento?: string;
  local_atual?: string;
  foto_principal_url?: string;
  humano_ou_pet: 'Humano' | 'Pet';
  cor_bg_card?: string;
  minibio?: string;
  curiosidades?: string;
  telefone?: string;
  endereco?: string;
  rede_social?: string;
}
```

### Relacionamento
```typescript
interface Relacionamento {
  id: string;
  pessoa_origem_id: string;
  pessoa_destino_id: string;
  tipo_relacionamento: 'conjuge' | 'pai' | 'mae' | 'filho';
  subtipo_relacionamento?: 'sangue' | 'adotivo' | 'casamento';
  ativo: boolean;
}
```

## 🎨 Design System

### Cores Semânticas
- **Azul**: Pessoas vivas (humanos)
- **Cinza**: Pessoas falecidas
- **Âmbar**: Pets
- **Verde**: Relacionamentos conjugais
- **Cinza/Âmbar**: Filiação (sólido/tracejado)

### Componentes Visuais
- **PersonNode**: Card customizado para cada pessoa na árvore
- **Edges**: Linhas conectando pessoas (sólidas para casamento, com setas para filiação)
- **MiniMap**: Visão geral da árvore
- **Controls**: Zoom in/out, fit view

## 🔄 Fluxo de Dados

1. **Importação Inicial**: Dados do arquivo `seed.ts` são processados pelo `dataService`
2. **Transformação**: Dados brutos são convertidos em Pessoas e Relacionamentos
3. **Armazenamento**: Dados ficam em memória (store local)
4. **Visualização**: ReactFlow renderiza a árvore usando layout Dagre
5. **CRUD**: Operações administrativas atualizam o store

## 🚀 Próximos Passos (Integração Supabase)

Para tornar o sistema totalmente funcional em produção:

### Backend (Supabase)
- [ ] Configurar projeto Supabase
- [ ] Criar tabelas: `pessoas`, `relacionamentos`, `imagens_pessoa`
- [ ] Implementar Row Level Security (RLS)
- [ ] Configurar Supabase Auth para admin
- [ ] Configurar Supabase Storage para fotos

### Funcionalidades Adicionais
- [ ] Upload de imagens
- [ ] Galeria de fotos por pessoa
- [ ] Exportação para PDF
- [ ] Importação de CSV/Excel
- [ ] Sistema de permissões (admin/editor/viewer)
- [ ] Histórico de alterações
- [ ] Notificações
- [ ] Compartilhamento público via link

## 🎯 Regras de Negócio

1. **Relacionamentos Bidirecionais**: Ao criar um relacionamento, o inverso é criado automaticamente
2. **Dados Incompletos**: O sistema aceita campos vazios e trabalha com dados parciais
3. **Nomes Provisórios**: Nomes como "Mulher de João" são válidos e podem ser editados depois
4. **Múltiplas Uniões**: Uma pessoa pode ter vários cônjuges ao longo da vida
5. **Filiação Múltipla**: Suporte para pais biológicos e adotivos
6. **Pets na Família**: Pets são membros válidos com visualização diferenciada

## 🔐 Autenticação (Mock)

Credenciais para teste:
- **Email**: admin@familia.com
- **Senha**: admin123

*Em produção, substituir por Supabase Auth*

## 📱 Responsividade

- **Desktop**: Visualização completa da árvore com todos os controles
- **Tablet**: Layout adaptado com navegação touch-friendly
- **Mobile**: Foco em busca individual e visualização de perfis

## 🎨 Características do ReactFlow

- **Layout Automático**: Usa algoritmo Dagre para posicionamento hierárquico
- **Interatividade**: Zoom, pan, drag & drop
- **Customização**: Nodes e edges totalmente customizados
- **Performance**: Otimizado para grandes quantidades de nós
- **Touch Support**: Funciona em dispositivos móveis

## 📖 Uso do Sistema

### Visualizar a Árvore
1. Acesse a home (/)
2. Use zoom/pan para navegar
3. Clique em uma pessoa para ver detalhes
4. Use a busca para localizar membros

### Adicionar Pessoas (Admin)
1. Faça login em /admin/login
2. Vá para "Adicionar Pessoa"
3. Preencha os dados
4. Salve

### Criar Relacionamentos (Admin)
1. Acesse "Relacionamentos"
2. Clique em "Adicionar"
3. Selecione origem, destino e tipo
4. Confirme

## 🔧 Dados de Teste

O sistema vem com 62 membros pré-cadastrados da família Limeira Souza, incluindo:
- Múltiplas gerações
- Diferentes sobrenomes
- Pessoas de várias localidades
- Um pet (Populos)
- Pessoas falecidas
- Relacionamentos complexos

---

**Desenvolvido com ❤️ para preservar histórias familiares**
