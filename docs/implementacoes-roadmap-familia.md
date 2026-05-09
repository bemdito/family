# Implementações e roadmap do produto

## 1. Consolidar fluxo de usuário
### Objetivo
Estabilizar o fluxo principal de acesso ao site, desde o primeiro cadastro até a liberação da árvore genealógica.
### Funcionalidades
- Login em /entrar.
- Primeiro acesso com código.
- Confirmação de e-mail.
- Redirecionamento para /meus-dados.
- Redirecionamento posterior para /meus-vinculos.
- Liberação da árvore apenas após confirmação final.
- Reenvio de e-mail de confirmação.
- Recuperação de senha.
### Sugestões
- Criar uma tela ou estado claro para “cadastro pendente”.
- Validar o fluxo com usuários reais.
- Criar mensagens específicas para:
- e-mail não confirmado;
- código já usado;
- usuário sem vínculo;
- usuário já confirmado.
- Garantir que usuários pendentes não acessem a árvore diretamente.
- Garantir que usuários já confirmados não entrem em loop entre /meus-dados e /meus-vinculos.

## 2. Refinar /meus-dados
### Objetivo
Transformar /meus-dados em uma etapa estável e limpa para revisão e edição dos dados pessoais da pessoa vinculada ao usuário.
### Funcionalidades
- Nome completo.
- Data de nascimento.
- Signo automático.
- Local de nascimento.
- Residência atual.
- Telefone.
- Endereço com Google Places.
- Complemento.
- Rede social.
- Perfil da rede social.
- Mini bio.
- Curiosidades.
- Upload/crop de foto.
- Toggles de privacidade:
- exibir rede social no perfil;
- permitir mensagens por WhatsApp.
### Sugestões
- Confirmar se os toggles estão persistindo corretamente.
- Decidir se complemento será salvo no banco ou ficará apenas visual.
- Padronizar os campos sociais, evitando dependência do nome antigo instagram_usuario.
- Validar upload/crop com usuário real.
- Garantir que o signo apareça também no perfil público /pessoa/:id.
- Remover textos auxiliares desnecessários, mantendo a tela mais limpa.

## 3. Refinar /meus-vinculos
### Objetivo
Usar /meus-vinculos como etapa final do primeiro acesso, permitindo ao usuário revisar vínculos familiares e arquivos históricos antes de acessar a árvore.
### Funcionalidades
- Exibição de relacionamentos.
- Agrupamento por:
- pais;
- filhos;
- cônjuge;
- irmãos.
- Exibição de arquivos históricos.
- Confirmação final do fluxo.
- Marcação de dados_confirmados.
- Redirecionamento para a árvore.
### Sugestões
- Manter a tela focada na área Relacionamentos.
- Permitir edição/correção diretamente dentro dos relacionamentos listados.
- Remover formulários separados de “adicionar ou corrigir relacionamento”.
- Evitar duplicidade de relações.
- Validar relações inversas.
- Definir se usuário comum poderá editar diretamente ou apenas sugerir alterações.
- Melhorar UX dos arquivos históricos.
- Decidir se arquivos históricos continuarão em JSON ou migrarão para Storage/tabela própria.

## 4. Unificar edição entre páginas
### Objetivo
Fazer com que /meus-dados, /meus-vinculos, /pessoa/:id e /admin/pessoas/:id usem a mesma estrutura de dados, campos, validações e componentes.
### Funcionalidades
- Visualização dos dados por todos os usuários autenticados.
- Edição apenas por:
- própria pessoa;
- admin principal tuliust@gmail.com.
- Campos comuns entre páginas.
- Componentes reutilizáveis.
- Validações centralizadas.
- Regras de permissão consistentes.
### Sugestões
- Criar componentes como:
- PersonDataForm;
- PersonDataView;
- PersonRelationshipEditor;
- PersonHistoricalFilesSection;
- PersonAvatarEditor.
- Criar função canEditPerson.
- Centralizar validações em utilitário, por exemplo:
- personFields.ts.
- Impedir qualquer edição baseada apenas no frontend.
- Revisar RLS/policies no Supabase.
- Nunca exibir ou salvar senha em tabelas públicas.

## 5. Melhorar perfil /pessoa/:id
### Objetivo
Transformar a página de perfil em uma visualização completa, rápida e organizada de cada pessoa da família.
### Funcionalidades
- Exibição dos dados pessoais.
- Foto.
- Signo.
- Mini bio.
- Curiosidades.
- Locais.
- Relações familiares.
- Arquivos históricos.
- Rede social, conforme permissão.
- WhatsApp/telefone, conforme permissão.
- Edição quando for a própria pessoa ou admin.
### Sugestões
- Manter carregamento otimizado.
- Buscar primeiro apenas os dados básicos da pessoa.
- Carregar relacionamentos e arquivos em seguida.
- Evitar buscar toda a árvore.
- Remover botões desnecessários.
- Criar modo leitura e modo edição.
- Exibir estado de carregamento leve.

## 6. Finalizar view “Minha Árvore”
### Objetivo
Refinar a principal visualização genealógica personalizada do usuário.
### Funcionalidades
- Card principal.
- Ramos paterno e materno.
- Grupos:
- tataravós;
- bisavós;
- avós;
- pai/mãe;
- tios;
- primos;
- irmãos;
- sobrinhos;
- cônjuge;
- filhos.
- Linhas de conexão.
- Labels de grupo.
- Group boxes.
- Minimap.
- Zoom/pan.
- Filtros por relação.
### Sugestões
- Título “Linha Genealógica de Tulius” em fonte 3XL.
- Melhorar posicionamento do título.
- Impedir qualquer sobreposição entre linhas, cards e labels.
- Ajustar conexões entre pai, mãe e card principal.
- Permitir que conexões entrem mais abaixo no card principal.
- Distribuir os grupos verticalmente de forma mais uniforme.
- Não exigir alinhamento horizontal perfeito entre lado esquerdo e direito.
- Fazer os cards ocuparem melhor a área útil da tela.
- Garantir que o zoom inicial continue legível.

## 7. Segurança e privacidade
### Objetivo
Garantir que os dados pessoais da família fiquem protegidos antes de ampliar o uso real do site.
### Funcionalidades
- Controle de edição por usuário.
- Controle de edição por admin.
- Proteção de dados sensíveis.
- Policies no Supabase.
- Proteção de buckets de Storage.
- Privacidade de telefone, endereço, WhatsApp e rede social.
### Sugestões
- Endurecer policies do bucket person-avatars.
- Revisar policies de:
- pessoas;
- relacionamentos;
- arquivos_historicos;
- profiles;
- vínculos usuário-pessoa.
- Garantir que usuário comum só edite sua própria pessoa.
- Garantir que admin principal edite todos.
- Evitar policies recursivas.
- Não armazenar senha fora do Supabase Auth.
- Criar regras específicas para telefone e WhatsApp.

## 8. OpenAI / Pergunte à IA
### Objetivo
Conectar a OpenAI ao site para criar um assistente inteligente da árvore genealógica.
### Funcionalidades
- Botão “Pergunte à IA”.
- Modal de pergunta.
- Rota segura /api/ai.
- Integração com OpenAI via Vercel Serverless Function.
- Resposta em português.
- Futuramente: respostas baseadas nos dados reais da árvore.
### Sugestões
- Nunca expor a chave no frontend.
- Usar OPENAI_API_KEY, sem prefixo VITE_.
- Criar api/ai.ts.
- Instalar SDK openai.
- Começar com respostas simples.
- Depois integrar Supabase gradualmente.
- Não enviar o banco inteiro para a OpenAI.
- Criar antes uma camada determinística de parentesco.
- Usar contexto resumido e controlado.

## 9. Parentesco inteligente
### Objetivo
Criar uma camada lógica capaz de identificar automaticamente relações familiares.
### Funcionalidades
- Identificar:
- pai;
- mãe;
- filho;
- irmão;
- avô;
- bisavô;
- tio;
- primo;
- sobrinho;
- cônjuge.
- Responder perguntas como:
- “qual é minha relação com essa pessoa?”;
- “ele é meu primo de qual grau?”;
- “quem são meus tios-avós?”;
- “quais parentes são do lado materno?”;
- “quantos primos eu tenho?”.
### Sugestões
- Criar algoritmo próprio de parentesco.
- Padronizar relações no banco.
- Resolver relações inversas.
- Diferenciar:
- sangue;
- adoção;
- cônjuge;
- afinidade.
- Criar funções reutilizáveis para:
- árvore;
- perfil;
- IA;
- filtros.

## 10. Calendário familiar
### Objetivo
Centralizar aniversários, datas de falecimento, memórias e eventos familiares.
### Funcionalidades
- Calendário mensal.
- Aniversariantes do dia.
- Aniversariantes do mês.
- Datas de falecimento.
- Datas de memória.
- Próximos aniversários.
- Eventos familiares.
- Homenagens.
### Sugestões
- Criar componente visual mensal.
- Calcular idade automaticamente.
- Calcular tempo desde falecimento.
- Separar aniversário de data de memória.
- Permitir filtro por:
- família direta;
- favoritos;
- ramo materno;
- ramo paterno.
- Integrar depois com Google Agenda.

## 11. Integração com Google Agenda
### Objetivo
Permitir que o usuário adicione aniversários e eventos familiares ao próprio calendário.
### Funcionalidades
- Exportar aniversários.
- Criar evento recorrente anual.
- Adicionar pessoas específicas.
- Adicionar grupos:
- família direta;
- primos;
- tios;
- favoritos.
- Incluir link para perfil.
- Incluir grau de parentesco.
### Sugestões
- Começar com exportação .ics.
- Depois avaliar Google Calendar API.
- Permitir exportação seletiva.
- Evitar criar eventos duplicados.
- Criar identificação única para eventos exportados.

## 12. Curiosidades e estatísticas
### Objetivo
Transformar os dados da árvore em insights automáticos sobre a família.
### Funcionalidades
- Sobrenome mais comum.
- Mês com mais aniversários.
- Cidade mais recorrente.
- Pessoa mais velha.
- Pessoa mais nova.
- Número de gerações.
- Distribuição por décadas.
- Quantidade de primos, tios, netos.
- Cards “Você sabia?”.
### Sugestões
- Padronizar datas.
- Padronizar cidades.
- Padronizar sobrenomes.
- Criar queries específicas.
- Criar painel de estatísticas.
- Exibir cards na home.
- Integrar depois com IA.

## 13. Mural / fórum familiar
### Objetivo
Criar uma área social para interação entre familiares.
### Funcionalidades
- Tópicos.
- Comentários.
- Respostas.
- Curtidas ou reações.
- Fotos antigas.
- Histórias.
- Avisos.
- Eventos.
- Moderação.
### Sugestões
- Criar banco próprio para posts e comentários.
- Implementar moderação antes da publicação.
- Permitir anexos.
- Permitir marcação de pessoas.
- Criar notificações de resposta.
- Evitar exposição pública de conteúdo familiar.

## 14. Fotos, documentos e acervo histórico
### Objetivo
Criar um acervo digital organizado da história da família.
### Funcionalidades
- Álbuns por ramo.
- Fotos por década.
- Certidões.
- Cartas.
- Recortes de jornal.
- Receitas.
- Documentos de imigração.
- Diplomas.
- Associação de arquivos a pessoas.
### Sugestões
- Criar bucket de Storage específico.
- Criar tabela estruturada para arquivos.
- Criar policies de acesso.
- Permitir preview.
- Permitir tags.
- Permitir associação a:
- pessoa;
- evento;
- ramo;
- década;
- local.
- Migrar JSON atual quando houver estrutura definitiva.

## 15. Linha do tempo e modo história
### Objetivo
Criar uma experiência editorial da história da família, como um mini museu digital.
### Funcionalidades
- Linha do tempo cronológica.
- Nascimentos.
- Casamentos.
- Falecimentos.
- Mudanças de cidade ou país.
- Formaturas.
- Profissões marcantes.
- Fotos por época.
- Modo história.
- Página de homenagens.
### Sugestões
- Criar estrutura de eventos familiares.
- Separar eventos automáticos de textos editoriais.
- Permitir curadoria manual.
- Conectar eventos com fotos e documentos.
- Criar navegação por décadas.
- Criar páginas especiais para pessoas falecidas.

## 16. Mapa da família
### Objetivo
Visualizar a geografia da família e seus deslocamentos ao longo do tempo.
### Funcionalidades
- Cidades de nascimento.
- Cidades atuais.
- Lugares onde pessoas viveram.
- Países ligados à história da família.
- Fluxos migratórios.
- Filtros por ramo.
### Sugestões
- Normalizar nomes de cidades.
- Geocodificar locais.
- Usar mapa com agrupamento de pontos.
- Diferenciar nascimento, residência atual e local histórico.
- Criar visualização de concentração familiar.
- Integrar com dados do perfil.

## 17. Colaboração moderada
### Objetivo
Permitir que familiares ajudem a corrigir e enriquecer a árvore, sem comprometer a qualidade dos dados.
### Funcionalidades
- Sugerir correção de nome.
- Enviar foto.
- Adicionar data.
- Contar história.
- Sugerir documento.
- Corrigir relacionamento.
- Aprovação por admin.
- Histórico de alterações.
### Sugestões
- Criar tabela de sugestões.
- Criar painel de moderação.
- Não aplicar mudanças automaticamente.
- Notificar admin.
- Registrar quem sugeriu.
- Registrar quando foi aprovado ou rejeitado.
- Permitir comentários do admin.

## 18. Home dinâmica
### Objetivo
Transformar a página inicial em um painel vivo da família.
### Funcionalidades
- Aniversariantes de hoje.
- Lembranças do dia.
- Fatos históricos.
- Curiosidade automática.
- Novos arquivos.
- Novos tópicos.
- Próximos eventos.
- Cards personalizados.
### Sugestões
- Criar blocos modulares.
- Integrar calendário.
- Integrar curiosidades.
- Integrar arquivos recentes.
- Respeitar privacidade dos dados.
- Mostrar apenas informações relevantes para o usuário logado.

## 19. Botão de Imprimir
### Objetivo
Permitir que o usuário imprima páginas importantes do site em formato limpo e legível.
### Funcionalidades
- Botão “Imprimir”.
- Disponível em páginas como:
- /pessoa/:id;
- “Minha Árvore”;
- calendário familiar;
- linha do tempo;
- página de homenagens.
- Versão otimizada para impressão.
- Ocultar elementos de interface:
- header;
- sidebar;
- botões;
- filtros;
- menus;
- notificações.
### Sugestões
- Criar CSS específico com @media print.
- Criar classe utilitária, por exemplo:
- print:hidden;
- print:block;
- print:shadow-none.
- No perfil da pessoa, imprimir:
- nome;
- foto;
- datas;
- locais;
- mini bio;
- parentes principais;
- arquivos/documentos listados.
- Na árvore, avaliar impressão em modo simplificado para evitar corte.
- Usar window.print() no botão.

## 20. Botão “Salvar como PDF”
### Objetivo
Permitir que o usuário gere um PDF de páginas importantes do site.
### Funcionalidades
- Botão “Salvar como PDF”.
- Geração de PDF para:
- perfil da pessoa;
- árvore personalizada;
- calendário familiar;
- linha do tempo;
- homenagens;
- acervo/documentos.
- Layout limpo para exportação.
- Nome automático do arquivo.
### Sugestões
- Primeira versão: usar o próprio fluxo de impressão do navegador:
- botão chama window.print();
- usuário escolhe “Salvar como PDF”.
- Segunda versão: criar geração real com biblioteca ou backend.
- Para perfis, sugerir nome:
- perfil-nome-da-pessoa.pdf.
- Para árvore:
- linha-genealogica-de-tulius.pdf.
- Criar um modo print/pdf separado da tela normal.
- Evitar exportar dados sensíveis sem permissão.
- Em páginas com muita largura, criar versão vertical simplificada.

## 21. Recuperação de senha
### Objetivo
Permitir que usuários recuperem acesso à conta de forma segura.
### Funcionalidades
- Link “Esqueci minha senha” em /entrar.
- Envio de e-mail de recuperação.
- Template visual seguindo identidade do site.
- Redirecionamento seguro.
- Tela para criar nova senha, se necessário.
### Sugestões
- Usar Supabase Auth.
- Não armazenar senha no banco público.
- Não exibir senha em nenhuma tela.
- Usar resetPasswordForEmail.
- Definir redirectTo com window.location.origin.
- Criar rota /redefinir-senha se o fluxo exigir.
- Validar mensagens de erro amigáveis.

## 22. Confirmação e alteração de e-mail
### Objetivo
Manter o fluxo de e-mail confiável, claro e com identidade visual consistente.
### Funcionalidades
- Confirmação de cadastro.
- Reenvio de confirmação.
- Confirmação de alteração de e-mail.
- Templates em português.
- Redirecionamento correto após clique.
- Integração Supabase + Resend.
### Sugestões
- Manter {{ .ConfirmationURL }} nos templates.
- Não substituir por URL manual.
- Configurar corretamente:
- Site URL;
- Redirect URLs;
- SMTP;
- domínio verificado no Resend.
- Usar e-mails de teste com +teste.
- Monitorar logs do Resend.
- Verificar status:
- sent;
- delivered;
- bounced;
- failed;
- blocked.

## 23. Administração de pessoas
### Objetivo
Permitir que o admin principal gerencie dados de qualquer pessoa da árvore.
### Funcionalidades
- Página /admin/pessoas/:id.
- Edição de dados pessoais.
- Edição de vínculos.
- Edição de arquivos históricos.
- Visualização de e-mail vinculado, se permitido.
- Bloqueio para não admins.
### Sugestões
- Restringir acesso a tuliust@gmail.com.
- Reaproveitar os mesmos componentes de /meus-dados.
- Não incluir campo de senha.
- Criar modo admin nos formulários.
- Garantir RLS compatível.
- Criar logs de alterações futuramente.

## 24. Impressão/exportação da árvore genealógica
### Objetivo
Permitir que a árvore seja compartilhada ou preservada fora do sistema digital.
### Funcionalidades
- Imprimir “Minha Árvore”.
- Salvar “Minha Árvore” como PDF.
- Exportar perfil individual.
- Exportar ramo familiar.
- Exportar linha genealógica de uma pessoa.
### Sugestões
- Criar uma versão de árvore para impressão, diferente da interativa.
- Evitar imprimir minimap, filtros, header e botões.
- Ajustar escala para caber em A4/A3.
- Considerar opção:
- retrato;
- paisagem.
- Para árvores grandes, criar exportação por ramo ou geração.
- Incluir data de geração do PDF.

## 25. Dados estruturados e normalização
### Objetivo
Aumentar a confiabilidade dos dados para árvore, IA, estatísticas, calendário e parentesco.
### Funcionalidades
- Datas padronizadas.
- Cidades padronizadas.
- Sobrenomes extraídos.
- Relações familiares consistentes.
- Arquivos históricos estruturados.
- Campos sociais padronizados.
### Sugestões
- Criar utilitários de normalização.
- Separar datas completas de datas parciais.
- Padronizar Cidade/UF.
- Criar estrutura própria para sobrenomes.
- Rever rede_social e instagram_usuario.
- Criar migrations apenas quando o modelo estiver claro.
- Evitar campos soltos duplicados.

## 26. Notificações
### Objetivo
Avisar usuários sobre eventos e mudanças relevantes na família.
### Funcionalidades
- Aniversário hoje.
- Aniversário amanhã.
- Data de memória.
- Novo tópico no mural.
- Nova foto.
- Nova informação sugerida.
- Evento próximo.
### Sugestões
- Começar com notificações internas no site.
- Depois avaliar e-mail.
- Não enviar notificações excessivas.
- Permitir preferências do usuário.
- Integrar com calendário familiar.
- Integrar com mural e colaboração.

## 27. Favoritos
### Objetivo
Permitir que usuários acompanhem pessoas importantes ou frequentes.
### Funcionalidades
- Favoritar pessoa.
- Filtrar árvore por favoritos.
- Ver aniversários de favoritos.
- Exportar favoritos para calendário.
- Receber notificações de favoritos.
### Sugestões
- Criar tabela favoritos.
- Relacionar favorito com user_id e pessoa_id.
- Usar em calendário, home e filtros.
- Evitar favorito global; deve ser por usuário.

## 28. WhatsApp e contato familiar
### Objetivo
Facilitar contato entre familiares, respeitando consentimento.
### Funcionalidades
- Botão “Enviar mensagem no WhatsApp”.
- Exibição condicionada ao toggle.
- Mensagem inicial automática.
- Controle de privacidade.
### Sugestões
- Exibir apenas se:
- telefone existir;
- usuário permitiu WhatsApp;
- visitante estiver autenticado.
- Não mostrar telefone cru se não for necessário.
- Criar link wa.me.
- Futuramente permitir mensagem padrão personalizada.

## 29. Busca e filtros avançados
### Objetivo
Facilitar exploração da árvore por nomes, locais, datas, sobrenomes, gerações e ramos.
### Funcionalidades
- Busca por nome.
- Busca por apelido.
- Busca por sobrenome.
- Busca por cidade.
- Busca por mês de nascimento.
- Filtro por geração sociológica.
- Filtro por ramo.
- Filtro por favoritos.
- Filtro por vivos/falecidos/pets.
### Sugestões
- Centralizar busca em serviço único.
- Criar índices no banco se necessário.
- Padronizar sobrenomes antes de filtrar.
- Permitir filtros globais no header.
- Evitar duplicar filtros entre header e sidebar.

## 30. Página de homenagens
### Objetivo
Criar uma área especial para preservar a memória de pessoas falecidas.
### Funcionalidades
- Foto.
- Mini biografia.
- Datas importantes.
- Lembranças.
- Mensagens da família.
- Fotos e documentos associados.
### Sugestões
- Integrar com perfil memorial.
- Permitir contribuições moderadas.
- Exibir datas de memória no calendário.
- Criar layout mais editorial e respeitoso.
- Permitir impressão/salvar como PDF da homenagem.

---

# Complementos consolidados sem duplicidade

> Esta seção acrescenta pendências, decisões técnicas, prioridades e especificações ainda não explicitadas no documento original.

## 31. Pendências de alta prioridade

### 31.1 Testes funcionais manuais antes de produção estável

Antes de considerar o ambiente de produção estável, validar manualmente as áreas abaixo.

| Área | O que validar |
|---|---|
| Admin | Acesso de admin, bloqueio de usuário comum, dashboard e logout. |
| RLS | Leitura e escrita conforme papel do usuário. |
| Relacionamentos | Criação e remoção de inversos, duplicidade e regras de pai, mãe, filho, cônjuge e irmão. |
| Arquivos históricos | Exibição, criação, edição e permissão. |
| Fórum | Categorias, tópicos, respostas, comentários, reações, solução e moderação. |
| Google Calendar | Status da conexão, OAuth, sincronização e proteção de tokens. |
| Migração destrutiva | `/admin/migrar-dados` bloqueado em produção e protegido localmente. |

## 32. Pendência crítica sobre arquivos históricos

### 32.1 Coluna legada que não deve ser removida ainda

Não remover ainda:

```sql
public.pessoas.arquivos_historicos
```

O runtime atual já usa `public.arquivos_historicos`, mas a coluna antiga deve ser mantida até validação final.

### 32.2 Validação obrigatória antes de remoção futura

Antes de remover a coluna no futuro:

- rodar consulta administrativa no Supabase SQL Editor;
- confirmar que `public.pessoas.arquivos_historicos` não tem dados úteis;
- validar visualmente se os arquivos históricos esperados aparecem no app;
- confirmar se `total_arquivos_relacionais = 0` é realmente esperado;
- gerar dump recente;
- só então criar uma migration futura com `drop column`.

## 33. Ações explicitamente não implementadas nesta rodada

| Ação | Motivo |
|---|---|
| `supabase db push` | Não era necessário depois do `migration repair`. |
| Criar `public.imagens_pessoa` | Sem uso runtime; tratado como legado/migrations-only. |
| Versionar `public.pessoas_com_estatisticas` | View remota existe, mas sem uso runtime. |
| Remover `public.pessoas.arquivos_historicos` | Precisa de validação administrativa e visual antes. |
| Refatorar frontend para usar `pessoa_social_profiles` | Tabela foi versionada, mas o app ainda usa campos diretos em `public.pessoas`. |
| Remover campos diretos de rede social em `public.pessoas` | Mantidos por compatibilidade com runtime atual. |
| Aplicar migrations no remoto | Histórico foi reparado porque o schema já refletia os efeitos. |

## 34. Sugestões técnicas registradas

### 34.1 Média prioridade

- Criar uma migration futura para remover `public.pessoas.arquivos_historicos`, apenas após validação.
- Decidir futuramente se `public.pessoas_com_estatisticas` será removida ou documentada como legado remoto.
- Decidir se `imagens_pessoa` será aposentada das migrations futuras ou mantida como histórico.
- Planejar a futura refatoração de redes sociais para `pessoa_social_profiles`.
- Atualizar `MIGRATION-GUIDE.md` com o fluxo correto de dump, repair e validação.
- Arquivar scripts SQL legados em `docs/legacy` ou `sql/legacy`.

### 34.2 Baixa/média prioridade

| Item | Sugestão |
|---|---|
| Favoritos | Migrar de `localStorage` para Supabase, se ainda aplicável. |
| Notificações | Migrar de `localStorage` para Supabase, se ainda aplicável. |
| `DEFAULT_USER_ID = demo-user` | Remover se ainda existir. |
| Upload admin | Migrar para Supabase Storage de forma estruturada. |
| Services | Refatorar `dataService.ts`, `forumService.ts`, `memberProfileService.ts`. |
| `Home.tsx` | Reduzir acoplamento. |
| Fórum | Separar componentes inline. |
| Funcionalidades | Criar matriz público / membro / admin / legado / experimental. |
| Erros | Padronizar tratamento de erro dos services. |
| Testes | Criar testes automatizados. |
| Bundle | Avaliar code splitting para reduzir aviso de chunk acima de 500 kB. |

## 35. Próximas ações recomendadas

Sequência prática registrada:

1. Rodar `git pull origin main` localmente para trazer a documentação atualizada.
2. Rodar `npm run dev`.
3. Testar manualmente admin, árvore, relacionamentos, arquivos históricos, fórum e Google Calendar.
4. Rodar consultas no Supabase SQL Editor para confirmar a situação de `pessoas.arquivos_historicos`.
5. Gerar novo dump antes de qualquer alteração estrutural futura.
6. Só depois criar migration futura para remover a coluna legada, se tudo estiver validado.

## 36. Pontos de atenção permanentes

### 36.1 Regras operacionais

- Não usar `supabase db push` sem antes rodar `supabase migration list`.
- Sempre gerar dump antes de alteração estrutural.
- Não commitar dumps.
- Usar `postgres:17` via Docker se o remoto estiver em PostgreSQL 17.x.
- Não registrar senhas, tokens, service role keys, connection strings completas ou links temporários de login.
- Tratar os arquivos abaixo como possíveis legados até revisão formal:
  - `database-schema.sql`;
  - `SETUP-BANCO-DADOS.md`;
  - `supabase/forum-schema.sql`;
  - `supabase/google-calendar-schema.sql`;
  - `src/imports/pasted_text/*`.

### 36.2 Backlog técnico direto

- Remover a coluna antiga `pessoas.arquivos_historicos` depois de validar tudo.
- Tornar `migrarDados` realmente transacional via RPC ou Edge Function.
- Migrar favoritos/notificações de `localStorage` para Supabase.
- Migrar upload admin para Supabase Storage.
- Refatorar `dataService.ts`.
- Refatorar `Home.tsx`.
- Arquivar SQLs/docs legados.
- Atualizar `MIGRATION-GUIDE.md` completamente.

## 37. Complementos de produto ainda não explicitados

### 37.1 Árvore geral, personalizada e focada

Além da “Minha Árvore”, manter no roadmap três modos de navegação:

- **árvore geral**, com visualização completa, navegação entre ramos, zoom, pan, busca e abertura de perfil;
- **árvore personalizada do usuário**, aberta a partir da própria pessoa logada, com pais, avós, bisavós, irmãos, tios, primos, filhos e sobrinhos;
- **árvore focada em uma pessoa**, permitindo selecionar qualquer membro e centralizar ancestrais, descendentes, irmãos e colaterais.

Também prever alternância clara entre “minha árvore” e “árvore geral”.

### 37.2 Famílias dentro da família

Criar formas de visualização por núcleos:

- ramo paterno;
- ramo materno;
- descendentes de um casal;
- ramo por avós fundadores.

### 37.3 Campos adicionais de perfil

Além dos campos já listados, considerar:

- apelido;
- nome pelo qual a pessoa é conhecida;
- sobrenomes;
- grau de parentesco;
- documentos históricos diretamente vinculados ao perfil.

### 37.4 Acontecimentos marcantes do nascimento

Em cada perfil, avaliar a exibição de:

- fatos importantes do dia do nascimento;
- fatos importantes do ano do nascimento;
- contexto histórico, cultural e social da época.

### 37.5 Perguntas avançadas de parentesco e descoberta

Além das perguntas já previstas, suportar consultas como:

- ele é meu primo?
- primo de qual grau?
- qual é o caminho familiar entre mim e essa pessoa?
- quais são meus parentes de sangue?
- quem são meus primos de primeiro grau?
- quais nasceram na mesma cidade que eu?

### 37.6 Busca e filtros adicionais

Adicionar ao escopo de busca e exploração:

- signo;
- geração;
- ramo familiar;
- escopo familiar:
  - família direta;
  - ramo materno;
  - ramo paterno;
  - árvore inteira;
  - pessoas favoritas.

Na busca por sobrenome, mostrar:

- todos os sobrenomes cadastrados;
- quantas pessoas têm cada sobrenome;
- pessoas ligadas a cada sobrenome;
- origem dos ramos.

### 37.7 Calendário visual familiar

O calendário mensal deve prever:

- nome do mês;
- setas para avançar e voltar;
- dias em formato de grade;
- aniversariantes em cada data;
- datas de falecimento;
- idade que a pessoa fará;
- há quantos meses ou anos a pessoa faleceu.

### 37.8 Eventos internos da família

Além de aniversários e datas de memória, prever agenda interna com:

- encontros;
- aniversários organizados;
- reuniões;
- homenagens;
- encontros anuais.

### 37.9 Google Agenda — grupos de exportação

A exportação ou integração deve permitir adicionar aniversários por grupos:

- família direta;
- primos;
- tios;
- favoritos;
- pessoas específicas.

Cada evento pode incluir:

- nome da pessoa;
- data de nascimento;
- grau de parentesco;
- link para o perfil.

### 37.10 Assistente de IA como camada de consulta

O assistente deve responder sobre:

- estatísticas;
- parentesco;
- curiosidades;
- filtros por data, cidade, sobrenome e gênero;
- resumos sobre uma pessoa;
- resumos sobre um ramo da família;
- comparações entre membros.

Requisito central: a IA deve consultar dados estruturados e não substituir a lógica determinística de parentesco.

### 37.11 Cards “Você sabia?”

Exemplos de cards automáticos:

- março é o mês com mais aniversários;
- o sobrenome X aparece em 18 pessoas;
- a cidade mais frequente é Curitiba;
- há 5 pessoas da Geração Z;
- Fulano e Beltrano nasceram no mesmo dia.

### 37.12 Comunicação familiar e consentimento

No perfil da pessoa, o botão “Enviar mensagem no WhatsApp” deve respeitar:

- existência de telefone;
- consentimento explícito;
- autenticação do visitante;
- configuração de privacidade.

### 37.13 Mural/fórum — temas editoriais

Temas possíveis para tópicos:

- histórias antigas;
- encontros;
- aniversariantes;
- fotos antigas;
- sobrenomes;
- busca por antepassados.

### 37.14 Fotos, mídia e acervo

Prever álbuns por:

- lado materno;
- lado paterno;
- décadas;
- casamentos;
- encontros;
- infância.

Recursos adicionais:

- marcar pessoas nas fotos;
- separar por evento;
- separar por época;
- vincular documentos a pessoas específicas;
- permitir consulta por perfil ou por tema.

### 37.15 História, memória e contexto

A linha do tempo e o modo história devem cobrir:

- origem da família;
- mudanças de cidade;
- mudanças de país;
- gerações;
- momentos marcantes;
- fotos;
- documentos.

### 37.16 Geografia da família

O mapa deve permitir responder:

- de onde vieram os antepassados?
- onde a família mais se concentrou?
- quais países fazem parte da história da família?

### 37.17 Colaboração e contribuições familiares

Permitir que parentes sugiram:

- correção de nome;
- foto;
- data;
- história;
- documento.

Regra recomendada: toda contribuição passa por moderação antes de publicação.

### 37.18 Comparador de perfis

Comparar duas pessoas por:

- grau de parentesco;
- diferença de idade;
- cidades em comum;
- sobrenomes em comum;
- ramo familiar;
- eventos parecidos.

### 37.19 Página inicial dinâmica

A home pode mostrar:

- aniversariantes de hoje;
- lembranças do dia;
- fatos históricos da família;
- novo tópico no mural;
- curiosidade automática;
- próximos eventos.

## 38. Organização por prioridade do produto

### 38.1 MVP

- Árvore geral.
- Perfis detalhados.
- Parentesco básico.
- Busca por nome/sobrenome.
- Calendário visual.
- Datas de falecimento.
- Escopo por família direta / ramo materno / ramo paterno.
- Curiosidades básicas.
- Integração inicial com favoritos e notificações.

### 38.2 Fase 2

- Google Agenda.
- IA para perguntas.
- Mural/fórum.
- WhatsApp.
- Geração automática de insights.
- Linha do tempo.
- Mapa da família.
- Álbuns e documentos.

### 38.3 Fase 3

- Assistente avançado de parentesco.
- Comparador de perfis.
- Contribuições moderadas.
- Página de homenagens.
- Modo história.
- Regras finas de privacidade.
- Home dinâmica avançada.

## 39. Estrutura resumida do produto

### 39.1 Módulo 1 — Estrutura familiar

- Árvore.
- Perfis.
- Parentesco.
- Gerações.
- Ramos.

### 39.2 Módulo 2 — Datas e agenda

- Calendário.
- Aniversários.
- Memória.
- Eventos.
- Google Agenda.

### 39.3 Módulo 3 — Inteligência

- IA.
- Curiosidades.
- Estatísticas.
- Busca avançada.
- Comparações.

### 39.4 Módulo 4 — Interação

- WhatsApp.
- Mural.
- Notificações.
- Contribuições.

### 39.5 Módulo 5 — Memória e acervo

- Fotos.
- Documentos.
- Homenagens.
- Linha do tempo.
- Modo história.
- Mapa da família.

## 40. Observações finais de produto

- Algumas ideias dependem de normalização forte do banco, principalmente parentesco, datas, cidades e sobrenomes.
- O assistente de IA deve ser tratado como camada de consulta sobre dados estruturados, não como substituto da lógica determinística de parentesco.
- Funcionalidades com dados pessoais, WhatsApp, telefone, fotos e datas sensíveis devem ser implementadas junto com regras de privacidade e consentimento.
- Recomenda-se separar cada grande módulo em issues ou etapas independentes antes da implementação.
