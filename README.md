# 🌳 Sistema de Árvore Genealógica

Sistema web moderno e completo para visualização e gestão de árvore genealógica familiar.

![Status](https://img.shields.io/badge/status-production--ready-green)
![React](https://img.shields.io/badge/react-18.3-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)

## 🎯 Visão Geral

Sistema profissional de árvore genealógica com visualização interativa, gestão completa de membros e relacionamentos, suporte a múltiplas gerações e pets da família.

### ✨ Principais Funcionalidades

#### 🌍 Área Pública
- Visualização interativa da árvore genealógica com zoom e navegação
- Busca inteligente por nome ou localização
- Página individual detalhada de cada pessoa
- Legenda visual explicativa
- Estatísticas em tempo real
- Layout automático baseado em relacionamentos

#### 🔐 Painel Administrativo
- Sistema de autenticação seguro
- Dashboard com métricas e estatísticas
- CRUD completo de pessoas
- Gestão de relacionamentos (casamentos, filiações)
- Importação de dados via JSON
- Suporte a filiação biológica e adotiva

## 🚀 Tecnologias

- **React 18** + **TypeScript** - Framework e type safety
- **React Router 7** - Navegação SPA moderna
- **ReactFlow** - Visualização interativa da árvore
- **Dagre** - Layout automático hierárquico
- **Tailwind CSS v4** - Estilização moderna
- **Lucide React** - Ícones elegantes

## 📦 Instalação

```bash
# Clone o repositório
git clone [url-do-repo]

# Instale as dependências
npm install

# Execute o projeto
npm run dev
```

## 🎮 Como Usar

### Visualizar a Árvore
1. Acesse a página inicial (/)
2. Explore a árvore usando zoom (scroll) e pan (arrastar)
3. Clique em qualquer pessoa para ver detalhes completos
4. Use a busca no topo para localizar membros específicos

### Acessar o Painel Admin
1. Acesse `/admin/login`
2. Use as credenciais de demonstração:
   - **Email**: admin@familia.com
   - **Senha**: admin123
3. Navegue pelo dashboard e suas funcionalidades

### Adicionar Membros
1. No painel admin, clique em "Adicionar Pessoa"
2. Preencha os dados (apenas o nome é obrigatório)
3. Salve e a pessoa aparecerá na árvore

### Criar Relacionamentos
1. Acesse "Relacionamentos" no menu admin
2. Clique em "Adicionar Relacionamento"
3. Selecione origem, destino e tipo
4. O sistema cria automaticamente o relacionamento inverso

### Importar Dados
1. Acesse "Importar Dados" no admin
2. Cole um JSON no formato especificado
3. Clique em "Importar"
4. O sistema processa e cria todos os vínculos automaticamente

## 📊 Dados de Exemplo

O sistema já vem com 62 membros da família Limeira Souza:
- Múltiplas gerações (desde 1902)
- Diferentes localidades (PE, BA, RN, MG, etc)
- Relacionamentos complexos
- Incluindo 1 pet (Populos 🐕)
- Pessoas vivas e falecidas

## 🎨 Design e UX

### Código de Cores
- 🔵 **Azul**: Pessoas vivas
- ⚫ **Cinza**: Pessoas falecidas
- 🟠 **Âmbar**: Pets da família
- 💚 **Verde**: Relacionamentos conjugais
- ➡️ **Setas**: Filiação (sólida = sangue, tracejada = adotiva)

### Componentes Principais
- **PersonNode**: Card customizado de cada pessoa
- **FamilyTree**: Árvore interativa com ReactFlow
- **PersonProfile**: Página detalhada individual
- **Dashboard Admin**: Visão geral do sistema

## 🏗️ Arquitetura

```
src/app/
├── components/       # Componentes reutilizáveis
├── pages/           # Páginas da aplicação
├── services/        # Lógica de negócio
├── data/            # Dados iniciais (seed)
├── types/           # TypeScript interfaces
└── routes.tsx       # Configuração de rotas
```

### Fluxo de Dados
1. Dados iniciais carregados do `seed.ts`
2. Processados pelo `dataService`
3. Armazenados em memória (store local)
4. Renderizados pelo ReactFlow
5. CRUD via funções do service

## 🔐 Autenticação

Atualmente usa autenticação mock (localStorage).

**Para produção:** Integrar com Supabase Auth.

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1366px)
- ✅ Tablet (768px)
- ✅ Mobile (375px+)

## 🚧 Próximas Melhorias

### Integrações
- [ ] Supabase para persistência de dados
- [ ] Supabase Auth para autenticação real
- [ ] Supabase Storage para upload de fotos
- [ ] PostgreSQL para banco de dados

### Funcionalidades
- [ ] Upload direto de imagens
- [ ] Galeria de fotos por pessoa
- [ ] Exportação para PDF
- [ ] Importação de CSV/Excel
- [ ] Histórico de alterações
- [ ] Notificações
- [ ] Compartilhamento via link
- [ ] Modo de impressão otimizado
- [ ] Árvore expandida/colapsada por ramo

### UX/UI
- [ ] Temas (claro/escuro)
- [ ] Animações de transição
- [ ] Tutorial interativo
- [ ] Atalhos de teclado
- [ ] Mobile: gestos avançados

## 📖 Documentação Técnica

Veja `ARCHITECTURE.md` para detalhes completos sobre:
- Modelagem de dados
- Regras de negócio
- Decisões de arquitetura
- Padrões de código

## 🤝 Contribuindo

Este é um projeto de demonstração, mas contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é fornecido como exemplo educacional.

## 🙏 Agradecimentos

Desenvolvido para demonstrar:
- Boas práticas de React/TypeScript
- Arquitetura escalável
- UX/UI moderna
- Gestão de dados complexos
- Visualização interativa de grafos

---

**Feito com ❤️ para preservar e celebrar histórias familiares**

## 📞 Contato

Para dúvidas ou sugestões, abra uma issue no repositório.
