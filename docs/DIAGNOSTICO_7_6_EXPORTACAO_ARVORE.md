# Diagnostico 7.6A - Exportacao de area da arvore

Data: 2026-05-15

Branch: `main`

Commit atual: `c5e057f8a7783b999b3a0c19390a90c00adf863a`

## Escopo

Este documento registra apenas o diagnostico tecnico da frente 7.6, "Selecionar area para PDF/impressao". Nenhuma funcionalidade foi implementada nesta etapa, nenhum arquivo de producao foi alterado, nenhuma migration foi criada e nenhum comando de alteracao de banco foi executado.

Conclusao curta: a selecao por retangulo sobre a arvore ainda nao existe. Porem ja ha codigo parcial relacionado a exportacao/impressao da visualizacao atual da arvore, usando `html2canvas` e `jspdf`.

## Comandos executados

- `git status`
  - Resultado inicial: branch `main`, sincronizada com `origin/main`, com alteracoes nao commitadas ja existentes.
  - Durante o diagnostico, o worktree mudou por alteracoes externas ao escopo. A checagem final deve ser lida considerando essas alteracoes preexistentes/externas.
- `npm run build`
  - Resultado inicial: passou.
  - Resultado final apos criar este documento: passou.
  - Observacao: Vite emitiu aviso de chunks acima de 500 kB. A build gerou chunks separados para `html2canvas` e `jspdf`.
- `git diff --check`
  - Resultado inicial: passou sem apontar whitespace errors.
  - Resultado final apos criar este documento: passou sem apontar whitespace errors.
- `supabase migration list`
  - Resultado: migrations locais e remotas alinhadas ate `20260514203000`.
  - Observacao: Supabase CLI avisou que existe versao mais nova disponivel.
- `npm ls html2canvas jspdf --depth=0`
  - Resultado: `html2canvas@1.4.1` e `jspdf@4.2.1` instalados.
- `git status`
  - Resultado final: este diagnostico aparece como arquivo novo em `docs/DIAGNOSTICO_7_6_EXPORTACAO_ARVORE.md`.
  - Tambem havia alteracoes nao relacionadas em arquivos de producao e um utilitario nao rastreado fora deste escopo: `src/app/components/person/RelationshipFinder.tsx`, `src/app/pages/PersonProfile.tsx`, `src/app/services/relationshipResolverService.ts` e `src/app/utils/relationshipDegreeDisplay.ts`.

Nao foi executado `supabase db push`.

## Arquivos lidos

- `docs/GUIA_IMPLEMENTACOES.md`
- `docs/PLANO_PROXIMOS_PASSOS.md`
- `docs/GUIA_CORRECAO_ERROS.md`
- `package.json`
- `src/styles/theme.css`
- `src/app/pages/Home.tsx`
- `src/app/pages/MinhaArvore.tsx`
- `src/app/components/ArquivosHistoricos.tsx`
- `src/app/components/FamilyTree/FamilyTree.tsx`
- `src/app/components/FamilyTree/ViewModeToggle.tsx`
- `src/app/components/FamilyTree/nodeTypes.ts`
- `src/app/components/FamilyTree/PersonNode.tsx`
- `src/app/components/FamilyTree/MarriageNode.tsx`
- `src/app/components/FamilyTree/DirectFamilyLabelNode.tsx`
- `src/app/components/FamilyTree/OrthogonalChildEdge.tsx`
- `src/app/components/FamilyTree/GenealogyFamilyConnectorNode.tsx`
- `src/app/components/FamilyTree/GenealogySpouseEdge.tsx`
- `src/app/components/FamilyTree/layouts/directFamilyDistributedLayout.ts`
- `src/app/components/FamilyTree/layouts/genealogyColumnsLayout.ts`
- `src/app/components/FamilyTree/layouts/filterPersonalTreeScope.ts`
- `src/app/components/FamilyTree/utils/exportColorSanitizer.ts`
- `src/app/components/FamilyTree/modals/ViewMarriageModal.tsx`

## Estado atual do 7.6

Os documentos de planejamento indicam 7.6 como nao implementado. O item em `docs/PLANO_PROXIMOS_PASSOS.md` descreve a funcionalidade futura como modo "Selecionar area", retangulo sobre a arvore e exportacao apenas da area selecionada para PNG/PDF/impressao.

O codigo atual confirma que essa funcionalidade completa ainda nao existe:

- Nao ha modo "Selecionar area".
- Nao ha overlay de selecao por retangulo.
- Nao ha estado de area selecionada.
- Nao ha conversao de coordenadas de selecao para crop.
- Nao ha captura parcial por retangulo da superficie da arvore.
- Nao ha fluxo de cancelar selecao.

Entretanto, existe implementacao parcial/relacionada:

- `html2canvas` e `jspdf` estao no `package.json`.
- Ambos estao instalados, conforme `npm ls`.
- `src/app/components/FamilyTree/FamilyTree.tsx` faz `import('html2canvas')` sob demanda em `captureVisibleTree`.
- `src/app/components/FamilyTree/FamilyTree.tsx` faz `import('jspdf')` sob demanda em `saveVisibleTreePdf`.
- `FamilyTreeActions` ja expoe `print`, `savePdf` e `saveImage`.
- `Home.tsx` chama essas acoes a partir do painel lateral "Informacoes".
- Ja existem botoes "Salvar como PDF", "Salvar como Imagem" e "Imprimir".
- A captura atual mira `.react-flow`, ou seja, a visualizacao atual da arvore, nao uma area selecionada arbitraria.
- O arquivo `src/app/components/FamilyTree/utils/exportColorSanitizer.ts` ja existe para reduzir problemas de cores nao suportadas pelo `html2canvas`.
- `src/styles/theme.css` possui CSS global para `.is-exporting-family-tree` e um bloco `@media print`.
- `printVisibleTree` tambem abre uma nova janela e injeta CSS proprio de impressao.

Outros achados relacionados:

- `src/app/components/ArquivosHistoricos.tsx` tem download de arquivos historicos, inclusive PDF, mas nao exporta a arvore.
- `src/app/pages/MinhaArvore.tsx` e `src/app/pages/MeusDados.tsx` usam canvas para processar avatar/imagem de perfil, sem relacao direta com exportacao da arvore.
- Nao foi encontrado uso de `window.print` fora do fluxo de impressao da arvore em `FamilyTree.tsx`.

## Mapa das telas da arvore

### Minha Arvore

- Arquivo principal: `src/app/pages/Home.tsx`.
- Componente principal: `src/app/components/FamilyTree/FamilyTree.tsx`.
- `treeViewMode`: `minha-arvore`.
- Escopo: pessoal. O grafo completo e montado, depois filtrado por `filterGraphToPersonalScope` usando os ids retornados por `collectDirectFamilyScopePersonIds`.
- Layout: `directFamilyDistributedLayout`.
- Container DOM: mesmo container de `FamilyTree` usado pelas demais views.
- Controles externos que nao devem aparecer na exportacao por area: header, seletor de view, busca, sidebar, filtros, legenda lateral, painel "Informacoes", modais e menus.
- Controles internos: botoes de zoom ficam dentro do wrapper `family-tree-export-root`, mas fora de `.react-flow`; por isso nao entram na captura atual.

### Genealogia

- Arquivo principal: `src/app/pages/Home.tsx`.
- Componente principal: `FamilyTree.tsx`.
- `treeViewMode`: `genealogia`.
- Escopo: pessoal, usando o mesmo filtro de escopo de "Minha Arvore".
- Layout: `genealogyColumnsLayout`.
- Container DOM: mesmo container `FamilyTree`.
- Controles externos que nao devem aparecer: header, busca, sidebar, filtros de geracao, legendas, painel "Informacoes", modais e menus.
- Elementos especificos: colunas por geracao, conectores pais-filhos em SVG via `GenealogyFamilyConnectorNode` e anel de conjuge via `GenealogySpouseEdge`.

### Visao Completa

- Arquivo principal: `src/app/pages/Home.tsx`.
- Componente principal: `FamilyTree.tsx`.
- `treeViewMode`: `visao-completa`.
- Escopo: base completa visivel apos filtros de status/pet aplicados em `Home.tsx`; nao usa `filterGraphToPersonalScope`.
- Layout: `genealogyColumnsLayout`.
- Container DOM: mesmo container `FamilyTree`.
- Risco maior: tende a ser a view com maior quantidade de nos e maior area renderizada.

### Observacao sobre `src/app/pages/MinhaArvore.tsx`

O arquivo existe e tem titulo "Minha Arvore", mas no diagnostico de exportacao da arvore o fluxo relevante esta em `Home.tsx` + `FamilyTree.tsx`. O uso de canvas neste arquivo esta ligado a avatar/imagem, nao a captura visual da arvore.

## Tecnologia de renderizacao

- A arvore e renderizada com `ReactFlow`.
- Os cards de pessoas e labels sao HTML posicionados pelo ReactFlow.
- Edges padrao usam SVG do ReactFlow via `BaseEdge`.
- Conectores pais-filhos da Genealogia usam um node ReactFlow que renderiza um `<svg>` proprio (`GenealogyFamilyConnectorNode`).
- O anel de casamento da Genealogia e um `<button>` HTML renderizado por `EdgeLabelRenderer`, posicionado com `transform: translate(...)`. Ele deve aparecer na exportacao porque faz parte da arvore e representa informacao visual relevante.
- O `MarriageNode` da arvore direta tambem e HTML, com emoji e handles do ReactFlow.
- O viewport do ReactFlow usa transform/translate/scale internamente.
- `FamilyTree.tsx` controla zoom e pan via `ReactFlowInstance`, `setViewport`, `minZoom`, `maxZoom`, `panOnDrag`, `panOnScroll`, `zoomOnScroll` e `zoomOnPinch`.
- Nao ha scroll interno da superficie da arvore no wrapper principal; o wrapper usa `overflow-hidden`. A navegacao e por pan/zoom do ReactFlow.
- Ha elementos absolutamente posicionados no wrapper e no ReactFlow, incluindo botoes de zoom, labels de edge e menus de pessoa.
- Os cards de pessoa podem conter imagens externas em `pessoa.foto_principal_url`.

## Container ideal para captura

O melhor ponto atual para um `ref` de exportacao continua sendo `FamilyTree.tsx`, porque ele possui:

- o `containerRef` do wrapper da arvore;
- acesso ao `ReactFlowInstance`;
- conhecimento do `viewMode`;
- conhecimento de pan/zoom atual;
- funcoes imperativas ja expostas para `Home.tsx`.

Para 7.6B, a recomendacao e criar um wrapper interno explicito, por exemplo:

- `data-tree-export-surface="true"`
- classe `tree-export-surface`

Esse wrapper deveria envolver somente a superficie capturavel da arvore, preferencialmente o proprio `.react-flow` ou um wrapper imediatamente acima dele, e nao deve incluir header, sidebar, filtros ou botoes de acao.

Elementos a ocultar ou fechar durante exportacao:

- botoes de zoom internos;
- menus de pessoa abertos por contexto;
- popovers/dropdowns;
- modais;
- tooltips;
- sidebar e filtros;
- overlay de selecao;
- qualquer feedback de loading sobreposto na area capturada.

Nao foi criado esse wrapper nesta etapa.

## Coordenadas e selecao por retangulo

A selecao por retangulo tem risco tecnico porque as coordenadas visuais da tela nao sao necessariamente as mesmas coordenadas do grafo ReactFlow.

Fatores atuais:

- A arvore usa zoom/pan via ReactFlow.
- A area visivel e uma viewport transformada.
- O wrapper principal tem `overflow-hidden`.
- Nao ha `scrollLeft`/`scrollTop` relevante no container da arvore, mas ha transform CSS interno do ReactFlow.
- O retangulo desenhado na tela deve ser medido em coordenadas do elemento DOM capturado, nao em coordenadas de grafo.
- Sera necessario usar `getBoundingClientRect()` do export surface para calcular `x`, `y`, `width` e `height` do retangulo relativo ao elemento capturado.
- Se a captura futura for da viewport visivel e depois crop do canvas, a conversao e mais simples: coordenadas de ponteiro relativas ao `.react-flow` multiplicadas pelo `scale` usado no `html2canvas`.
- Se a captura futura tentar exportar coordenadas do grafo completo, sera necessario converter entre coordenadas de tela e coordenadas ReactFlow, considerando viewport `{ x, y, zoom }`.

Estrategia mais segura para a primeira versao:

1. Implementar selecao apenas sobre a viewport visivel atual da `.react-flow`.
2. Desenhar o overlay em coordenadas de tela relativas ao export surface.
3. Capturar a `.react-flow` visivel com `html2canvas`.
4. Recortar o canvas resultante usando o retangulo selecionado multiplicado pelo fator real `canvas.width / surfaceRect.width` e `canvas.height / surfaceRect.height`.
5. Exportar PNG/PDF/impressao a partir do canvas recortado.

Essa abordagem evita, na primeira entrega, exportar areas fora da viewport e reduz a complexidade de converter coordenadas do grafo completo.

## Recomendacao tecnica para 7.6B

Componentes e utilitarios provaveis:

- `src/app/components/FamilyTree/TreeAreaSelectionOverlay.tsx`
  - Responsavel por desenhar o retangulo, capturar pointer events, cancelar e confirmar selecao.
- `src/app/components/FamilyTree/utils/treeExport.ts`
  - Responsavel por `captureTreeSurface`, `cropCanvas`, `saveCanvasAsPng`, `saveCanvasAsPdf` e `printCanvas`.
- Opcionalmente manter `exportColorSanitizer.ts` separado, reutilizando-o no novo utilitario.

Integracao recomendada:

- Integrar o botao "Selecionar area" no painel lateral "Informacoes" de `Home.tsx`, junto de "Salvar como PDF", "Salvar como Imagem" e "Imprimir".
- Expor novas acoes em `FamilyTreeActions`, por exemplo `startAreaSelection`.
- Manter a selecao e a captura em `FamilyTree.tsx`, onde o `containerRef` e o `ReactFlowInstance` ja existem.
- Enquanto o modo de selecao estiver ativo, desabilitar temporariamente `panOnDrag` e interacoes conflitantes do ReactFlow, ou fazer o overlay capturar os pointer events.
- Permitir `Esc` e botao "Cancelar" para sair do modo sem exportar.
- Apos selecionar, exibir acoes: PNG, PDF, Imprimir e Cancelar.

PNG:

- Usar `html2canvas` sobre a export surface.
- Aplicar `backgroundColor: '#ffffff'`.
- Usar `scale` limitado, por exemplo `Math.min(2, window.devicePixelRatio || 1)`.
- Recortar o canvas pelo retangulo selecionado.
- Baixar via `<a download>`.

PDF:

- Usar `jspdf` com `unit: 'px'`.
- Definir orientacao automaticamente: `landscape` quando largura >= altura; `portrait` caso contrario.
- Inserir a imagem recortada ocupando a pagina.
- Para selecoes muito grandes, considerar reduzir escala antes de gerar o PDF.

Impressao:

- Reutilizar a estrategia atual de abrir uma janela nova e inserir a imagem recortada.
- Usar `object-fit: contain` para evitar corte.
- Manter `@page { margin: 0; }` ou avaliar margem minima configuravel futuramente.

Nomes de arquivos:

- Incluir view e data/hora, por exemplo:
  - `minha-arvore-area-2026-05-15.png`
  - `genealogia-area-2026-05-15.pdf`
  - `visao-completa-area-2026-05-15.png`

Loading e erro:

- Mostrar loading durante captura/exportacao, pois `html2canvas` pode demorar.
- Bloquear duplo clique/reexport enquanto uma captura estiver em andamento.
- Exibir erro quando o navegador bloquear popup de impressao, quando `toDataURL` falhar por canvas contaminado, ou quando a selecao for pequena demais.

## Performance

`html2canvas` pode ser pesado, especialmente na "Visao Completa", por causa de:

- muitos nodes HTML;
- muitos SVGs/edges;
- imagens de pessoas;
- sombras, bordas e estilos;
- escala de captura alta;
- canvas final grande em memoria.

Limites sugeridos para primeira versao:

- Selecao minima: aproximadamente `80x80` CSS pixels.
- Selecao maxima recomendada: algo proximo de `3000x3000` pixels finais, ou limite de area como `9 MP` a `12 MP`.
- Escala maxima inicial: `2`.
- Em selecao grande, reduzir escala automaticamente ou pedir confirmacao ao usuario.
- Evitar capturar arvore completa na primeira versao; capturar apenas a viewport visivel selecionada.
- Evitar executar captura em loop; cada export deve ser uma acao explicita.

Risco de imagens externas:

- `PersonNode` usa `<img src={pessoa.foto_principal_url}>` sem `crossOrigin`.
- `html2canvas` esta configurado com `useCORS: true` e `allowTaint: true`.
- Se alguma imagem nao permitir CORS, o canvas pode ficar contaminado e `toDataURL` pode falhar.
- Para 7.6B, avaliar adicionar `crossOrigin="anonymous"` nas imagens da arvore somente se as URLs do Supabase Storage estiverem configuradas para CORS adequado; caso contrario, manter fallback de erro amigavel.

## Compatibilidade com dados e permissoes

- 7.6 nao exige migration.
- 7.6 nao exige alteracao de schema Supabase.
- 7.6 nao precisa salvar PDFs/PNGs no Supabase Storage na primeira versao.
- 7.6 nao precisa gravar dados.
- Exportar/imprimir nao deve alterar pessoas, relacionamentos, arquivos historicos, notificacoes ou logs.
- Pode ficar disponivel para admin e usuario comum, pois atua sobre a visualizacao que o usuario ja consegue ver.
- Se no futuro houver regras de privacidade por pessoa/evento/foto, a exportacao deve respeitar o mesmo conjunto ja renderizado na tela.
- Logs de exportacao nao parecem obrigatorios na primeira versao; podem ser decisao futura de auditoria.

## Riscos de regressao

- Quebrar pan/zoom/drag do ReactFlow ao interceptar pointer events.
- Clique e arraste da selecao conflitar com pan da arvore.
- Selecao impedir clique no anel de casamento.
- Overlay de selecao aparecer na imagem exportada.
- Exportacao incluir menus de pessoa abertos.
- Exportacao incluir controles, filtros, sidebars ou modais.
- Area exportada sair cortada por erro de coordenada relativa.
- Crop ficar deslocado em telas com `devicePixelRatio` alto.
- PDF sair com baixa resolucao ou tamanho excessivo.
- Impressao esticar ou cortar a imagem dependendo do navegador.
- Mobile ficar dificil de usar por gestos de pan/zoom e selecao competindo.
- Build quebrar por tipos de DOM/canvas se o utilitario nao tipar `HTMLCanvasElement`, `PointerEvent` e `HTMLElement` com cuidado.
- Captura falhar com imagens externas/cross-origin.
- Captura pesada travar a UI em arvores grandes.
- O sanitizador de cores pode alterar visual da exportacao se aplicado de forma ampla demais.

## Plano recomendado para 7.6B

1. Extrair o fluxo atual de exportacao de `FamilyTree.tsx` para um utilitario `treeExport.ts`, mantendo o comportamento existente.
2. Criar `TreeAreaSelectionOverlay.tsx` com pointer events, retangulo, cancelar por `Esc` e confirmacao.
3. Adicionar um estado de modo de selecao em `FamilyTree.tsx`.
4. Adicionar uma acao imperativa em `FamilyTreeActions` para iniciar selecao.
5. Integrar botao "Selecionar area" no painel "Informacoes" de `Home.tsx`.
6. Na primeira entrega, limitar selecao a area visivel da `.react-flow`.
7. Validar exportacao PNG do canvas recortado.
8. Validar PDF com orientacao automatica.
9. Validar impressao via janela nova com imagem recortada.
10. Adicionar limites de dimensao, loading e mensagens de erro.
11. Expandir QA para `minha-arvore`, `genealogia` e `visao-completa`.
12. Atualizar `docs/GUIA_IMPLEMENTACOES.md`, `docs/PLANO_PROXIMOS_PASSOS.md` e `docs/GUIA_CORRECAO_ERROS.md` somente na etapa de implementacao.

## Checklist de QA futuro

- Build passa com `npm run build`.
- `git diff --check` passa.
- Exportar PNG de uma area pequena em "Minha Arvore".
- Exportar PNG de uma area ampla em "Genealogia".
- Exportar PNG de uma area ampla em "Visao Completa".
- Exportar PDF em retrato.
- Exportar PDF em paisagem.
- Imprimir area selecionada.
- Cancelar selecao com botao.
- Cancelar selecao com `Esc`.
- Confirmar que pan/zoom voltam ao normal apos cancelar/exportar.
- Confirmar que clique em pessoa ainda abre detalhes fora do modo de selecao.
- Confirmar que clique no anel de casamento ainda abre modal fora do modo de selecao.
- Confirmar que overlay, menus, filtros, header e sidebar nao aparecem no arquivo.
- Testar com zoom alterado.
- Testar depois de pan na Genealogia.
- Testar com imagem de perfil vinda do Storage.
- Testar em mobile/touch, ou bloquear a feature em mobile se a experiencia ficar ruim.
- Testar selecao grande e verificar aviso/limite.

## Conclusao

7.6A foi concluido como diagnostico. A implementacao 7.6B foi concluida em primeira versao com selecao da viewport visivel da `.react-flow`, recorte do canvas selecionado e exportacao PNG/PDF/impressao.

A funcionalidade implementada permanece limitada ao que esta visivel na viewport atual da arvore. Exportacao da arvore completa, QA mobile/tablet, validacao ampla com zoom/pan, arvores grandes e imagens externas ficam como evolucoes futuras da 7.6C.
