# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. Não representa a etapa atual e não deve ser usada por
> `/executar-bloco`. A seleção ou promoção de um item atualiza `state.md`.
> Itens presentes neste arquivo não estão ativos.
> Somente uma alteração explícita em `state.md` promove um item.

## Próximos blocos

1. **Hardening estrutural pré-Sprint 4**
 — Notion: H.4.1–H.4.9 + H.3.1

  Objetivo:
  reduzir acoplamento estrutural e repetição antes da abertura do
  domínio Certification, sem reestruturar o monólito nem introduzir
  abstrações genéricas.

  Bloqueantes antes da Sprint 4:
  - matriz/guardrail de dependências entre domínios;
  - guardrails frontend;
  - ownership de rotas nested;
  - infraestrutura mínima de teste das abstrações compartilhadas;
  - SearchableTableFrame.

  Pilotos / não bloqueantes:
  - DTO sem service locator;
  - helper multipart;
  - paridade de traduções;
  - builders de testes backend.

  Fora de escopo:
  - Repository sobre Eloquent;
  - CRUD base genérico;
  - tabela universal;
  - split massivo de DTOs;
  - split físico imediato dos locales.
2. **Arquivados e restauração de soft-delete**

    —  Notion: H.5.1–H.5.4

    Objetivo:
    tornar o lifecycle de archive/restore explícito e seguro por agregado.

    Ordem:
    1. semântica;
    2. Actions;
    3. endpoints;
    4. UI.

    Fora de escopo:
    - forceDelete;
    - exclusão permanente.
3. **Administração · Roles e permissões — redesenho de composição**
   — o protótipo tem layout dividido (lista de roles à esquerda; detalhe + matriz de permissões à
   direita, com marcação de permissão essencial); o real tem tabela + diálogo. **Não é refinamento
   visual, é redesenho de tela** — exige brainstorming. Task Notion relacionada: "Tela de
   Administração — Roles e Permissões". Respeitar ADR-07 (permissões essenciais não editáveis).
4. **Bloco 7 · Sprint 4 · Certificação**
   — templates, PDF e endpoint público QR. Contexto: `adrs.md` (ADR-08/10), `der-fisico`
   (`certificates`, `certificate_sequences`) e lição sobre snapshot do template no ato da emissão.
5. **Hardening**
   — ownership em rotas nested e política de retenção documental.

## Módulos ainda não implementados (feature, não ajuste visual)

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir, e nenhum tem bloco definido.

- **Dashboard** — protótipo tem 4 KPIs, gráfico de turmas, gráfico de certificados, tarefas
  pendentes, alertas recentes e estados sem dados. Real: saudação + subtítulo (17 linhas).
- **Pessoas · Alunos**~~ — entregue em 2026-07-27 (`plans/archive/2026-07-27-bloco-alunos-modulo.md`).
- **Certificados** — já coberto pelo Bloco 7.
- **Perfil do Usuário** - página dedicada para usuário (administrativo e redator), visualizando seu perfil e dados.

## Futuros dependentes de decisão

- **FUT-1:** templates de documento de turma gerados via código — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com
  a Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
- **FUT-2:** refino de ancoragem cross-módulo — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.

## Débitos técnicos

- **Lição 13 é reincidente e ainda não tem mecanismo — proposta aguardando decisão do João.** O
  padrão "texto afirmando o que o repositório não faz" apareceu **3 vezes** no review de
  `hardening-estrutural-pre-sprint-4` (Q-2: o comentário do `eslint.config.js` afirmando cobrir
  caminho relativo; Q-3: `CLAUDE.md` §6 e `frontend-fsliced.md` §Comandos negando o test runner
  recém-instalado; Q-7: o JSDoc de `startEdit` prometendo guarda por entidade) e foi o Q-1 do bloco
  anterior (`abstracao-componentes-catalog`: a régua de ~150 linhas que não existia em rule nenhuma).
  Duas sprints consecutivas, mesma classe — pela cláusula de reincidência do `/revisar-sprint`, quer
  mecanismo, não correção uma a uma. **Proposta:** um teste que asserte que todo comando citado nos
  `§Comandos` das rules e no `CLAUDE.md` §6 existe como script em `package.json`/`composer.json`, e
  vice-versa. Fecharia o Q-3 em definitivo e é a fatia verificável do problema; o resto da lição 13
  (afirmação em prosa) não é automatizável e segue dependendo do review. Proposta feita em
  2026-08-04, **não construída** — o João aprovou os 7 achados, não o mecanismo.

- **Catraca do `max-lines`: 4 componentes legados acima da régua de 150 linhas.** A regra
  `max-lines` (150) sobre `src/features/*/components/**` nasceu em 2026-08-03 (Q-1 do
  `abstracao-componentes-catalog`) com `ignores` para os 4 que já estavam acima: `StudentDialog`
  (189), `RedatorDialog` (189), `RedatorDocumentSlot` (175), `BudgetDetailPage` (171). Enquanto a
  lista existir, o lint verde afirma menos do que parece — mesmo padrão da catraca de
  query-em-componente, zerada em 2026-08-03. Lista que só encolhe: não acrescente arquivo para calar
  o lint. Saída: extrair o bloco coeso de cada um nos moldes já provados
  (`ContactFields`/`ContactCard`, `ModuleFields`/`ModuleCard`), um arquivo por commit, saindo dos
  `ignores` no mesmo commit — DoD é comportamento idêntico na tela, não lint verde.
- **B-7 — falha de GET de cursos se disfarça de lista vazia no `QuoteWizard`.**
  `QuoteWizard.tsx:23` usa `courses.data ?? []`: um 403/rede na listagem de cursos deixa o passo 1
  sem nenhum curso, `canAdvance` nunca liga e **nenhuma mensagem aparece** — o usuário lê "não há
  cursos" onde houve falha. `QuotesList.tsx:33` tem a versão branda do mesmo (`?? '—'` no nome do
  curso). É a D16/D11 outra vez, agora em `commercial`; o `BudgetsTable.tsx:36` já trata (a falha da
  query auxiliar conta como falha da tabela). Achado B-7 do `/revisar-frontend` de `commercial`
  (2026-08-03), **mantido fora do bloco por decisão do João**: muda comportamento de propósito e não
  cabe num DoD de "comportamento idêntico". Saída: distinguir loading / erro-com-Reintentar / vazio
  de verdade, como já se faz nas tabelas.
- **Q-16 — `PrimaryContactService`/`PrimaryAddressService` sem lock: dois writes concorrentes podem
  deixar dois principais.** `ensureSingle()` lê os principais com `SELECT` comum (sem `lockForUpdate`)
  e sem travar o `Client`. Dois `PUT`/`POST` concorrentes promovendo endereços/contatos distintos
  podem cada um enxergar só o próprio principal marcado, não achar conflito e ambos commitarem como
  principais. Achado pela segunda lente (Codex) no review de correção de `hardening-debitos-integridade`
  (2026-08-01, commit `ca02c9b`) — mesmo padrão em `PrimaryContactService`, já em produção, não
  introduzido por este bloco. Não bloqueou o fechamento por proporcionalidade (~10 usuários internos,
  mesma classe de decisão do Q-5) e porque corrigir exigiria lock do `Client` nos dois serviços, escopo
  maior que a correção pontual de rota que motivou o achado. Saída provável: `lockForUpdate()` no
  `Client` (não só na coleção) antes do `ensureSingle()`, nos dois serviços juntos.
- **Q-6 — idioma das mensagens de `ValidationException` é inconsistente no repo.** Commercial escreve em
  PT (`DeleteQuoteAction`, `DeleteClientContactAction`), Operation em ES (`Turma`, `ConcludeTurmaAction`)
  — o usuário chileno lê um ou outro conforme o endpoint. Pré-existente, não introduzido pelo bloco;
  levantado no segundo review (2026-08-01) porque o 422 novo de contatos tem uma única mensagem e ela é
  a que o cliente vê. Exige decisão do João sobre o idioma canônico antes de valer a pena unificar.
- **Guardrail das leis §5 (P-04).** Leis invioláveis hoje são instrução em `CLAUDE.md`, não mecanismo
  — "lei que precisa valer sempre quer Arch test ou hook, não parágrafo" (lição 14). Instalar Pest
  Arch tests cobrindo DDD-lite/sem-Repository, auditoria só na aplicação e demais leis testáveis no
  backend, mais `eslint-boundaries` para a regra de dependência do frontend (features não importam
  PrimeReact direto nem outra feature). Gatilho em `pendencias.md` P-04: reavaliar em 2026-08-15.
- **Q-14 — `AppErrorState` não sinaliza "reintentando".** `AppErrorState.tsx:36`: o botão Reintentar
  não recebe estado de refetch nem `disabled`, então cliques repetidos disparam refetch em série sem
  nenhum feedback. Achado 🟢 do `/revisar-sprint` da Parte 4 (2026-07-27); o João optou por não
  corrigir na parte. Exige propagar `isFetching` do consumidor até o componente.
- **Q-15 — faixa de rodapé conta 0 durante o load inicial.** `AppDataTable.tsx:106`: `paginator`
  liga junto com `footerCount` mesmo em `loading`, então a faixa afirma "0 registros" sob a overlay
  do PrimeReact antes de o GET terminar. Cosmético; a overlay cobre. Achado 🟢 do `/revisar-sprint`
  da Parte 4 (2026-07-27), deferido pelo João.
- **Cor fora do corte do D18.** Os 6 diálogos de feature ficaram com cor Tailwind hardcoded
  (`text-slate-500`, `text-slate-400` no `RoleDialog`, entre outros) — o D18 cortou o escopo em
  `shared/ui` + os 3 arquivos do D14 de propósito. Achado Minor do review final da Parte 4, não é
  esquecimento.
- **Toggle da sidebar sem efeito abaixo de 1024px, corrompendo o estado persistido.** O D17 fez a
  `Sidebar` forçar `collapsed` por media query sem escrever no `uiStore`, então abaixo de 1024px o
  botão de toggle continua clicável, não muda nada na tela e ainda assim inverte o `sidebarCollapsed`
  persistido — o usuário volta ao desktop com a sidebar no estado oposto ao que deixou. Trade-off
  previsto e adiado de propósito pela Task 37 ("travar o toggle agora seria decisão nova"); achado
  Important do review final da Parte 4, **João decidiu manter como está em 2026-07-27**. Saídas a
  avaliar: esconder o toggle abaixo do breakpoint, ou desacoplar o colapso por viewport do estado
  persistido.
- **Shell fora de conformidade com o ADR-16 §4 — exceção deliberada.** `Sidebar.tsx` e
  `AppLayout.tsx` usam pares Tailwind de cor hardcoded (`bg-gray-200 dark:bg-slate-900`,
  `border-slate-400 dark:border-slate-800`, `bg-slate-50 dark:bg-slate-950`, `text-slate-400`) em vez
  das CSS vars do Lara. `AppHeader` não tem altura explícita e o logo usa `ml-15 h-30` (120 px).
  **Não corrigir sem decisão:** o João aprovou a aparência atual do shell (2026-07-26) e trocar por
  CSS var a mudaria. Registrado para que a divergência não seja lida como esquecimento.
- **`last_login` não existe** — nenhuma ocorrência em `backend/app/` nem em
  `backend/database/migrations/`; `UserData` não tem o campo. O "último acesso" que o protótipo mostra
  na tela de Usuários exige coluna nova, captura no login e exposição no DTO. Task de backend, não
  de UI.
- Decidir assimetria entre camadas: a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- Consolidar as migrations adicionais nas originais antes de subir para produção, conforme decisão
  do João no Bloco 2.
- Bloco 5.2a (minors do review final): `SuperadminGuard` sem teste do caso superadmin inativo;
  `UserData::fromModel` chama `getRoleNames()` duas vezes; unicidade de RUT/email do
  `UpdateStaffUserAction` roda fora da transação; auto-colisão no update sem teste; teste do 422 de
  `redator` não afirma a chave `role`.
- Bloco 5.2b (minors do review final): testes de falha de `CreateRoleAction`/`UpdateRoleAction` não
  afirmam a chave do error-bag; decisão pendente do João sobre `GET /api/roles` permitir a admin
  comum enumerar permissões do superadmin enquanto `/api/permissions` é superadmin-only.
- Bloco visual · Parte 1 (Q-1 do `/revisar-sprint`, adiado pelo João em 2026-07-26): CTA duplicado
  quando `ClientsTable`/`BudgetsTable` estão genuinamente vazias — `AppCardToolbar` (`end={actions}`)
  e `AppEmptyState` (`action={actions}`) renderizam o mesmo botão nos dois lugares ao mesmo tempo.
  Não pegou no DoD porque o `OperationDemoSeeder` nunca zera as duas tabelas. Escolher um lugar só
  para o botão (`ClientsTable.tsx:36,59`, `BudgetsTable.tsx:69,94`).
- **Alunos · o dropdown de empresa depende de uma permissão de outro módulo.** O módulo de alunos
  inteiro é gated por `identity.user.*` (D8 da spec, e é o que o `StudentController` exige), mas o
  dropdown de empresa do create lista via `clientsApi`, que exige `commercial.client.view`. Quem tem
  `identity.user.create` sem `commercial.client.view` consegue criar aluno pela API e não consegue
  pela tela. Duas tentativas de contornar na UI foram revertidas por serem piores que o problema
  (gate duplo no botão escondia a ação de quem tinha autorização real, `3e0bc36`; travar o submit
  por `isError` bloqueava com lista utilizável em cache, `03280c6`). O estado atual é o menos ruim:
  a falha fica **visível** (dropdown desabilitado + motivo + "Reintentar"), não escondida.
  **Alinhar de verdade exige decisão do João sobre RBAC/spec** — endpoint de clientes sob
  `identity.user.view`, permissão nova, ou aceitar o acoplamento. Levantado no `/revisar-sprint` do
  `bloco-alunos-modulo` (2026-07-27); movido para cá para não morrer no arquivamento do `state.md`.
