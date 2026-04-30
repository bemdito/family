Quero que você atue como arquiteto de software, product designer, especialista em UX/UI e desenvolvedor full stack sênior.

Sua tarefa é criar um sistema web completo de árvore genealógica, moderno, bonito, intuitivo, responsivo e escalável, com área pública e painel administrativo.

O projeto deve ser pensado como um produto real, preparado para crescer, com boa arquitetura, modelagem consistente, interface clara e experiência fluida para usuários leigos.

==================================================
1. OBJETIVO DO SISTEMA
==================================================

Criar um sistema web de árvore genealógica familiar que permita:

1. visualizar a árvore genealógica de forma interativa;
2. navegar entre gerações e ramos familiares;
3. acessar a página individual de cada pessoa;
4. cadastrar, editar e excluir pessoas no painel admin;
5. cadastrar, editar e excluir relacionamentos;
6. importar dados iniciais via planilha ou JSON;
7. reorganizar automaticamente a árvore com base nos vínculos;
8. permitir impressão e exportação em PDF;
9. suportar humanos e pets;
10. manter boa legibilidade mesmo em árvores maiores.

O sistema deve ser totalmente responsivo para desktop, tablet e mobile.

==================================================
2. ESCOPO DO PRODUTO
==================================================

O produto deve possuir:

A. Área pública
B. Painel administrativo protegido por login
C. Banco de dados estruturado
D. Upload de imagens
E. Importação de dados
F. Exportação em PDF
G. Estrutura pronta para deploy

==================================================
3. REQUISITOS DA ÁREA PÚBLICA
==================================================

Na home, o principal destaque deve ser a árvore genealógica interativa.

A árvore deve:

- exibir cada pessoa em um card;
- mostrar foto principal quando existir;
- exibir nome completo;
- permitir zoom in e zoom out;
- permitir arrastar a árvore na tela;
- permitir centralizar/focar em uma pessoa selecionada;
- reorganizar automaticamente o layout com base nos relacionamentos;
- agrupar gerações de forma visualmente clara;
- posicionar cônjuges no mesmo nível;
- posicionar filhos abaixo dos pais;
- suportar múltiplas uniões/casamentos;
- evitar cruzamento excessivo de linhas;
- permitir colapso/expansão de ramos;
- funcionar bem em desktop, tablet e celular;
- permitir impressão;
- permitir exportação da visualização em PDF.

Também quero:

- busca por nome;
- filtro por sobrenome;
- filtro por geração;
- filtro por ramo familiar;
- foco rápido em uma pessoa;
- destaque visual do caminho familiar selecionado.

==================================================
4. REGRAS VISUAIS DA ÁRVORE
==================================================

Regras visuais:

- linhas sólidas para casamento/união;
- linhas pontilhadas para filiação;
- distinção visual entre humanos e pets;
- cards com foto, nome e informações resumidas;
- cards com cor de fundo personalizável;
- se a pessoa estiver falecida, o card pode exibir um indicativo sutil;
- visual elegante, limpo e contemporâneo;
- animações suaves;
- legibilidade alta;
- boa hierarquia visual entre gerações.

No mobile:
- priorizar navegação por foco;
- permitir arrastar e zoom com boa usabilidade;
- mostrar painel resumido da pessoa ao tocar no card.

==================================================
5. PÁGINAS DO SISTEMA
==================================================

Crie as seguintes páginas:

ÁREA PÚBLICA
1. Home com árvore genealógica interativa
2. Página individual da pessoa
3. Busca/filtros
4. Página para impressão/exportação

PAINEL ADMIN
5. Login
6. Dashboard
7. Lista de pessoas
8. Formulário de pessoa (criar/editar)
9. Lista de relacionamentos
10. Formulário de relacionamento
11. Importação de dados
12. Upload/gestão de imagens
13. Configurações visuais

==================================================
6. PÁGINA INDIVIDUAL DA PESSOA
==================================================

Cada pessoa deve ter uma página própria com:

- nome completo;
- foto principal;
- galeria de imagens;
- datas e locais relevantes;
- mini bio;
- curiosidades;
- pais;
- mães;
- filhos;
- cônjuges/uniões;
- tipo de vínculo familiar;
- link para localizar essa pessoa na árvore;
- navegação para parentes relacionados.

==================================================
7. PAINEL ADMIN
==================================================

O admin deve ser protegido por autenticação.

No painel admin, deve ser possível:

- cadastrar pessoa;
- editar pessoa;
- excluir pessoa;
- cadastrar relacionamento;
- editar relacionamento;
- excluir relacionamento;
- marcar se é humano ou pet;
- definir pais;
- definir mães;
- definir tipo de filiação (sangue ou adotivo);
- definir cônjuge/união;
- cadastrar datas e locais;
- cadastrar minibio e curiosidades;
- subir foto principal;
- subir outras imagens;
- definir cor do card;
- validar inconsistências antes de salvar;
- visualizar prévia da posição da pessoa na árvore;
- reorganizar automaticamente a árvore após alterações.

==================================================
8. MODELAGEM DE DADOS
==================================================

Estruture o sistema separando claramente:

A. Pessoa
B. Relacionamento
C. Arquivos/Imagens
D. Configurações visuais

MODELO SUGERIDO

Pessoa:
- id
- nome_completo
- data_nascimento
- local_nascimento
- data_falecimento
- local_falecimento
- local_atual
- foto_principal_url
- humano_ou_pet
- cor_bg_card
- minibio
- curiosidades
- telefone
- endereco
- rede_social
- created_at
- updated_at

ImagemPessoa:
- id
- pessoa_id
- image_url
- legenda
- ordem

Relacionamento:
- id
- pessoa_origem_id
- pessoa_destino_id
- tipo_relacionamento
- subtipo_relacionamento
- data_casamento
- data_separacao
- local_separacao
- ativo
- observacoes

Tipos de relacionamento esperados:
- conjuge
- pai
- mae
- filho
- filiacao

Subtipos esperados:
- sangue
- adotivo
- uniao
- casamento
- separado

Observação importante:
não modele “pai”, “mãe” e “cônjuge” apenas como texto solto.
Esses dados devem gerar relacionamentos reais no banco para permitir renderização correta da árvore.

==================================================
9. REGRAS DE NEGÓCIO
==================================================

Regras obrigatórias:

- uma pessoa pode ter mais de um relacionamento afetivo ao longo da vida;
- uma pessoa pode ter pai e mãe, ou apenas um dos dois cadastrados;
- filiação deve aceitar sangue ou adoção;
- pet também pode aparecer na árvore;
- pessoas sem foto devem usar avatar padrão;
- o sistema deve aceitar dados incompletos;
- o sistema não deve quebrar se houver campos vazios;
- nomes provisórios devem ser mantidos como registros válidos até edição;
- o sistema deve prever futuras correções manuais;
- a árvore deve ser construída com base na estrutura relacional e não só por ordem manual.

==================================================
10. IMPORTAÇÃO DE DADOS
==================================================

O sistema deve permitir importar dados iniciais via JSON, CSV ou XLSX.

Crie uma rotina de importação com as etapas:

1. leitura dos dados brutos;
2. normalização dos campos;
3. criação de registros de pessoa;
4. criação dos vínculos familiares;
5. detecção de inconsistências;
6. exibição de um relatório de importação;
7. possibilidade de corrigir ou prosseguir.

Durante a importação:
- preservar nomes exatamente como enviados;
- tratar campos vazios como nulos;
- criar vínculos de cônjuge quando existir correspondência;
- criar vínculos de pai e mãe quando existir correspondência;
- considerar “Filho (a) de (de sangue; adotivo)” como subtipo de filiação;
- considerar “Humano ou pet” para diferenciar o card na árvore.

==================================================
11. TECNOLOGIA / STACK DESEJADA
==================================================

Quero uma stack moderna, escalável e fácil de manter.

Sugestão preferencial:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- React Flow, D3, dagre ou biblioteca equivalente para layout da árvore
- geração de PDF no frontend ou backend
- deploy fácil em Vercel

Se considerar melhor, explique tecnicamente a escolha da biblioteca da árvore.

==================================================
12. REQUISITOS DE UX/UI
==================================================

Quero um visual:
- elegante;
- moderno;
- limpo;
- intuitivo;
- agradável para leigos;
- com foco em legibilidade;
- com boa hierarquia;
- com cards bem desenhados;
- com animações suaves;
- com navegação simples.

Evite aparência datada, poluída ou excessivamente técnica.

==================================================
13. ACESSIBILIDADE
==================================================

Considere:
- contraste adequado;
- foco visível;
- navegação por teclado no que for possível;
- labels e estrutura acessível;
- responsividade real;
- boa leitura em telas pequenas.

==================================================
14. ENTREGA ESPERADA
==================================================

Quero que você entregue nesta ordem:

1. arquitetura do projeto;
2. stack recomendada e justificativa;
3. modelo de dados;
4. regras de transformação/importação;
5. estrutura de páginas;
6. componentes principais;
7. lógica de renderização da árvore;
8. estratégia de responsividade;
9. layout sugerido da home;
10. layout sugerido do admin;
11. código inicial do projeto;
12. schema do banco;
13. exemplos de rotas e componentes;
14. plano para evolução futura.

==================================================
15. DADOS REAIS PARA IMPORTAÇÃO
==================================================

Use os dados abaixo como base inicial do sistema.
Eles representam a árvore genealógica já consolidada e devem ser considerados como seed inicial.

DADOS_FAMILIA = [
  {
    "Nome completo": "Absalon Limeira Souza",
    "Data de nascimento": 1922,
    "Local de Nascimento": "São José do Egito/PE",
    "Data de falecimento": 2004,
    "Local de falecimento": "Paulo Afonso/BA",
    "Cônjuge": "Hilda Barros Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Absalon Limeira Souza Junior",
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Rose",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Absalon Limeira Souza Neto",
    "Data de nascimento": 1996,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza Junior",
    "Mãe": "Rose",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Allexya Barros",
    "Data de nascimento": 2017,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Beto",
    "Mãe": "Tatiane Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Athanase José Sobral Tsangaropoulos",
    "Local de Nascimento": "Garanhuns/PE",
    "Data de falecimento": 2021,
    "Local de falecimento": "Recife/PE",
    "Pai": "Charalambos Athanase Tsangaropoulos",
    "Mãe": "Ivanira Sobral Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Athanase Tsangaropoulos",
    "Cônjuge": "Kondilenia Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Beto",
    "Cônjuge": "Tatiane Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Bianca Ziviane Souza",
    "Data de nascimento": 2024,
    "Local de Nascimento": "Belo Horizonte/MG",
    "Pai": "Yuri Cavalcanti Souza",
    "Mãe": "Mulher de Yuri",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Caio Cavalcanti Souza",
    "Data de nascimento": 1983,
    "Local de Nascimento": "Recife/PE",
    "Pai": "Mário Assis Barros Souza",
    "Mãe": "Márcia Cavalcanti Barros",
    "Cônjuge": "Teca",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Camilla Barros de Souza Leal",
    "Data de nascimento": 1986,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Ildo",
    "Mãe": "Maria Acilda de Souza Barros",
    "Cônjuge": "Peu",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Cecília Viana Souza",
    "Data de nascimento": 2020,
    "Local de Nascimento": "Belo Horizonte/MG",
    "Pai": "Caio Cavalcanti Souza",
    "Mãe": "Teca",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Charalambos Athanase Tsangaropoulos",
    "Data de nascimento": 1902,
    "Local de Nascimento": "Drama (Grécia)",
    "Data de falecimento": 1988,
    "Local de falecimento": "Recife/PE",
    "Pai": "Athanase Tsangaropoulos",
    "Mãe": "Kondilenia Tsangaropoulos",
    "Cônjuge": "Ivanira Sobral Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Charalambos Athanase Tsangaropoulos Neto",
    "Data de nascimento": 1991,
    "Local de Nascimento": "Recife/PE",
    "Pai": "Fábio Heron Sobral Tsangaropoulos",
    "Cônjuge": "Mulher de Babinho",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Condilênia Maria Tsangaropulos Souza",
    "Data de nascimento": 1963,
    "Local de Nascimento": "Garanhuns/PE",
    "Data de falecimento": 2009,
    "Local de falecimento": "Natal/RN",
    "Pai": "Charalambos Athanase Tsangaropoulos",
    "Mãe": "Ivanira Sobral Tsangaropoulos",
    "Cônjuge": "Márcio Ailton Barros Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Constantino Sobral Tsangaropoulos",
    "Data de nascimento": 1964,
    "Local de Nascimento": "Garanhuns/PE",
    "Data de falecimento": 2022,
    "Local de falecimento": "Maceió/AL",
    "Pai": "Charalambos Athanase Tsangaropoulos",
    "Mãe": "Ivanira Sobral Tsangaropoulos",
    "Cônjuge": "Sandra",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Demétrius Tsangaropoulos",
    "Mãe": "Mulher de Babinho",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Eike Souza",
    "Data de nascimento": 2008,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza Junior",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Enildes",
    "Cônjuge": "Marcos Alfredo Barros Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Fábio Heron Sobral Tsangaropoulos",
    "Data de nascimento": 1967,
    "Local de Nascimento": "Garanhuns/PE",
    "Pai": "Charalambos Athanase Tsangaropoulos",
    "Mãe": "Ivanira Sobral Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Filha AA",
    "Data de nascimento": 2020,
    "Pai": "Charalambos Athanase Tsangaropoulos Neto",
    "Mãe": "Mulher de Babinho",
    "Filho (a) de (de sangue; adotivo": "Adotivo",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Glauce Thaís Barros",
    "Local de Nascimento": "Paulo Afonso/BA",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Heitor de Albuquerque Tsangaropoulos",
    "Data de nascimento": 2026,
    "Local de Nascimento": "Natal/RN",
    "Pai": "Tassius Marcius Tsangaropoulos Souza",
    "Mãe": "Layana Medeiros de Albuquerque",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Hilda Barros Souza",
    "Data de nascimento": 1929,
    "Local de Nascimento": "Cocal/PE",
    "Cônjuge": "Absalon Limeira Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Ildo",
    "Cônjuge": "Maria Acilda de Souza Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Inácio Leal de Carvalho",
    "Data de nascimento": 2019,
    "Local de Nascimento": "Aracaju/SE",
    "Pai": "Peu",
    "Mãe": "Camilla Barros de Souza Leal",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Ivanira Sobral Tsangaropoulos",
    "Cônjuge": "Charalambos Athanase Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Kondilenia Tsangaropoulos",
    "Cônjuge": "Athanase Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Laís Cavalcanti Barros",
    "Data de nascimento": 1985,
    "Local de Nascimento": "Recife/PE",
    "Pai": "Mário Assis Barros Souza",
    "Mãe": "Márcia Cavalcanti Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Layana Medeiros de Albuquerque",
    "Cônjuge": "Tassius Marcius Tsangaropoulos Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Leonardo Barcelos Lara",
    "Data de nascimento": 1984,
    "Local de Nascimento": "Porto Alegre/RS",
    "Cônjuge": "Tulius Márcio Tsangaropoulos Souza",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Márcia Cavalcanti Barros",
    "Cônjuge": "Mário Assis Barros Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Márcio Ailton Barros Souza",
    "Data de nascimento": 1962,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Condilênia Maria Tsangaropulos Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Marcos Alfredo Barros Junior",
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Marcos Alfredo Barros Souza",
    "Mãe": "Enildes",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Marcos Alfredo Barros Souza",
    "Data de nascimento": 1966,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Data de falecimento": 2026,
    "Local de falecimento": "Recife/PE",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Enildes",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Maria Acilda de Souza Barros",
    "Data de nascimento": 1949,
    "Local de Nascimento": "Arcoverde/PE",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Ildo",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Maria Acileide Barros Souza",
    "Data de nascimento": 1952,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Mário Assis Barros Souza",
    "Data de nascimento": 1963,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Márcia Cavalcanti Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Mauro Alberto de Souza Barros",
    "Data de nascimento": 1964,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Absalon Limeira Souza",
    "Mãe": "Hilda Barros Souza",
    "Cônjuge": "Núbia",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Mulher de Babinho",
    "Cônjuge": "Charalambos Athanase Tsangaropoulos Neto",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Mulher de Yuri",
    "Cônjuge": "Yuri Cavalcanti Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Núbia",
    "Cônjuge": "Mauro Alberto de Souza Barros",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Peu",
    "Data de nascimento": 1966,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Cônjuge": "Camilla Barros de Souza Leal",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Populos",
    "Data de nascimento": 2019,
    "Local de Nascimento": "Rio de Janeiro/RJ",
    "Pai": "Tulius Márcio Tsangaropoulos Souza",
    "Mãe": "Leonardo Barcelos Lara",
    "Humano ou pet": "Pet"
  },
  {
    "Nome completo": "Priscilla Tsangaropoulos",
    "Pai": "Constantino Sobral Tsangaropoulos",
    "Mãe": "Sandra",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Rafaela Santos de Souza",
    "Data de nascimento": 1982,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Mauro Alberto de Souza Barros",
    "Mãe": "Núbia",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Renata Santos de Souza",
    "Data de nascimento": 1986,
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Mauro Alberto de Souza Barros",
    "Mãe": "Núbia",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Rose",
    "Local de Nascimento": "Paulo Afonso/BA",
    "Data de falecimento": 2023,
    "Local de falecimento": "Paulo Afonso/BA",
    "Cônjuge": "Absalon Limeira Souza Junior",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Sandra",
    "Cônjuge": "Constantino Sobral Tsangaropoulos",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Sofia Ziviane Souza",
    "Data de nascimento": 2024,
    "Local de Nascimento": "Belo Horizonte/MG",
    "Pai": "Yuri Cavalcanti Souza",
    "Mãe": "Mulher de Yuri",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Tassius Marcius Tsangaropoulos Souza",
    "Data de nascimento": 1993,
    "Local de Nascimento": "Natal/RN",
    "Pai": "Márcio Ailton Barros Souza",
    "Mãe": "Condilênia Maria Tsangaropulos Souza",
    "Cônjuge": "Layana Medeiros de Albuquerque",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Tatiane Barros",
    "Local de Nascimento": "Paulo Afonso/BA",
    "Pai": "Marcos Alfredo Barros Souza",
    "Mãe": "Enildes",
    "Cônjuge": "Beto",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Teca",
    "Cônjuge": "Caio Cavalcanti Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Titus Marcius Tsangaropoulos Souza",
    "Data de nascimento": 1992,
    "Local de Nascimento": "Natal/RN",
    "Pai": "Márcio Ailton Barros Souza",
    "Mãe": "Condilênia Maria Tsangaropulos Souza",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Tomás Viana Souza",
    "Data de nascimento": 2020,
    "Local de Nascimento": "Belo Horizonte/MG",
    "Pai": "Caio Cavalcanti Souza",
    "Mãe": "Teca",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Tulius Márcio Tsangaropoulos Souza",
    "Data de nascimento": 1989,
    "Local de Nascimento": "Recife/PE",
    "Pai": "Márcio Ailton Barros Souza",
    "Mãe": "Condilênia Maria Tsangaropulos Souza",
    "Cônjuge": "Leonardo Barcelos Lara",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  },
  {
    "Nome completo": "Yuri Cavalcanti Souza",
    "Data de nascimento": 1984,
    "Local de Nascimento": "Recife/PE",
    "Pai": "Mário Assis Barros Souza",
    "Mãe": "Márcia Cavalcanti Barros",
    "Cônjuge": "Mulher de Yuri",
    "Filho (a) de (de sangue; adotivo": "Sangue",
    "Humano ou pet": "Humano"
  }
]

==================================================
16. O QUE VOCÊ DEVE FAZER AGORA
==================================================

Com base em tudo acima, faça o seguinte:

1. proponha a melhor arquitetura para esse sistema;
2. defina o schema do banco;
3. explique como transformar esses dados em pessoas + relacionamentos;
4. proponha a biblioteca ideal para renderizar a árvore;
5. explique como lidar com múltiplos vínculos e dados incompletos;
6. desenhe a estrutura das páginas;
7. proponha o layout da home e do painel admin;
8. gere a base inicial do projeto com Next.js + TypeScript + Supabase;
9. inclua seed/importação inicial com os dados acima;
10. organize a resposta de forma prática, como se eu fosse começar o projeto agora.