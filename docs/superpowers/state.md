---
schema_version: 1
active_feature: catalog
active_work_item: abstracao-componentes-catalog
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
active_spec: docs/superpowers/specs/2026-08-03-abstracao-componentes-catalog-design.md
active_plan: docs/superpowers/plans/2026-08-03-abstracao-componentes-catalog.md
context_packet: null
blocker: null
resume_state: null
last_completed_work_item: zerar-catraca-e-componentes-commercial
state_basis_commit: ce674af
updated_at: 2026-08-03T19:25:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Estado atual — `ready_for_execution`

`abstracao-componentes-catalog` — **item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-03**, logo depois do `/revisar-frontend` de `features/catalog` da mesma sessão (o item nasceu
nesta sessão, a partir do relatório desse review, e foi promovido no mesmo commit).

**Sem context packet** (`context_packet: null`): a fonte é o código de
`frontend/src/features/catalog/`, a rule `.claude/rules/frontend-fsliced.md` e o relatório do
`/revisar-frontend` da mesma sessão — nada de Drive/Notion/Figma. Mesmo desenho dos dois blocos
anteriores da família.

Escopo bruto (a spec decide o corte): C-1 `ModuleFields`/`ModuleCard` do `CourseDialog`; C-2
`CourseRedatoresSection`; C-3 template literal quebrado em `CoursesTable.tsx:87`; C-4 `'#25A5E4'`
hardcoded na mesma linha vs. `BRAND_COLOR`; B-1 derivação `modulesTotal`/`hoursMismatch` para o
`useCourseForm`; B-2 navegação `openRedator` para o `useCourseRedatores`; B-3 micros que dobram nos
anteriores. Lei §6 já está limpa em `catalog` — não há achado bloqueante.

Spec aprovada em 2026-08-03 (D1–D10, mais §4 com 13 invariantes de comportamento e §5 com o gate) e
plano escrito em **8 tasks**: Task 0 branch · Task 1 C-3/C-4 (`CoursesTable:87`) · Task 2 B-1
(derivação para o `useCourseForm`) · Task 3 C-1 (`ModuleFields` + `ModuleCard`) · Task 4 B-2
(navegação para o `useCourseRedatores`) · Task 5 C-2 (`CourseRedatoresSection`) · Task 6 checkpoint
visual (D10, gate humano) · Task 7 gate automatizado + transição.

`executor: claude`, sem task delegada ao Codex: o frontend não tem test runner, o aceite é
comportamento idêntico julgado na tela, e cada extração exige decidir na hora se o markup é cópia
literal ou mudou de forma. `paths_autorizados`: n/a.

Ajuste da D8 no mesmo commit do plano: o cast `r.id as number` **não** vai para o hook (exigiria
`RedatorData.id` não-opcional no `generated.ts`, fora do escopo) — concentra-se no
`CourseRedatoresSection`. Só o alias `enabledIds` desaparece.

Próxima ação: `/executar-bloco abstracao-componentes-catalog`.

## Último item fechado — 2026-08-03

`zerar-catraca-e-componentes-commercial` — item 4 do `backlog.md`, selecionado explicitamente pelo
João em 2026-08-03 depois do `/revisar-frontend` de `features/commercial` da mesma sessão. Spec
aprovada (D1–D9) e plano executado em 12 tasks (Task 0 branch + 9 de conteúdo + 2 checkpoints + Task
10 mecanismo + Task 11 gate) via `/executar-bloco` + `executing-plans` inline (`executor: claude` —
sem task delegada ao Codex: frontend sem test runner, DoD é comportamento provado na tela, e o bloco
toca `eslint.config.js` e `.claude/rules/`).

**Sem context packet** (`context_packet: null`): a fonte foi o código de
`frontend/src/features/commercial/` (mais 1 arquivo de `catalog` e 2 de `identity`), o
`eslint.config.js` e o relatório do `/revisar-frontend` da mesma sessão — nada de Drive/Notion/Figma.

**O item 4 do backlog mudou de forma nesta sessão, por decisão do João.** O antigo item 4 ("Zerar a
catraca de query-em-componente") **não estava feito** — `eslint.config.js` ainda listava os 7
`ignores` — e foi **absorvido**, não fechado: o bloco cobriu os 7 arquivos das 3 features
(`catalog`, `commercial`, `identity`) mais a estrutura de `commercial`.

**Escopo entregue — duas metades provadas na mesma tela.**

*Metade 1 — catraca zerada nos 7 arquivos.* Cada um saiu de `ignores` no mesmo commit que perdeu a
query para um hook novo: `useCommercialClients` (`BudgetsTable` + `BudgetDialog`, 2 consumidores —
único hook do bloco com mais de um), `useQuoteCourseSearch` (`QuoteWizard`), `useQuoteFiles` +
`useQuotesListCourses` (`QuotesList`, fatiado em 2 por responsabilidade — D4), `useCourseRedatores`
(`catalog/CourseDialog`, preserva os 3 estados loading/erro/lista — D11 do bloco de cards),
`useStaffRoleOptions` (`identity/StaffUserDialog`, filtro de `redator` RN-01 viaja com a query),
`useStudentClients` (`identity/StudentDialog`, preserva o `enabled: mode === 'create'` condicional e
a distinção erro-de-GET vs. lista-vazia). Nenhum hook expõe `isError` onde o comportamento de hoje é
`?? []` silencioso (`useQuoteCourseSearch`, `useQuotesListCourses`) — isso é o B-7, fora do corte.

*Metade 2 — estrutura de `commercial` (B-1 a B-6), fechada nas mesmas 4 telas.* `EMPTY_ADDRESS`
deixou de existir em dois lugares — `useClientForm` devolve `addr` resolvido, `ClientDialog` só
consome. `ClientGeneralFields` + `ContactCard` tiraram o `ClientDialog` de 199 para 132 linhas.
`QuoteRow`, `CourseStep`/`DataStep` e `BudgetDocumentsCard` tiraram bloco coeso de dentro de
`.map`/ternário do `QuotesList`, `QuoteWizard` e `BudgetDetailPage` — markup movido literal, nenhuma
condicional mudou de forma, nenhum `key` mudou de critério.

**Mecanismo (Task 10):** o bloco `ignores` do `no-restricted-syntax` saiu inteiro do
`eslint.config.js` — a regra vale sem exceção para as 3 features. Vista reprovando de novo depois da
remoção (lição 10): violação introduzida de propósito em `BudgetsTable.tsx`, `pnpm lint` reprovou por
esta regra, revertida via `git checkout`. `.claude/rules/frontend-fsliced.md` atualizada: o texto da
catraca vira nota de que foi zerada em 2026-08-03, não reintroduzir `ignores`.

**Fora do corte, registrado:** o B-7 (`courses.data ?? []` no `QuoteWizard` — GET falho vira lista
vazia sem mensagem, `canAdvance` nunca liga) **muda comportamento de propósito**; foi para
§Débitos técnicos do `backlog.md` por decisão do João em 2026-08-03.

Branch `refactor/zerar-catraca-e-componentes-commercial` a partir do `main` (D1, sem worktree — o
bloco toca `eslint.config.js`, que vale para o repositório inteiro, e o DoD se prova na tela contra o
`docker compose` do main tree), 10 commits de conteúdo (`cd486a2`..`a6bc190`).

**Prova visual em 2 checkpoints (D8), sem baseline capturada** (mesma limitação dos blocos
anteriores — sem ferramenta de browser/screenshot na sessão): **CP-1** (depois da Task 6, as 4 telas
de `commercial` já com catraca + estrutura no estado final) — Presupuestos (busca por código/cliente,
filtro de estado, empty states, erro de clientes com Reintentar), diálogo de orçamento (create/edit),
detalhe do orçamento (cotações, upload por linha, card de documentos), diálogo de cliente (endereço,
contatos, foto) — **aprovado pelo João em 2026-08-03**. **CP-2** (depois da Task 9, os 3 diálogos de
fora) — os 3 estados de redatores do diálogo de curso, dropdown de rol sem `redator` no diálogo de
admin, dropdown de clientes + erro + vazio no diálogo de aluno — **aprovado pelo João em 2026-08-03**.
Nenhum checkpoint precisou ser refeito: a Task 10 (depois do CP-2) tocou só `eslint.config.js` e
`.claude/rules/`, nenhum componente.

**Gate automatizado (Task 11):** `pnpm build` + `pnpm lint` verdes; grep de
`use(Query|Mutation)\b|Api\.use` em `features/*/components/` **sem saída** (placar zerado, era 7);
`grep -n "ignores" eslint.config.js` também sem saída — mais forte que o "uma linha" previsto no
plano, porque `globalIgnores` (I maiúsculo) não bate no grep case-sensitive por "ignores" minúsculo,
divergência de redação da spec/plano, não de comportamento — confirmado com `-in` que só resta o
`globalIgnores(['dist', 'generated.ts'])` de sempre; `git diff --name-only main...HEAD -- backend/`,
`.../locales/` e `.../generated.ts` vazios, `git diff --stat main...HEAD -- frontend/src/shared/`
vazio (nada subiu para `shared/`, D5); nenhum hook ou componente novo órfão (`useCommercialClients`
com 2 consumidores, os outros 6 hooks + os 6 componentes novos com exatamente 1 cada); suíte backend
**372 passed (1360 assertions)**, igual à baseline — sem regressão; Pint n/a (zero arquivo de
`backend/` no diff).

**Review em 2026-08-03 (`/revisar-sprint`, baixo risco** — 100% frontend, zero arquivo de `backend/`,
`generated.ts`, locales, auth, RBAC, schema ou dinheiro no diff, `executor: claude`; só lente Claude,
sem Codex). Órfãos: nenhum — 7 hooks e 6 componentes novos, todos com consumidor
(`useCommercialClients` com 2, o resto com 1), e nenhum campo de retorno sem leitor na tela (D3).
Leis §5: sem violação.

Gate da Task 11 reconferido do zero, não aceito por relatório: `pnpm build` + `pnpm lint` verdes;
greps de query-em-componente, `ignores`, `primereact` direto e cross-feature sem saída; diffs de
`backend/`, locales, `generated.ts` e `shared/` vazios; `ClientDialog` em 132 linhas.
**Mecanismo reprovado de forma independente (lição 10):** sonda temporária em
`features/commercial/components/Budget/` com `clientsApi.useList()` + `useQuery` + `useMutationErrors`
— o lint reprovou as duas primeiras e **não** reprovou a terceira, confirmando que a regra vale sem
`ignores` e que o falso positivo do `useMutationErrors` segue protegido; sonda apagada.

Conferidos linha a linha contra o `main`: as 6 extrações são movimento literal (nenhuma condicional
mudou de forma, nenhum `key` mudou de critério; `ClientGeneralFields` devolve Fragment, sem nó DOM
novo), e as 9 invariantes de comportamento da §4 da spec sobreviveram uma a uma — `enabled: mode ===
'create'` e `unusable`/`showEmptyHint` do aluno, `loadError`/`retry` duplo da tabela, `sizeError`
zerado antes da mutation e `isUploading` por linha, os 3 estados de redatores, o filtro `!== 'redator'`
(RN-01). O `?? []` do B-7 não virou tratamento de erro em lugar nenhum (risco §8 não materializado).
Descartado antes de virar achado: `clientsApi` no `ClientDialog` é `keys.all` (invalidação, não query);
as duas chamadas de `clientsApi.useList()` são dedupe do TanStack pela mesma key, decidido na D2.

**2 achados 🟢, ambos aprovados pelo João e corrigidos na mesma sessão** (`5e74a28`):

- **Q-1 🟢** `catalog/api/useCourseRedatores.ts` exportava `useSyncCourseRedatores` e passou a colidir
  de basename com o hook novo `catalog/hooks/useCourseRedatores.ts` — o import só se distinguia pelo
  segmento de pasta. Renomeado para `api/useSyncCourseRedatores.ts`; a colocação já estava certa pela
  rule (`api/` = sub-recurso, `hooks/` = derivação de tela), o nome é que não dizia o conteúdo. Um
  único importador (`useCourseForm.ts`), sem barrel.
- **Q-2 🟢** `enabledRedatores` era re-alias puro de `redatores.enabledRedatores` no `CourseDialog`,
  resíduo da extração da query, convivendo com `redatores.allRedatores` lido direto no mesmo arquivo.
  Os 2 usos passam a ler do hook.

**Revalidação pós-correção:** `pnpm build` + `pnpm lint` verdes; todos os greps do DoD rerodados
limpos; `enabledIds` segue com uso legítimo (`selected` do `RedatorCard`, linha 219). **A aprovação
visual do CP-2 continua válida:** a correção do `CourseDialog` é substituição de identificador por
seu próprio valor (`enabledRedatores` === `redatores.enabledRedatores`), com JSX renderizado idêntico
por construção — diferente do bloco do redator, onde o markup mudou de forma e a prova teve de ser
refeita.

**Gate de fechamento (2026-08-03).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
a metade visual é comportamento idêntico na tela, provado pelo João nos CP-1 e CP-2, ambos aprovados
em 2026-08-03; a única mudança depois do CP-2 foi `5e74a28` (Q-1/Q-2 do review), substituição de
identificador pelo próprio valor mais um rename de arquivo — JSX idêntico por construção, então a
aprovação visual continua válida, diferente do bloco do redator, onde o markup mudou de forma e a
prova teve de ser refeita. A metade mecanismo foi reprovada de novo no próprio fechamento (lição 10):
sonda temporária em `features/commercial/components/Budget/` com `clientsApi.useList()` + `useQuery` +
`useMutationErrors` — `pnpm lint` devolveu `2 problems (2 errors, 0 warnings)`, um por violação real,
**zero** no `useMutationErrors`; sonda apagada, árvore limpa. Suíte backend **372 passed (1360
assertions)** como regressão; `pnpm build` + `pnpm lint` verdes; Pint **n/a** (zero arquivo de
`backend/` no diff); `generated.ts` e locales sem diff e nenhum DTO tocado, logo sem
`typescript:transform`; greps do DoD e das leis §5.6 rerodados limpos; sem órfão. Pendências: nenhum
gatilho vencido (o mais próximo é P-04, 2026-08-15) e nenhuma pendência nova — a dívida que este
bloco fechou (catraca de `ignores`) era item de código no `backlog.md`, não pendência documental.
**P-25 segue aberta:** o `frontend-fsliced.md` foi tocado, mas no parágrafo da catraca, não no da
fronteira de tipo que fecharia o gatilho dela.

Código morto mencionado, não deletado (é de fora deste bloco): `frontend/src/features/operation/components/.gitkeep`
está com deleção **não commitada** no working tree do João desde o início da sessão — a pasta já tem
arquivos reais desde o bloco de `operation`, então o `.gitkeep` é órfão de fato, mas é WIP dele
(lição 9) e não entrou em nenhum commit deste fechamento.

Arquivado: `plans/archive/2026-08-03-zerar-catraca-e-componentes-commercial.md` ·
`specs/archive/2026-08-03-zerar-catraca-e-componentes-commercial-design.md` (sem context packet — a
fonte foi o código de `features/commercial`, o `eslint.config.js` e o relatório do
`/revisar-frontend` da mesma sessão).

**Aberto, registrado, não resolvido:** o B-7 (`courses.data ?? []` no `QuoteWizard`) em §Débitos
técnicos do `backlog.md`; P-25; e a régua de ~150 linhas do `frontend-fsliced.md`, agora atingida no
`ClientDialog` (132).

## Penúltimo item fechado — 2026-08-02

`abstracao-componentes-operation` — item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-02 ao invocar `/planejar-bloco` com o título do item. Saída do `/revisar-frontend` de
`features/operation` da mesma sessão: 3 achados C (violam a rule `frontend-fsliced.md`) + 3 B, lei
§6 limpa. Spec aprovada (D1–D11) e plano executado em 10 tasks via `/executar-bloco` +
`executing-plans` inline (`executor: claude` — sem task delegada ao Codex, frontend sem test
runner, DoD é comportamento idêntico provado na tela).

**Sem context packet** (`context_packet: null`): a fonte foi o código de
`frontend/src/features/operation/` e o relatório do `/revisar-frontend` da mesma sessão.

**Escopo entregue (6 achados fechados).** `useTableFilter` (`shared/hooks`) ganha `searchable`
opcional — os 7 consumidores antigos não mudaram uma linha (D4), prova por diff vazio; a aba
Alumnos (`EnrollmentTable`) vira o 8º consumidor e perde o `useState`/clamp/`onPage` copiados à mão
(C-2). A query do curso desce de `TurmaConfigCard` para `useTurmaConfigForm`, que expõe
`workloadHours` (C-1, mesmo achado do Q-4 do bloco anterior). `useImportStudentsFlow` novo absorve
mutation/`result`/`sizeError`/`close` do `ImportDialog` (C-3, molde `useEnrollStudentFlow`). O
ternário de 4 níveis do picker de redator vira `PickerBody` com guardas sequenciais erro > loading >
vazio > lista (B-1, mesma lição do Q-2/`SlotBody` do bloco anterior). `useTurmaManualOpener` novo
absorve mutation do blob, refs de objectURL/aba e cleanup de unmount do `ManualButton` (B-2). O
handler de upload de 13 linhas do `DocumentTypeCard` sobe para `handleUpload` acima do `return`,
sem hook — estado local que não cruza componente (B-3, D8).

Branch `refactor/abstracao-componentes-operation` a partir do `main` (D2, sem worktree — bloco toca
`shared/hooks/useTableFilter.ts`, e o DoD se prova na tela contra o `docker compose` do main tree),
7 commits de conteúdo (`7c25a47`..`2b95687`).

**Prova visual em 2 checkpoints (D11), sem baseline capturada** (mesma limitação do bloco anterior —
sem ferramenta de browser/screenshot na sessão): **CP-1** (depois das Tasks 1–4) — carga horária em
Configuración, paginação/clamp de Alumnos, diálogo de import nos 3 casos — **aprovado pelo João em
2026-08-02**. **CP-2** (depois das Tasks 6–8) — os 4 estados do picker de Redator (erro/loading/
vazio/lista), upload/remoção/Manual em Documentación — **aprovado pelo João em 2026-08-02**.

**Gate automatizado (Task 10):** `git diff --name-only main...HEAD -- backend/` vazio (D1, bloco
100% frontend); `git diff --name-only main...HEAD -- frontend/src/shared/config/locales/` vazio
(D10, zero chave i18n nova); `git diff --stat main...HEAD -- frontend/src/features/catalog/
frontend/src/features/commercial/ frontend/src/features/identity/` vazio e `TurmasTable` fora do
diff (D4, os 7 consumidores antigos de `useTableFilter` intocados); grep de
`use(Query|Mutation)\b|Api\.useList` em `features/operation/components/` sem saída; grep de
`useState(0)` devolve só `TurmaDetailPage.tsx` (índice de aba, não paginação); greps da lei §6
(`primereact` direto, import cross-feature) limpos; `pnpm build` + `pnpm lint` verdes; suíte backend
**372 passed (1360 assertions)**, igual à baseline — sem regressão.

**Review em 2026-08-02 (`/revisar-sprint`, baixo risco — 100% frontend, sem schema/auth/RBAC/
`generated.ts`/dinheiro, `executor: claude`; só lente Claude, sem Codex).** Órfãos: nenhum (cada
hook novo com exatamente 1 consumidor). Leis §5: sem violação. Conferidos linha a linha contra o
`main`: retrocompatibilidade do `useTableFilter` (com `searchable` presente o caminho é idêntico;
ausente com termo não-vazio degrada para `rows = scoped` e **não** estoura); `rows === enrollments`
por referência no `EnrollmentTable`, com clamp e `onPage` idênticos aos apagados; markup de
`PickerBody`/`ManualButton`/`handleUpload` como cópia literal. A única condicional que mudou de
forma — `course ? …` → `f.workloadHours != null ? …` — foi checada nos 4 casos: `workload_hours: 0`
segue renderizando "0 horas" (o `??` não coage zero, o `!= null` não o rejeita) e curso não
resolvido segue `—`; o único caso divergente é inalcançável (`workload_hours` é `number` não-nulo em
`generated.ts:57`) e vai na direção conservadora. Descartado antes de virar achado: expor
`setSizeError` cru do `useImportStudentsFlow` **segue** o molde declarado — `useEnrollStudentFlow`
já expõe `setRut`.

**1 achado, aprovado pelo João e resolvido na mesma sessão — e não era defeito deste diff:**

- **Q-1 🟡** "query em componente de feature" é **padrão reincidente em 2 sprints** (Q-4 do
  `abstracao-componentes-redator`/`RedatorCourseSelector`; C-1 deste bloco/`TurmaConfigCard`) e
  sobrevivia em **7 pontos** de `catalog`/`commercial`/`identity`. A rule existia, mas era parágrafo,
  e o grep do DoD era por-pasta — só provava a feature recém-limpa. Pela cláusula de reincidência do
  `/revisar-sprint` + lição 14, virou **mecanismo**: `no-restricted-syntax` em `eslint.config.js`
  sobre `src/features/*/components/**`, reprovando `xxxApi.useAlgo()` e `useQuery`/`useMutation`
  diretos. **Provado nos dois sentidos** (lição 10): dispara no violador real (`QuoteWizard.tsx:20`
  e `QuotesList.tsx:23`, des-ignorados temporariamente) e **não** dispara no `useMutationErrors` da
  linha 28 do mesmo arquivo — o falso positivo que o `\b` do grep original protegia, aqui protegido
  pelo `$` da regex. Entrou com **catraca**: os 7 legados em `ignores`, lista que só encolhe, para o
  `pnpm lint` não quebrar na hora. Texto correspondente na `.claude/rules/frontend-fsliced.md`; o
  esvaziamento da lista é bloco próprio no `backlog.md` (**item 4** depois do fechamento deste).

**Revalidação pós-correção:** `pnpm build` + `pnpm lint` verdes; DoD 6–11 reconferidos e intactos —
`backend/` e locales sem diff, as 3 features consumidoras de `useTableFilter` ainda com diff
**zero** (as correções tocaram só `eslint.config.js`, `.claude/rules/` e `docs/`), greps de
query-em-componente, `primereact` direto e cross-feature limpos, `useState(0)` só no
`TurmaDetailPage` (índice de aba).

**Gate de fechamento (2026-08-02).** Suíte backend **372 passed (1360 assertions)** como regressão;
`pnpm lint` e `pnpm build` verdes; Pint **n/a** (zero arquivo de `backend/` no diff); `generated.ts`
sem diff e nenhum DTO tocado, logo sem `typescript:transform`; greps do DoD e da lei §5.6 rerodados
limpos; sem órfão (cada hook novo com exatamente 1 consumidor). **Item 0 do gate** — o critério de
aceite é comportamento idêntico na tela, provado pelo João nos checkpoints CP-1 e CP-2, ambos
aprovados em 2026-08-02; a única mudança depois do CP-2 foi o commit `1825162` (Q-1), que tocou
apenas `eslint.config.js`, `.claude/rules/` e `docs/` — nenhum componente — então a aprovação
visual continua válida, diferente do bloco do redator, onde o markup mudou e a prova foi refeita.
Pendências: nenhum gatilho vencido (o mais próximo é P-04, 2026-08-15) e nenhuma pendência nova —
o débito nascido aqui (catraca de `ignores`) é item de código e foi para o `backlog.md`. P-25 segue
aberta: o texto que este bloco acrescentou ao `frontend-fsliced.md` é sobre query-em-componente, não
sobre a direção de dependência que fecharia o gatilho dela.

Nota registrada e resolvida no fechamento: o item removido do `backlog.md` descrevia o C-2 como
"`searchable` aceita `() => []`" — desenho que a D4 rejeitou em favor do parâmetro opcional; o texto
saiu com o item (lição 13).

Arquivado: `plans/archive/2026-08-02-abstracao-componentes-operation.md` ·
`specs/archive/2026-08-02-abstracao-componentes-operation-design.md` (sem context packet — a fonte
foi o código de `features/operation/` e o relatório do `/revisar-frontend` da mesma sessão).

**Aberto, registrado, não resolvido:** a catraca de 7 componentes legados em `ignores` do
`no-restricted-syntax` (bloco próprio no `backlog.md`); cor Tailwind hardcoded em 4 arquivos de
`Enrollment`/`Document` e `turma.id!` em 5 pontos, ambos fora do corte por decisão da spec; P-25.
