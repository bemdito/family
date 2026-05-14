# Novidades incorporadas e pontos de atenção

## Novidades para usuários

### Menu do usuário / Header

- O botão **“Painel administrativo”** só aparece para usuários admin.
- Usuários comuns não devem mais ver o botão de acesso ao admin.
- Ao clicar em **“Painel administrativo”**, o admin vai direto para `/admin`.
- A tela intermediária `/admin/login` não deve mais aparecer a partir do menu do usuário.

### Minha Árvore

- Usuários comuns não alteram mais vínculos reais diretamente.
- Ao tentar criar, remover ou corrigir vínculo, a ação vira **solicitação para revisão dos administradores**.
- Devem aparecer textos como:
  - **Solicitar vínculo**
  - **Solicitar remoção**
  - **Solicitar correção**
- Após solicitar, o usuário deve receber feedback de que a solicitação foi enviada para revisão.
- A árvore real não deve mudar imediatamente antes da aprovação admin.
- Edições de perfil feitas pelo próprio usuário agora geram histórico de atividades.
- Alterações feitas no perfil devem refletir na Home sem depender de cache antigo/local obsoleto.
- O usuário agora pode gerenciar **arquivos históricos** na área de edição do próprio perfil.
- Novos arquivos históricos enviados pelo usuário devem ir para **Supabase Storage**, não para base64 no banco.

### Meus Dados / Primeiro acesso

- Campos de privacidade devem vir ativados por padrão.
- Preferências de notificação também devem vir ativadas por padrão.
- O usuário pode revisar e alterar essas opções.
- Dados confirmados no primeiro acesso agora podem gerar registro no histórico.
- Ajustes de vínculos no primeiro acesso não devem mais ser apenas simulação local; devem virar solicitações pendentes para admins.
- O texto antigo de “revisão” sem backend não deve mais existir.

### Meus Vínculos

- Adições, remoções ou edições de vínculos feitas por usuário comum agora devem virar solicitações.
- Não deve mais haver gravação direta de relacionamento real por usuário comum.
- Não deve mais haver promessa de revisão sem que uma solicitação seja registrada no banco.

### Página de perfil da pessoa

- Arquivos históricos vinculados à pessoa devem aparecer no perfil.
- Arquivos históricos podem exibir também o ano, quando informado.
- Arquivos antigos em base64/data URL continuam compatíveis.
- Arquivos novos devem ser URLs do Storage.

---

## Genealogia e Visão Completa

### Views por geração

- Existe a nova view **Visão Completa**.
- **Genealogia** usa o mesmo escopo pessoal da **Minha Árvore**, mas em layout de colunas por geração.
- **Visão Completa** usa o layout de colunas por geração, mas exibindo todas as pessoas cadastradas.
- A view **Minha Árvore** continua separada e não deve ter sido alterada visualmente.

### Conectores pais-filhos

- Conectores pais-filhos foram generalizados para todos os pares adjacentes de gerações.
- Devem aparecer conexões em:
  - geração 1 → geração 2;
  - geração 2 → geração 3;
  - geração 3 → geração 4;
  - geração 4 → geração 5;
  - geração 5 → geração 6;
  - futuros pares N → N+1.
- Famílias com filho único não devem mais gerar linha diagonal.
- Filho único alinhado usa linha reta.
- Filho único desalinhado usa conector ortogonal.
- Famílias com múltiplos filhos usam barramento vertical.
- Barramentos verticais de famílias diferentes agora usam “lanes” para reduzir sobreposição.
- Não devem existir linhas diagonais entre pais e filhos.
- Não devem existir linhas verticais exatamente sobrepostas quando houver espaço para separação visual.
- Cônjuges dos filhos não devem ser conectados como filhos reais.

### Anel de casamento 💍

- O emoji `💍` continua aparecendo entre cônjuges.
- O anel agora é clicável.
- Clicar no anel abre o modal de relacionamento conjugal.
- O clique no anel não deve quebrar pan, zoom, drag ou seleção do ReactFlow.
- O visual do anel deve continuar respeitando o status conjugal:
  - ativo;
  - separado/divorciado;
  - viuvez;
  - desconhecido.

### Modal de relacionamento conjugal

- O modal mostra os dois cônjuges.
- Mostra dados reais do relacionamento conjugal.
- Mostra status calculado: ativo, separado/divorciado, viuvez ou desconhecido.
- Mostra tipo/subtipo do relacionamento.
- Mostra data/local de casamento, quando houver.
- Mostra data/local de separação, quando houver.
- Observações aparecem apenas para admin.
- Arquivos históricos vinculados ao relacionamento aparecem no modal.
- Admin pode adicionar, editar, remover e salvar arquivos históricos do relacionamento.
- Usuário comum pode apenas visualizar.
- Usuário comum não deve conseguir alterar relacionamento real pelo modal.
- Arquivos históricos do relacionamento usam `relacionamento_id`.
- Novos arquivos do relacionamento devem ser salvos no bucket `historical-files`.

---

## Admin geral

### Dashboard administrativo

- O dashboard ganhou acesso para **Histórico de Atividades**.
- O dashboard ganhou acesso para **Solicitações de vínculos**.
- O dashboard ganhou acesso para **Integridade dos dados**.
- O dashboard mostra atividades recentes.
- O dashboard mostra contagem/atalho para solicitações pendentes de vínculos.

### Gerenciar Pessoas

- O campo **“Lado”** não deve mais aparecer no formulário.
- O campo `lado` pode continuar existindo tecnicamente, mas não deve ser editável pela UI.
- Gerenciar Pessoas agora tem botão **Filtros**.
- O modal de filtros permite filtrar por:
  - vivos/falecidos;
  - com foto/sem foto;
  - geração manual;
  - sem geração manual;
  - sem data de nascimento;
  - sem local de nascimento;
  - sem local atual;
  - com/sem telefone;
  - com/sem rede social/site.
- Filtros avançados combinam com busca textual e filtro humano/pet.
- Deve existir opção para limpar filtros.

### Relacionamentos admin

- Admin continua sendo quem cria, edita e remove relacionamentos reais.
- Usuários comuns não devem mais conseguir alterar `public.relacionamentos` diretamente.
- Relacionamentos conjugais agora suportam status completo:
  - ativo;
  - inativo;
  - separado;
  - data de separação;
  - local de separação;
  - observações.
- Admin pode criar relacionamento conjugal com esses campos.
- Admin pode editar status conjugal existente.
- A listagem de relacionamentos exibe status conjugal.
- A Genealogia usa esses dados para calcular o estado visual do anel.
- Logs de relacionamento passaram a incluir `relationship.updated`.

### Solicitações de vínculos

- Existe rota administrativa:
  - `/admin/solicitacoes-vinculos`
- Admin pode visualizar solicitações de alteração de vínculos.
- Solicitações podem ter status:
  - pendente;
  - aprovada;
  - rejeitada;
  - cancelada.
- Usuário comum envia solicitação, não altera relacionamento real.
- Admin aprova ou rejeita.
- Aprovação aplica a alteração real no relacionamento.
- Rejeição não altera relacionamento real.
- Histórico registra:
  - `relationship_change_requested`;
  - `relationship_change_approved`;
  - `relationship_change_rejected`;
  - `relationship_change_cancelled`.

### Histórico de Atividades

- Existe rota:
  - `/admin/atividades`
- Admin pode visualizar histórico de:
  - criação de pessoa;
  - edição de pessoa;
  - alteração de foto;
  - alteração de privacidade;
  - alteração de notificações;
  - criação/edição/exclusão de relacionamento;
  - arquivos históricos adicionados/editados/removidos;
  - confirmação de primeiro acesso;
  - solicitações de vínculo.
- Logs agora funcionam com RLS sem depender de `.select().single()` após insert.
- Usuário comum consegue registrar logs das próprias ações.
- Usuário comum não deve conseguir listar logs globais.
- O histórico não deve salvar URL completa, base64, telefone, endereço ou e-mail em metadata.
- O admin consegue listar os logs globais.

### Integridade dos dados

- Existe nova rota:
  - `/admin/integridade`
- A tela é protegida por `ProtectedRoute`.
- Usuário comum não deve acessar.
- A tela não usa mais endpoint legado `make-server`.
- A tela é somente leitura.
- Não faz correções automáticas.
- Diagnostica problemas em:
  - pessoas;
  - relacionamentos;
  - arquivos históricos;
  - Storage;
  - usuários/vínculos;
  - activity logs;
  - solicitações de vínculos.
- Arquivos antigos em base64/data URL aparecem como legado, não como erro destrutivo.
- URLs suspeitas de Storage são sinalizadas.
- Relacionamentos sem inverso, duplicados ou inconsistentes são listados.
- Solicitações antigas pendentes são destacadas.
- A tela deve ter botão de atualizar diagnóstico.

---

## Arquivos históricos e Storage

### Uploads

- Fotos principais agora devem ser salvas no Supabase Storage.
- Fotos novas não devem mais ser salvas como base64 no banco.
- Arquivos históricos novos devem ser salvos no Supabase Storage.
- Arquivos históricos novos não devem mais ser salvos como base64 no banco.
- Buckets usados:
  - `person-avatars`;
  - `historical-files`.
- Registros antigos em base64/data URL continuam funcionando.
- Não houve migração destrutiva para apagar dados antigos.

### Arquivos históricos de pessoas

- Continuam vinculados por `pessoa_id`.
- Usuário pode adicionar arquivos no próprio perfil.
- Usuário pode editar título, descrição e ano dos arquivos do próprio perfil.
- Usuário pode reordenar arquivos históricos.
- Usuário pode remover o vínculo/registro do arquivo histórico do próprio perfil, conforme RLS atual.
- Objeto físico no Storage não é necessariamente deletado pelo usuário comum, porque deleção de Storage é restrita.

### Arquivos históricos de relacionamentos

- Agora existe suporte a `relacionamento_id` em `arquivos_historicos`.
- Arquivos históricos de relacionamento ficam ligados ao relacionamento conjugal.
- Admin pode adicionar arquivos históricos ao relacionamento pelo modal do anel.
- Usuário comum apenas visualiza arquivos históricos de relacionamento.
- Novos uploads de relacionamento usam paths de Storage por relacionamento.

---

## Banco, RLS e segurança

### Relacionamentos

- Edição direta de `public.relacionamentos` por membros comuns foi neutralizada.
- Apenas admins devem conseguir inserir, atualizar ou excluir relacionamentos reais.
- Usuários autenticados continuam podendo ler relacionamentos.
- Usuários comuns passam a usar solicitações de alteração.

### Solicitações de vínculos

- Foi criada estrutura `relationship_change_requests`.
- Usuário cria solicitação própria.
- Usuário pode ler as próprias solicitações.
- Admin pode ler e revisar todas.
- Usuário comum não pode aprovar/rejeitar.
- Usuário comum não pode alterar solicitação já aprovada/rejeitada.

### Activity logs

- Foi criada tabela `activity_logs`.
- RLS permite admin ler tudo.
- Usuário autenticado insere logs das próprias ações.
- Usuário comum não tem leitura global.
- `createActivityLog` não deve usar `.select().single()` após insert.

### Storage

- Buckets `person-avatars` e `historical-files` foram criados/configurados.
- Escrita fica restrita a usuários autenticados conforme policies.
- Deleção de arquivos no Storage fica restrita a admin.

---

## O que não deve mais existir/acontecer

### Acesso/admin

- Usuário comum não deve ver botão **Painel administrativo** no header.
- Menu do usuário não deve mandar admin para `/admin/login`.
- Usuário comum não deve acessar `/admin`, `/admin/atividades`, `/admin/integridade` ou `/admin/solicitacoes-vinculos`.

### Relacionamentos

- Usuário comum não deve criar relacionamento real diretamente.
- Usuário comum não deve remover relacionamento real diretamente.
- Usuário comum não deve editar dados conjugais reais diretamente.
- `MeusVinculos` não deve mais fingir revisão apenas local sem backend.
- Alterações de vínculos por usuários não devem mudar a árvore real antes de aprovação.
- Migration permissiva de edição direta por membros não deve ser a política ativa.

### Genealogia/Visão Completa

- Não devem existir linhas diagonais entre pais e filhos.
- Filho único desalinhado não deve gerar diagonal.
- Cônjuges dos filhos não devem ser tratados como filhos reais.
- Não devem sobrar conectores, barramentos ou anéis soltos quando filtros ocultarem pessoas.
- A view **Minha Árvore** não deve ter sido alterada pelo layout de Genealogia.
- A view **Genealogia** não deve mostrar toda a base; deve usar o escopo pessoal.
- A view **Visão Completa** não deve filtrar pelo escopo pessoal; deve mostrar todos.

### Uploads/dados

- Novas fotos não devem ser salvas como base64 no banco.
- Novos arquivos históricos não devem ser salvos como base64 no banco.
- `activity_logs.metadata` não deve conter URL completa, base64, telefone, endereço ou e-mail.
- Arquivos antigos em base64 não devem ser apagados automaticamente.
- O campo **Lado** não deve aparecer na UI do formulário de pessoa.

### Histórico

- Edição de perfil do usuário não deve passar sem log.
- Alteração de notificações não deve passar sem log.
- Alteração de foto não deve passar sem log.
- Logs não devem falhar por RLS/SELECT após insert.
- Usuário comum não deve conseguir ver o histórico global.

### Integridade

- `/admin/integridade` não deve alterar dados.
- A tela nova não deve depender da Edge Function legada.
- Nenhuma correção automática deve ser executada nessa primeira versão.

---

## Pendências conhecidas

- Testar manualmente o modal do anel com admin e usuário comum.
- Testar upload de arquivo histórico de relacionamento e confirmar `relacionamento_id`.
- Verificar se upload abandonado no modal deixa objeto órfão no Storage.
- Refinar `/admin/integridade` com filtros por severidade quando a base crescer.
- Remover `lado` dos `changed_fields` do histórico para reduzir ruído.
- Implementar lazy loading de rotas admin e bibliotecas pesadas para reduzir bundle.
- Avaliar limpeza ou migração futura de arquivos antigos em base64 para Storage.