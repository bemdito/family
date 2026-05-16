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
- O formulário passou a preservar rascunhos de sessão para reduzir perda de dados durante navegação, preview de arquivos ou interações intermediárias.
- O rascunho de `/meus-dados` passou a preservar também arquivos históricos em edição.
- A área de redes sociais foi padronizada com editor reutilizável de perfis sociais.
- O usuário pode informar se nasceu fora do Brasil quando o campo estiver disponível.
- O campo de pessoa falecida pode ser tratado pela interface quando permitido pelo fluxo.

### Meus Vínculos

- Adições, remoções ou edições de vínculos feitas por usuário comum agora devem virar solicitações.
- Não deve mais haver gravação direta de relacionamento real por usuário comum.
- Não deve mais haver promessa de revisão sem que uma solicitação seja registrada no banco.
- O formulário passou a preservar rascunhos de sessão por usuário/pessoa.
- Dados conjugais editados por usuário comum devem seguir como solicitação de alteração, não alteração direta em `public.relacionamentos`.
- Observações internas de relacionamento conjugal não aparecem para usuário comum.
- Upload de arquivos históricos de casamento não foi liberado para usuário comum nesta etapa.

### Página de perfil da pessoa

- Arquivos históricos vinculados à pessoa devem aparecer no perfil.
- Arquivos históricos podem exibir também o ano, quando informado.
- Arquivos antigos em base64/data URL continuam compatíveis.
- Arquivos novos devem ser URLs do Storage.
- Eventos pessoais/históricos da pessoa agora podem aparecer no perfil quando cadastrados.
- Pessoas marcadas como falecidas podem ser tratadas como falecidas mesmo sem data/local de falecimento.
- Locais no exterior podem ser exibidos no formato `Cidade (País)` quando cadastrados dessa forma.
- A visualização de arquivos históricos passou a diferenciar imagem/PDF, com preview e download explícito.

---

## Formulários de pessoas e dados pessoais

### Adicionar/editar pessoa no admin

- O fluxo de `/admin/pessoas/nova` e `/admin/pessoas/:id/editar` foi estabilizado.
- O modal de adicionar relacionamento deixou de usar `ConfirmDialog` indevidamente.
- A inclusão de relacionamento pendente usa `Dialog`/painel adequado e não exibe confirmação intermediária desnecessária.
- O relacionamento pendente é salvo no banco apenas ao clicar no botão principal **Salvar**.
- O formulário de pessoa passou a preservar rascunho em `sessionStorage`.
- Chaves de rascunho usadas:
  - `admin-pessoa-form-draft:new`
  - `admin-pessoa-form-draft:edit:{id}`
- O rascunho preserva:
  - dados do formulário;
  - arquivos históricos;
  - relacionamentos pendentes;
  - busca e tipo/subtipo selecionados;
  - dados conjugais pendentes;
  - redes sociais;
  - eventos pessoais.
- O rascunho é removido ao salvar com sucesso.
- O rascunho é preservado ao cancelar navegação com alterações não salvas.
- O rascunho é descartado ao confirmar descarte explícito.
- O formulário foi refatorado em blocos reutilizáveis:
  - `PersonFormSection`
  - `PersonBasicInfoFields`
  - `PersonDatesLocationsFields`
  - `PersonBioFields`
  - `PersonContactFields`
  - `PersonPrivacyFields`
- A página pai continua responsável por:
  - rascunho;
  - validação final;
  - navegação;
  - salvamento;
  - eventos pessoais;
  - arquivos históricos;
  - relacionamentos pendentes/reais.

### Redes sociais

- Foi criado o componente reutilizável `SocialProfilesEditor`.
- `/meus-dados` e os formulários admin passaram a usar o mesmo modelo visual de redes sociais.
- O primeiro perfil social continua sincronizado com os campos legados:
  - `rede_social`
  - `instagram_usuario`
  - `instagram_url`, quando aplicável.
- Foram adicionados/reaproveitados helpers em `personFields.ts`:
  - `SocialProfileForm`
  - `createSocialProfile`
  - `buildSocialProfilesFromPerson`
  - `syncFirstSocialProfileToPersonFields`
- Não foi criada tabela nova de redes sociais nesta etapa.
- Persistência de múltiplas redes em tabela própria fica como possibilidade futura.

### Pessoa falecida

- Foi adicionado suporte a marcar pessoa como falecida sem exigir data ou local de falecimento.
- Existe campo booleano `falecido`.
- Uma pessoa é considerada falecida se:
  - `falecido` for verdadeiro;
  - ou houver `data_falecimento`;
  - ou houver `local_falecimento`.
- Foi criado/reaproveitado helper `isPersonDeceased`.
- O admin pode marcar **Pessoa falecida** no formulário.
- Preencher data/local de falecimento marca a pessoa como falecida automaticamente.
- Desmarcar o checkbox não apaga automaticamente data/local de falecimento.
- O dashboard, perfil, árvore, filtros e status conjugal passaram a considerar esse novo critério.
- Migration relacionada:
  - `20260514130000_add_falecido_to_pessoas.sql`

### Locais no exterior

- Campos de local de nascimento e local de falecimento passaram a aceitar modo exterior.
- Para locais no Brasil, o formato esperado continua:
  - `Cidade/UF`
- Para locais no exterior, o formato esperado é:
  - `Cidade (País)`
- Foram adicionados flags:
  - `local_nascimento_exterior`
  - `local_falecimento_exterior`
- Foram criados/ajustados helpers de normalização e validação para:
  - local brasileiro;
  - local internacional;
  - seleção por modo.
- `/admin/pessoas/nova` e `/admin/pessoas/:id/editar` exibem checkboxes e placeholders dinâmicos.
- `/meus-dados` passou a tratar nascimento fora do Brasil quando aplicável.
- `/meus-vinculos` recebeu suporte compatível no cadastro local de familiar, preservando o fluxo atual.
- Migration relacionada:
  - `20260514133000_add_exterior_location_flags_to_pessoas.sql`

### Busca sem acentuação

- Foi criado helper de normalização textual para buscas.
- Buscar `Marcio` deve encontrar `Márcio`.
- Buscar `Sao Paulo` deve encontrar `São Paulo`.
- A busca passou a ignorar acentuação e caixa.
- A normalização foi aplicada em:
  - `dataService.buscarPessoas`;
  - filtros de relacionamento em `AdminPessoaForm`;
  - `RelacionamentoManager`;
  - listagem `AdminPessoas`;
  - `AddConnectionModal`;
  - `MinhaArvore`;
  - `VincularPerfil`.
- Alguns filtros locais também passaram a considerar `local_atual` e `local_falecimento`, quando aplicável.

---

## Eventos pessoais/históricos da pessoa

### Estrutura de eventos pessoais

- Foi criada estrutura para eventos pessoais/históricos da pessoa.
- Migration relacionada:
  - `20260514165000_create_person_events.sql`
- Foi criada tabela `person_events`.
- A tabela possui:
  - índices;
  - trigger de `updated_at`;
  - RLS.
- Foram criados tipos:
  - `PersonEvent`
  - `PersonEventType`
- Foram adicionados logs de atividade para:
  - `person_event.added`
  - `person_event.updated`
  - `person_event.removed`
- Foi criado editor admin `PersonEventsEditor`.
- Foi criada lista de eventos no perfil `PersonEventsList`.
- `AdminPessoaForm` passou a:
  - carregar eventos;
  - preservar eventos em rascunho;
  - salvar eventos ao criar/editar pessoa.
- O serviço de eventos foi ajustado para evitar duplicação/perda na edição.
- Eventos com UUID real só são atualizados se já existirem para aquela pessoa.
- A localização de evento recém-criado foi normalizada para reduzir inconsistências.

### Escopo dos eventos pessoais

- Eventos pessoais suportam casos como:
  - imigração;
  - chegada ao Brasil;
  - mudança;
  - batismo;
  - formatura;
  - profissão;
  - serviço militar;
  - evento religioso;
  - memória;
  - outro.
- Não foi criada edição de eventos diretamente na timeline nesta etapa.
- Upload por evento e privacidade por evento ficam para evolução futura.

---

## Linha do tempo do usuário

### Tópico 7.3

- O tópico 7.3 — Linha do tempo do usuário foi implementado funcionalmente.
- A primeira versão é derivada dos dados existentes e não criou tabela nova.
- Não houve migration para a timeline.
- Não há persistência própria da timeline nesta etapa.
- Documentação detalhada:
  - `docs/TIMELINE.md`

### Builder da timeline

- Foi criado o utilitário:
  - `src/app/utils/buildPersonTimeline.ts`
- O service `src/app/services/dataService.ts` expõe `obterRelacionamentosDetalhadosDaPessoa` para carregar relacionamentos detalhados da pessoa sem buscar toda a tabela no perfil.
- O builder `buildPersonTimeline` é uma função pura.
- O builder não acessa Supabase.
- O builder não faz fetch.
- O builder recebe dados já carregados e retorna itens normalizados, deduplicados e ordenados.
- O parser de datas preserva precisão de dia, mês, ano ou data desconhecida.
- Ano puro permanece como ano, sem virar `01/01/AAAA`.
- Metadata sensível é sanitizada para não expor URLs completas, base64, telefone, endereço, e-mail, tokens, secrets ou keys sensíveis.

### Componente e integração

- Foi criado o componente:
  - `src/app/components/Timeline/PersonTimeline.tsx`
- O perfil da pessoa em `src/app/pages/PersonProfile.tsx` monta os itens com `buildPersonTimeline`.
- A timeline aparece no perfil depois do bloco de parentesco e antes de `PersonEventsList`.
- `PersonEventsList` foi mantido nesta etapa para preservar a visualização existente de eventos pessoais.

### Eventos suportados

- A timeline suporta:
  - nascimento;
  - falecimento com data;
  - falecimento informado sem data;
  - casamento;
  - união;
  - separação;
  - nascimento de filhos;
  - arquivos históricos da pessoa;
  - arquivos históricos de relacionamento conjugal;
  - eventos pessoais de `person_events`;
  - memórias;
  - eventos familiares globais, quando fornecidos futuramente ao builder.

### Dados carregados pelo perfil

- `PersonProfile` continua carregando pessoa, eventos pessoais, arquivos históricos da pessoa e relacionamentos agrupados.
- Para a timeline, o perfil carrega também relacionamentos detalhados da pessoa por `pessoa_origem_id` ou `pessoa_destino_id`.
- Arquivos históricos de relacionamentos conjugais são carregados por relacionamento relevante.
- Falhas nesse carregamento adicional não devem quebrar o perfil; a timeline renderiza com os dados disponíveis.
- A arquitetura completa, regras de datas, deduplicação, segurança e troubleshooting estão documentados em `docs/TIMELINE.md`.

### Limitações e evoluções futuras

- Não há edição manual de eventos na timeline.
- Não há upload por evento.
- Não há privacidade por evento.
- Não há exportação PDF da timeline.
- Não há integração com IA na timeline.
- Pode ser avaliada consolidação visual futura entre `PersonTimeline` e `PersonEventsList`.

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

## Relacionamentos conjugais e casamento

### Dados conjugais no admin

- Foi criado o componente `MarriageDetailsEditor`.
- O componente centraliza dados conjugais como:
  - data de casamento;
  - local de casamento;
  - relacionamento ativo;
  - data de separação;
  - local de separação;
  - observações internas;
  - arquivos históricos do relacionamento quando houver `relacionamento_id`.
- `/admin/pessoas/nova` permite preencher dados de casamento ao adicionar cônjuge pendente.
- Os dados conjugais pendentes são preservados no rascunho.
- Os dados conjugais pendentes entram no cálculo de alterações não salvas.
- Ao salvar nova pessoa com cônjuge, os dados conjugais são enviados junto ao relacionamento.
- `/admin/pessoas/:id/editar` permite editar dados conjugais existentes no `RelacionamentoManager`.
- Admin pode alterar:
  - data/local de casamento;
  - status ativo;
  - data/local de separação;
  - observações internas;
  - arquivos históricos do relacionamento.
- Arquivos históricos de casamento usam `relacionamento_id` e não `pessoa_id`.

### Dados conjugais em Meus Vínculos

- `/meus-vinculos` passou a usar o mesmo editor de dados conjugais com restrições.
- Usuário comum não vê observações internas.
- Usuário comum não faz upload de arquivos históricos de casamento.
- Alterações feitas por usuário comum seguem como solicitação de alteração de vínculo.
- Usuário comum não altera diretamente o relacionamento real.

---

## Admin geral

### Histórico técnico anterior a 13/05

- A rodada técnica de 09/05 consolidou o projeto em torno de React + TypeScript + Vite no frontend e Supabase para Auth, PostgreSQL, RLS, RPCs, Storage, fórum, calendário e Edge Functions.
- A autorização admin foi consolidada para depender de `profiles.role = 'admin'` via RPC `is_admin_user`, não de e-mail fixo no frontend.
- O fluxo de primeiro acesso usa Supabase Auth, `profiles`, `user_person_links` e RPCs de validação/vinculação.
- A modelagem oficial de arquivos históricos passou a ser relacional em `public.arquivos_historicos`; a coluna legada `public.pessoas.arquivos_historicos` foi mantida por segurança.
- A lógica de relacionamentos com inversos ficou centralizada em helpers do `dataService`, incluindo cônjuge, pai/mãe, filho e irmão.
- O histórico remoto de migrations foi reparado em 09/05 com `supabase migration repair --status applied` porque o dump indicava que os efeitos já estavam refletidos no banco remoto.
- Após esse repair, não havia necessidade de `supabase db push` naquela rodada.

### Dashboard administrativo

- O dashboard ganhou acesso para **Histórico de Atividades**.
- O dashboard ganhou acesso para **Solicitações de vínculos**.
- O dashboard ganhou acesso para **Integridade dos dados**.
- O dashboard ganhou acesso para **Notificações**.
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
- Filtros e contadores de falecidos passaram a considerar também o booleano `falecido`.

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
  - eventos pessoais adicionados/editados/removidos;
  - confirmação de primeiro acesso;
  - solicitações de vínculo;
  - notificações, quando aplicável.
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

## Fórum e Google Calendar

### Fórum familiar

- O schema do fórum foi versionado em migration própria.
- O fórum contempla categorias, tópicos, respostas, comentários, reações, denúncias e marcação de solução.
- A função `forum_is_admin()` foi consolidada para usar `public.is_admin_user(auth.uid())`.
- Objetos relevantes:
  - `forum_categorias`
  - `forum_topicos`
  - `forum_respostas`
  - `forum_comentarios`
  - `forum_reacoes`
  - `forum_denuncias`
  - `forum_increment_topic_view`
  - `forum_mark_solution`
- O fórum aparece como base existente/versionada, mas ainda exige QA manual de criação, edição, respostas, comentários, reações, solução e moderação.

### Google Calendar

- A integração com Google Calendar foi versionada em migration própria.
- Objetos relevantes:
  - `google_calendar_connections`
  - `google_calendar_oauth_states`
  - `google_calendar_synced_events`
  - view `google_calendar_connection_status`
- Tokens devem ficar restritos a Edge Functions/service role, sem exposição no frontend.
- OAuth, sincronização e proteção de tokens ainda exigem validação manual antes de considerar a frente estável.

---

## Notificações

### Status da frente 7.1

- A frente 7.1 Notificações foi consolidada para QA final.
- O escopo consolidado inclui `/notificacoes`, `/admin/notificacoes`, preferências por tipo e canal, notificações internas, logs de dispatch, deduplicação de recorrências, gatilhos internos, rotina manual de aniversários/memórias e Edge Functions de suporte.
- Ainda não deve ser considerada encerrada até concluir configuração real de secrets, ativação segura do cron e QA manual completo com usuário comum.

### Central de notificações do usuário

- Existe rota/página:
  - `/notificacoes`
- A página permite ao usuário:
  - visualizar notificações recentes;
  - marcar notificação como lida;
  - marcar todas como lidas;
  - remover notificações;
  - gerenciar preferências.
- Preferências disponíveis incluem:
  - aniversários;
  - datas de memória;
  - eventos;
  - avisos gerais;
  - email;
  - push;
  - WhatsApp;
  - novo usuário;
  - datas especiais;
  - novas mensagens no fórum;
  - novos registros históricos;
  - evento histórico da família.
- A lista interna continua visível mesmo com canais externos desligados.
- Alterações de preferências são registradas no histórico.

### Painel admin de notificações

- Existe rota administrativa:
  - `/admin/notificacoes`
- A rota é protegida.
- Usuário comum não deve acessar.
- O dashboard administrativo ganhou atalho para **Notificações**.
- O painel admin mostra:
  - cards de resumo;
  - notificações recentes;
  - preferências de usuários;
  - diagnóstico de e-mail;
  - logs de dispatch;
  - status da rotina manual de aniversários/memórias, quando disponível.
- O painel tem botão de teste interno para admin.
- O teste interno cria notificação interna para o próprio admin.
- O teste interno não envia e-mail real.

### Dispatch central de notificações

- Foi criado serviço central de dispatch de notificações.
- O dispatch diferencia canais:
  - `interna`;
  - `email`;
  - `push`;
  - `whatsapp`.
- O canal interno cria registro em `notificacoes_usuario`.
- O canal email pode delegar para a Edge Function `send-notification-email`.
- A Edge Function `send-notification-email` foi revisada com Resend e teste admin controlado.
- Se `RESEND_API_KEY` ou `NOTIFICATION_EMAIL_FROM` estiverem ausentes, o e-mail retorna `not_configured`.
- Push e WhatsApp ficam como `not_configured`/`skipped` nesta etapa.
- O dispatch respeita preferências do usuário.
- Falha em um canal não deve impedir os demais.
- Falha de e-mail não deve impedir a criação de notificação interna.
- Metadata de notificações/logs deve ser sanitizada.
- Não deve conter:
  - senha;
  - token;
  - e-mail completo;
  - telefone;
  - endereço completo;
  - URL completa de arquivo;
  - base64.

### Logs de dispatch

- Foi criada estrutura de logs de dispatch.
- Migrations relacionadas:
  - `20260514190000_create_notification_dispatch_logs.sql`
  - `20260514193000_allow_own_notification_dispatch_log_insert.sql`
- Logs registram status por canal, como:
  - `pending`;
  - `sent`;
  - `failed`;
  - `skipped`;
  - `disabled_by_preferences`;
  - `missing_destination`;
  - `not_configured`.
- Logs podem ser visualizados pelo admin em `/admin/notificacoes`.

### Gatilhos reais internos

- Foram criados serviços de destinatários e gatilhos de notificação:
  - `notificationRecipientsService`
  - `notificationTriggersService`
- Foram implementados gatilhos internos para:
  - novos arquivos históricos;
  - novo vínculo/primeiro acesso confirmado;
  - novas respostas no fórum;
  - novos comentários no fórum.
- Arquivos históricos disparam notificação interna ao inserir novo registro.
- Novo vínculo/primeiro acesso confirmado pode notificar admins.
- Fórum pode notificar autor/participantes relevantes.
- O autor da ação não deve receber notificação duplicada de si mesmo, quando o ator for identificável.
- Falha de notificação não deve impedir a ação principal.
- Migrations relacionadas:
  - `20260514200000_create_notification_recipient_helpers.sql`
  - `20260514201000_create_notification_dispatch_rpc.sql`

### Aniversários e datas de memória

- Foi criada rotina manual para verificar aniversários e datas de memória.
- O painel `/admin/notificacoes` possui botão para executar a rotina manualmente.
- A rotina usa:
  - `notificationScheduledService`
  - `notificationDateRules`
- A rotina considera:
  - aniversários;
  - datas de memória/falecimento.
- A rotina usa apenas canal interno nesta etapa.
- A rotina respeita preferências:
  - `receber_aniversarios`;
  - `receber_datas_memoria`.
- Foi criada tabela de ocorrências para deduplicação.
- Migration relacionada:
  - `20260514203000_create_notification_occurrences.sql`
- A deduplicação usa `occurrence_key` estável no padrão:
  - `tipo:YYYY-MM-DD:userId:pessoaId`
- A ocorrência é reservada antes do dispatch com status `pending`.
- Depois do dispatch, a ocorrência é atualizada para:
  - `sent`;
  - `failed`;
  - `skipped`.
- Rodar a rotina duas vezes no mesmo dia não deve duplicar notificações.
- A rotina não quebra por inteiro se um candidato falhar.
- O resumo da execução informa:
  - criadas;
  - duplicadas/ignoradas;
  - sem destinatário;
  - falhas.

### Email real, Edge Function e QA final

- A Edge Function `send-notification-email` foi revisada com Resend e teste admin controlado.
- A Edge Function `run-daily-notifications` foi preparada e deployada para suportar a rotina diária.
- O recebimento real de e-mail ainda depende de secrets reais do Resend configurados no projeto remoto e de confirmação em QA admin.
- A ativação automática da rotina diária ainda depende de `pg_cron` com segredo armazenado fora do repositório.
- O painel não consegue verificar secrets do provider pelo frontend; a validação real depende de teste controlado.
- Push real e WhatsApp real não foram implementados nesta rodada.
- Na rodada de consolidação foram registrados como testados:
  - build de produção;
  - `git diff --check`;
  - `supabase db push`;
  - deploy das Edge Functions;
  - abertura de `/admin/notificacoes` em rodada anterior da mesma frente;
  - execução manual de aniversários/memórias em ambiente sem candidatos no dia.
- QA final da frente de notificações ainda precisa validar:
  - `/notificacoes`;
  - `/admin/notificacoes`;
  - preferências;
  - logs;
  - gatilhos internos;
  - aniversários/memórias;
  - Edge Function/agendamento, se implementado;
  - e-mail real, se implementado.

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
- Admin pode adicionar arquivos históricos ao relacionamento pelo modal do anel e pela edição admin quando o relacionamento existe.
- Usuário comum apenas visualiza arquivos históricos de relacionamento.
- Novos uploads de relacionamento usam paths de Storage por relacionamento.
- Arquivos de relacionamento devem usar `relacionamento_id` preenchido e `pessoa_id` nulo.

### Preview e download

- Arquivos históricos passaram a ter visualização aprimorada.
- Cards de imagem exibem miniatura real.
- Cards de PDF exibem identificação visual de PDF.
- As ações disponíveis incluem:
  - visualizar;
  - baixar arquivo;
  - abrir.
- O modal de preview:
  - usa o título do arquivo;
  - exibe imagem responsiva;
  - exibe PDF em `iframe`;
  - possui ações explícitas de download, abrir em nova aba e fechar.
- Preview/download/nova aba não devem chamar `onChange`.
- Botões internos devem usar `type="button"` para evitar submit acidental.
- Download deve ser ação explícita; preview não deve baixar automaticamente.

---

## Banco, RLS e segurança

### Migrations e histórico remoto

- Migrations antigas relevantes existentes no repositório:
  - `20260509100000_add_forum_schema.sql`
  - `20260509100100_add_google_calendar_schema.sql`
  - `20260509100200_enable_rls_core_family_tables.sql`
  - `20260509100300_use_profile_role_for_forum_admin.sql`
  - `20260509100400_remove_legacy_public_core_policies.sql`
  - `20260509100500_migrate_legacy_pessoas_arquivos_historicos.sql`
  - `20260509100600_remove_legacy_relacionamentos_policies.sql`
  - `20260509100700_align_relacionamentos_schema.sql`
  - `20260509100800_version_pessoa_social_profiles.sql`
- Essas migrations documentam a base antiga de fórum, Google Calendar, RLS core, remoção de policies permissivas, migração de arquivos históricos legados, alinhamento de relacionamentos e versionamento de `pessoa_social_profiles`.
- O histórico remoto foi alinhado por repair em 09/05 porque o dump indicava efeitos já aplicados no banco remoto.
- `supabase db push` não foi necessário naquela rodada e não deve ser usado sem revisar `supabase migration list`.

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
- Novas ações adicionadas contemplam eventos pessoais e notificações quando aplicável.

### Storage

- Buckets `person-avatars` e `historical-files` foram criados/configurados.
- Escrita fica restrita a usuários autenticados conforme policies.
- Deleção de arquivos no Storage fica restrita a admin.

### Objetos legados e compatibilidade

- `public.pessoa_social_profiles` foi versionada com RLS/policies, mas o frontend atual ainda sincroniza a primeira rede social com campos diretos em `public.pessoas`.
- `public.imagens_pessoa` aparece como legado/migrations-only, sem uso runtime confirmado e sem criação nova nesta etapa.
- `public.pessoas_com_estatisticas` foi identificada como view remota legada sem uso runtime atual; não foi versionada nesta etapa.
- `public.pessoas.arquivos_historicos` foi mantida como coluna legada até validação administrativa e visual completa.
- Dumps de schema devem permanecer ignorados pelo Git e não devem ser commitados.

### Notificações

- Tabelas de notificações/preferências/logs seguem com RLS.
- Usuário comum não deve ler logs globais de dispatch.
- Admin pode visualizar diagnóstico e logs em `/admin/notificacoes`.
- RPCs de notificação foram usadas para permitir criação segura de notificação/log para destinatários sem abrir escrita ampla nas tabelas.
- Secrets de e-mail e service role não devem aparecer no frontend.

---

## O que não deve mais existir/acontecer

### Acesso/admin

- Usuário comum não deve ver botão **Painel administrativo** no header.
- Menu do usuário não deve mandar admin para `/admin/login`.
- Usuário comum não deve acessar `/admin`, `/admin/atividades`, `/admin/integridade`, `/admin/solicitacoes-vinculos` ou `/admin/notificacoes`.

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
- Metadata de notificações e dispatch logs também não deve conter dados sensíveis.
- Arquivos antigos em base64 não devem ser apagados automaticamente.
- O campo **Lado** não deve aparecer na UI do formulário de pessoa.

### Histórico

- Edição de perfil do usuário não deve passar sem log.
- Alteração de notificações não deve passar sem log.
- Alteração de foto não deve passar sem log.
- Logs não devem falhar por RLS/SELECT após insert.
- Usuário comum não deve conseguir ver o histórico global.
- Usuário comum não deve conseguir ver logs globais de notificações.

### Integridade

- `/admin/integridade` não deve alterar dados.
- A tela nova não deve depender da Edge Function legada.
- Nenhuma correção automática deve ser executada nessa primeira versão.

### Notificações

- A página `/notificacoes` não deve quebrar quando não houver notificações.
- O painel `/admin/notificacoes` não deve enviar e-mail real automaticamente.
- Testes internos não devem disparar e-mail real.
- Push e WhatsApp não devem fingir envio real; devem ser marcados como `not_configured`/`skipped` enquanto não houver infraestrutura.
- Rotina de aniversários/memórias não deve duplicar notificações ao ser executada mais de uma vez.
- Rotina de aniversários/memórias não deve ser executada automaticamente ao abrir o painel admin.
- E-mail real não deve ser ativado sem provider, secrets e teste controlado.
- O frontend não deve afirmar que secrets do provider existem; essa validação depende de teste controlado da Edge Function.
- Ausência de `RESEND_API_KEY` ou `NOTIFICATION_EMAIL_FROM` deve resultar em `not_configured`, não em falso sucesso.

---

## Pendências conhecidas

### Validação manual

- Testar manualmente o modal do anel com admin e usuário comum.
- Testar upload de arquivo histórico de relacionamento e confirmar `relacionamento_id`.
- Testar preview/download com arquivo real de imagem.
- Testar preview/download com arquivo real de PDF.
- Confirmar que usuário comum não consegue adicionar arquivo histórico de relacionamento.
- Confirmar que observações conjugais aparecem apenas para admin.
- Confirmar que `/admin/integridade` não altera dados.
- Confirmar que `/admin/solicitacoes-vinculos` aprova/rejeita corretamente.
- Confirmar que `/admin/atividades` lista logs recentes corretamente.
- Testar fluxo completo de notificações por upload histórico via UI.
- Testar fluxo completo de notificações por fórum via UI.
- Testar fluxo completo de notificação por novo vínculo/primeiro acesso.
- Testar aniversários/memórias com pessoa de data correspondente ao dia.
- Confirmar deduplicação real em `notification_occurrences`.
- Validar `/admin/notificacoes` com base maior de logs.
- Confirmar recebimento real de e-mail no admin QA após configurar secrets reais do Resend.
- Executar QA manual completo de notificações com usuário comum.
- Validar limpeza de notificações reais criadas em testes QA.

### Notificações

- Ativar `pg_cron` para `run-daily-notifications` com segredo armazenado fora do repositório.
- Configurar secrets reais do Resend no projeto remoto.
- Confirmar recebimento real de e-mail via `send-notification-email` em teste admin controlado.
- Executar QA final da frente 7.1 Notificações.
- Limpar notificações/logs de teste somente após confirmação.
- Documentar arquitetura de notificações em arquivo próprio.
- Push real e WhatsApp real permanecem como futuras implementações.

### WhatsApp no perfil

- O tópico 7.4 ainda não está totalmente concluído.
- A etapa 7.4B criou a base técnica/helper centralizado:
  - `src/app/utils/whatsapp.ts`
- O helper centraliza:
  - normalização de telefone para `wa.me`;
  - validação de telefone;
  - montagem de URL `https://wa.me/NUMERO`;
  - regra visual de uso do contato por WhatsApp.
- A regra visual centralizada exige telefone válido e:
  - `permitir_exibir_telefone = true`;
  - ou `permitir_mensagens_whatsapp = true`.
- O perfil passou a usar essa regra centralizada sem redesenho visual.
- Ainda falta componente visual final/botão dedicado.
- Não houve migration.
- Não houve alteração de RLS.
- Não houve WhatsApp Business API.
- Não houve envio automático de mensagem.
- Não houve log de clique nesta etapa.
- Privacidade forte em nível de banco/API permanece como possível evolução futura.

### Técnicas

- Verificar se upload abandonado no modal deixa objeto órfão no Storage.
- Criar controle para evitar uploads órfãos no Storage.
- Refinar `/admin/integridade` com filtros por severidade quando a base crescer.
- Remover `lado` dos `changed_fields` do histórico para reduzir ruído.
- Implementar lazy loading de rotas admin e bibliotecas pesadas para reduzir bundle.
- Avaliar limpeza ou migração futura de arquivos antigos em base64 para Storage.
- Avaliar persistência futura de múltiplas redes sociais em tabela própria.
- Avaliar upload por evento pessoal.
- Avaliar privacidade por evento pessoal.
- Avaliar exportação PDF de eventos/timeline.
- Avaliar edição manual de eventos da timeline.
- Avaliar consolidação visual futura entre `PersonTimeline` e `PersonEventsList`.

### Ainda não implementado nesta etapa

- Tópico 7.2 — Astrologia e acontecimentos do nascimento.
- Tópico 7.4 — Entrar em contato por WhatsApp, exceto helper/base técnica 7.4B.
- Tópico 7.5 — Grau de parentesco/vínculo.
- Tópico 7.6 — Selecionar área para PDF/impressão.
- Tópico 7.7 — Legendas visuais da árvore.
- Tópico 7.8 — Favoritos em todo o site.
- Tópico 7.9 — Página de favoritos.
- Tópico 7.10 — Responsividade/mobile.

## Referência com o plano 7.x

Esta seção relaciona o guia de implementações com os tópicos do plano de próximas implementações. O guia não está organizado originalmente por 7.1, 7.2, 7.3 etc.; por isso, os tópicos abaixo funcionam como referência cruzada.

| Tópico | Status no guia de implementações | Onde aparece neste guia |
|---|---|---|
| 7.1 Notificações | Parcialmente implementado / consolidado para QA final | Seção "Notificações" |
| 7.2 Astrologia e acontecimentos do nascimento | Não implementado | Ainda não há seção de implementação |
| 7.3 Linha do tempo do usuário | Implementado funcionalmente; evoluções futuras em backlog | Seção "Linha do tempo do usuário" |
| 7.4 WhatsApp | Parcial: helper/base técnica 7.4B implementada; botão final pendente | Seção "WhatsApp no perfil" |
| 7.5 Grau de parentesco/vínculo | Não implementado | Ainda não há seção de implementação |
| 7.6 PDF/impressão por área | Não implementado | Ainda não há seção de implementação |
| 7.7 Legendas visuais da árvore | Não implementado | Ainda não há seção de implementação |
| 7.8 Favoritos em todo o site | Não implementado nesta rodada | Ver eventuais bases de favoritos, se documentadas |
| 7.9 Página de favoritos | Não implementado nesta rodada | Ver eventuais bases de favoritos, se documentadas |
| 7.10 Responsividade/mobile | Não implementado nesta rodada | Ainda não há seção de implementação |
