# Roadmap de Implementação das Novas Funcionalidades

Este documento organiza a expansão do projeto `arvorefamilia` em lotes executáveis, priorizando dependências técnicas e redução de risco.

## Estado atual

O repositório já possui:

- árvore pública interativa
- perfil individual da pessoa
- painel administrativo
- CRUD de pessoas e relacionamentos
- migração/importação de dados
- arquivos históricos por pessoa
- persistência via Supabase + função server

## Objetivo da expansão

Transformar o sistema atual em uma plataforma familiar mais completa, com:

- árvore geral e árvore personalizada por usuário
- calendário de aniversários e datas de memória
- notificações
- favoritos
- eventos da família
- exportação/impressão
- integrações futuras com agenda, WhatsApp, Instagram e IA

---

## Lote 1 — Base de navegação temporal e preparação de domínio

### Entregas
- utilitários de datas familiares
- cálculo de geração sociológica
- rota pública de calendário familiar
- página de calendário com aniversários e datas de memória
- expansão de tipos para favoritos, notificações, eventos e vínculo usuário-pessoa

### Status
- Em implementação inicial

---

## Lote 2 — Banco de dados expandido

### Objetivo
Criar a base de dados para suportar login real, notificações, favoritos, eventos e preferências.

### Tabelas sugeridas
- `profiles`
- `user_person_links`
- `notification_preferences`
- `notifications`
- `user_favorites`
- `family_events`
- `event_attendees`

### Observações
- manter `pessoas`, `relacionamentos` e `arquivos_historicos`
- ampliar `pessoas` com campos de Instagram, WhatsApp e geração sociológica
- aplicar RLS por papel/perfil

---

## Lote 3 — Autenticação real e área do membro

### Objetivo
Substituir autenticação mock de admin por autenticação real via Supabase Auth e iniciar a área autenticada do membro da família.

### Entregas
- login/logout real
- separação entre área pública, área do membro e admin
- associação de usuário com pessoa da árvore
- página inicial do membro autenticado

---

## Lote 4 — Minha árvore

### Objetivo
Permitir que o usuário visualize a árvore a partir de si mesmo.

### Entregas
- visualização centrada no usuário
- destaque de "você"
- filtro por família direta
- filtros por ramo materno e paterno
- subárvore a partir de avós e bisavós
- manutenção da árvore geral

---

## Lote 5 — Calendário completo + Google Agenda

### Entregas
- refinamento do calendário mensal
- página de aniversariantes do mês
- página de datas de memória
- exportação `.ics`
- integração futura com Google Agenda

---

## Lote 6 — Notificações e favoritos

### Entregas
- central de notificações
- preferências de notificações
- favoritos por tipo de conteúdo
- página "Meus favoritos"

---

## Lote 7 — Eventos, mural e interação

### Entregas
- eventos da família
- mural/fórum
- comentários e respostas
- moderação básica
- integração com notificações

---

## Lote 8 — Exportação, impressão e PDF

### Entregas
- versão print-friendly de páginas-chave
- botão de impressão
- exportação para PDF de perfis, árvore, calendário e ramos familiares

---

## Lote 9 — Integrações sociais

### Entregas
- botão de WhatsApp por perfil, com consentimento
- Instagram no perfil
- embeds de conteúdo selecionado
- futura agregação de mídia em página única

---

## Lote 10 — IA e consultas avançadas

### Entregas
- perguntas em linguagem natural sobre a árvore
- engine de parentesco
- consultas por geração, cidades, sobrenomes, aniversários e estatísticas
- fatos marcantes do ano/dia de nascimento

---

## Critério de prioridade

A ordem recomendada é:

1. banco + autenticação
2. minha árvore
3. calendário + notificações
4. favoritos + eventos
5. exportação/impressão
6. social + integrações
7. IA

---

## Observação importante

Evitar implementar IA, Instagram e mural como prioridade absoluta antes de consolidar:

- autenticação real
- vínculo entre usuário e pessoa
- modelo de dados expandido
- privacidade e permissões

Esses quatro itens são a fundação do restante.
