# Linha do tempo do usuario

## 1. Status

- A linha do tempo do usuario foi implementada funcionalmente no topico 7.3.
- A primeira versao e derivada dos dados existentes do perfil, relacionamentos, arquivos historicos e eventos pessoais.
- Nao houve tabela nova.
- Nao houve migration.
- Nao ha edicao manual de eventos da timeline nesta versao.

## 2. Arquitetura

O fluxo da timeline e dividido em tres partes:

1. `PersonProfile` carrega os dados disponiveis para a pessoa.
2. `buildPersonTimeline` normaliza, deduplica e ordena os itens.
3. `PersonTimeline` renderiza a lista no perfil da pessoa.

O builder `buildPersonTimeline`:

- nao acessa Supabase;
- nao faz fetch;
- nao depende de estado React;
- nao acessa variaveis de ambiente;
- e uma funcao pura que recebe dados ja carregados e retorna `PersonTimelineItem[]`.

## 3. Arquivos principais

- `src/app/utils/buildPersonTimeline.ts`
  - Define os tipos da timeline.
  - Expoe `buildPersonTimeline`, `parseTimelineDate`, `dedupeTimelineItems` e `sortTimelineItems`.
  - Normaliza eventos derivados dos dados existentes.
- `src/app/components/Timeline/PersonTimeline.tsx`
  - Renderiza a timeline no perfil.
  - Trata estado vazio.
  - Nao renderiza metadata bruta nem IDs tecnicos.
- `src/app/pages/PersonProfile.tsx`
  - Carrega os dados do perfil.
  - Carrega relacionamentos detalhados e arquivos historicos de relacionamentos conjugais.
  - Monta `timelineItems` com `buildPersonTimeline`.
- `src/app/services/dataService.ts`
  - Expoe `obterRelacionamentosDetalhadosDaPessoa`.
  - A consulta filtra relacionamentos em que a pessoa aparece em `pessoa_origem_id` ou `pessoa_destino_id`.

## 4. Dados usados

A timeline pode receber:

- pessoa;
- eventos pessoais;
- arquivos historicos da pessoa;
- filhos;
- pessoas carregadas;
- relacionamentos brutos/detalhados;
- arquivos historicos de relacionamentos conjugais;
- eventos familiares globais, se forem fornecidos futuramente ao builder.

## 5. Eventos suportados

A primeira versao suporta:

- nascimento;
- falecimento com data;
- falecimento informado sem data;
- casamento;
- uniao;
- separacao;
- nascimento de filhos;
- arquivos historicos da pessoa;
- arquivos historicos de relacionamento;
- `person_events`;
- memorias;
- eventos familiares globais, quando fornecidos ao builder.

## 6. Parser de datas

O helper `parseTimelineDate` suporta:

- `DD/MM/AAAA`;
- `D/M/AAAA`;
- `AAAA-MM-DD`;
- `AAAA`;
- valores ausentes ou invalidos como `unknown`.

Regras importantes:

- data completa preserva precisao `day`;
- ano puro preserva precisao `year`;
- ano puro nao vira `01/01/AAAA`;
- itens com precisao `unknown` vao para o final da ordenacao.

## 7. Deduplicacao

`dedupeTimelineItems` evita duplicacoes usando chaves estaveis:

- casamento/uniao por par de pessoas, tipo e data;
- separacao por par de pessoas e data;
- arquivos por `id`;
- `person_events` por `id`;
- `family_events` por `id`.

Isso evita duplicacao quando um relacionamento conjugal aparece nos dois sentidos.

## 8. Ordenacao

`sortTimelineItems` ordena:

- datas completas por ano, mes e dia;
- datas com ano por ano;
- itens `unknown` no final.

Em empates, a prioridade por tipo e:

1. `birth`
2. `child_birth`
3. `union`
4. `marriage`
5. `separation`
6. `person_event`
7. `family_event`
8. `historical_file`
9. `memory`
10. `death`
11. `other`

Persistindo o empate, a ordenacao final usa o titulo.

## 9. Seguranca e privacidade

A timeline nao deve expor dados sensiveis.

Regras implementadas:

- metadata sensivel e sanitizada;
- URLs completas nao devem ir para metadata;
- base64 e data URL nao devem aparecer;
- telefone, endereco, e-mail, tokens, secrets e keys sensiveis sao removidos;
- IDs tecnicos nao sao exibidos na UI;
- metadata bruta nao e renderizada por `PersonTimeline`;
- arquivos historicos nao sao abertos ou baixados pela timeline nesta versao.

## 10. Permissoes

- A timeline respeita os dados carregados pelo perfil.
- Usuario comum nao deve ganhar acesso administrativo por causa da timeline.
- Admin mantem a visualizacao ja permitida pelo perfil.
- RLS nao foi alterada.
- Nao foi criada policy nova.
- Nao foi usado service role no frontend.

## 11. Estado vazio e tolerancia a erro

- `PersonTimeline` renderiza estado vazio quando nao ha itens.
- O componente aceita `items` opcional e usa fallback para array vazio.
- Falhas ao carregar arquivos historicos de relacionamento nao quebram o perfil.
- Se dados adicionais nao estiverem disponiveis, a timeline renderiza com o que ja foi carregado.

Mensagem esperada no estado vazio:

```txt
Ainda nao ha eventos suficientes para montar a linha do tempo desta pessoa.
```

## 12. Limitacoes da versao atual

Ainda nao foram implementados:

- edicao manual de eventos da timeline;
- upload por evento;
- privacidade por evento;
- exportacao PDF;
- modal detalhado por item;
- consolidacao visual com `PersonEventsList`.

## 13. QA realizado

Validacoes registradas:

- `npm run build` passou;
- `git diff --check` passou;
- QA em browser com perfil real;
- mobile checado;
- console sem erro de runtime;
- validacao visual de nascimento;
- validacao visual de nascimento de filho;
- validacao visual de casamento;
- validacao visual de falecimento informado.

## 14. Troubleshooting

### Timeline vazia

Verificar:

- `src/app/pages/PersonProfile.tsx`;
- dados enviados ao `buildPersonTimeline`;
- `src/app/components/Timeline/PersonTimeline.tsx`;
- estado vazio do componente.

### Casamento/uniao nao aparece

Verificar:

- relacionamentos detalhados;
- `tipo_relacionamento = conjuge`;
- `subtipo_relacionamento`;
- `data_casamento`;
- `src/app/utils/buildPersonTimeline.ts`.

### Separacao duplicada

Verificar:

- `dedupeTimelineItems`;
- chave `relationship-separation`;
- normalizacao do par de pessoas;
- relacionamentos inversos.

### Arquivos historicos nao aparecem

Verificar:

- `src/app/services/arquivosHistoricosService.ts`;
- arquivos historicos da pessoa;
- arquivos historicos de relacionamento;
- dados enviados por `PersonProfile`;
- mapeamento em `buildPersonTimeline`.

### Eventos pessoais nao aparecem

Verificar:

- `src/app/services/personEventsService.ts`;
- `listarEventosDaPessoa`;
- estado `personEvents` em `PersonProfile`;
- mapeamento em `buildPersonTimeline`.

### Datas em ordem errada

Verificar:

- `parseTimelineDate`;
- `sortTimelineItems`;
- `precision`;
- `dateValue`;
- campos `year`, `month` e `day`.

### Usuario comum nao ve algum item

Verificar:

- RLS;
- dados disponiveis no perfil;
- permissoes do service correspondente;
- se o dado deveria aparecer para usuario comum.
