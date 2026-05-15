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

## Notificações

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
- O canal email pode delegar para Edge Function, mas envio real ficou para etapa posterior.
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

- A etapa de e-mail real foi planejada para usar Edge Function `send-notification-email`.
- O envio real de e-mail não foi confirmado como implementado até esta atualização.
- A etapa de Edge Function/agendamento diário foi planejada para `run-daily-notifications`.
- A confirmação de implementação do agendamento automático ainda depende de validação posterior.
- Push real e WhatsApp real não foram implementados nesta rodada.
- QA final da frente de notificações foi planejado para validar:
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
- Validar limpeza de notificações reais criadas em testes QA.

### Notificações

- Implementar ou confirmar Edge Function/agendamento diário `run-daily-notifications`.
- Implementar ou confirmar envio real de e-mail via `send-notification-email`.
- Configurar provider de e-mail, se o envio real for ativado.
- Registrar e documentar secrets necessários para e-mail.
- Executar QA final da frente de notificações.
- Documentar arquitetura de notificações em arquivo próprio.
- Push real e WhatsApp real permanecem como futuras implementações.

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

### Ainda não implementado nesta etapa

- Tópico 7.2 — Astrologia e acontecimentos do nascimento.
- Tópico 7.3 — Linha do tempo do usuário.
- Tópico 7.4 — Entrar em contato por WhatsApp.
- Tópico 7.5 — Grau de parentesco/vínculo.
- Tópico 7.6 — Selecionar área para PDF/impressão.
- Tópico 7.7 — Legendas visuais da árvore.
- Tópico 7.8 — Favoritos em todo o site.
- Tópico 7.9 — Página de favoritos.
- Tópico 7.10 — Responsividade/mobile.