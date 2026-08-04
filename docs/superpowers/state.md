---
schema_version: 1
active_feature: hardening-estrutural-pre-sprint-4
active_work_item: hardening-estrutural-pre-sprint-4
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
active_spec: docs/superpowers/specs/2026-08-03-hardening-estrutural-pre-sprint-4-design.md
active_plan: docs/superpowers/plans/2026-08-03-hardening-estrutural-pre-sprint-4.md
context_packet: docs/superpowers/context-packets/hardening-estrutural-pre-sprint-4.md
blocker: null
resume_state: null
last_completed_work_item: abstracao-componentes-catalog
state_basis_commit: bfe9051
updated_at: 2026-08-03T23:55:00-03:00
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

## Bloco ativo — `hardening-estrutural-pre-sprint-4`

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-03** (`/planejar-bloco`
com o escopo nomeado no argumento). O item entrou no `backlog.md` na mesma sessão, por edição dele;
o commit desta transição carrega a edição do backlog junto para que o ponteiro do estado não aponte
para item ausente no `HEAD`.

**Rota `context_required`, decidida pelo João:** o item referencia as tasks Notion
`H.4.1–H.4.9 + H.3.1`, fonte externa — o Context Packet é gerado pelo Codex (`lotus-context-packet`,
sandbox read-only) antes de qualquer brainstorming. Diferente dos 4 blocos anteriores, todos sem
packet por serem 100% frontend com fonte no próprio código.

**Context Packet gerado pelo Codex em 2026-08-03** (`lotus-context-packet`, sandbox read-only,
`base_commit` `563e78c`), `status: ready` — 7 fontes, todas `retrieved`, nenhuma `unavailable`:
as 10 tasks Notion (`H.3.1` + `H.4.1`–`H.4.9`) pela base canônica por ID, mais 4 alvos do Drive.
**O Drive não tem documento que delimite este hardening** — buscas dirigidas no V2 voltaram só
ADRs, Certification e setup, então o detalhamento operacional mais recente é o do Notion, sujeito
às restrições dos ADRs. Sem conflito Drive↔repo.

**Achado do packet, não resolvido de propósito:** o backlog lista 5 bloqueantes + 4 pilotos = 9
itens, mas o conjunto Notion referenciado tem **10** tasks. A que não aparece em nenhuma das duas
listas é **`H.4.5` — revisar aliases `useXPage`, eliminando-os ou justificando orquestração real**
(depende de H.4.4). Incluí-lo ou não é decisão do brainstorming.

**Corte decidido no brainstorming de 2026-08-03, pelo João:** entram **H.4.1** (matriz de
dependências entre domínios + `DomainDependencyTest`), **H.4.2** (as 3 fronteiras do frontend viram
`no-restricted-imports`) e **H.4.3** (vitest + regressão de `useTableFilter` e `useCrudPage`).
Critério escolhido: *o que fica caro de corrigir depois*, não *o que impede escrever Certification*.
Ficam fora, nominalmente: H.3.1, H.4.4, H.4.5, H.4.6, H.4.7, H.4.8, H.4.9 — os sinais de aceite de
cada um seguem no packet.

**Decisões que moldaram o bloco.** A classificação dos 42 imports cross-domain (21 pares) **não
achou acoplamento indevido** — todos são fluxo do processo, Identity como dono de pessoa, ou relação
Eloquent inversa que o ADR-02 permite; então H.4.1 entrega teste + doc, e `git diff -- backend/app/`
fica vazio. Descoberta que virou a espinha: os 42 imports atingem **3 das 10 camadas** (`Models` 29,
`Services` 8, `Enums` 5), uma superfície pública de fato que nunca tinha sido declarada. Pest **não
está instalado** (75 arquivos PHPUnit), então o Arch test é PHPUnit próprio; `eslint-boundaries`
também fica fora — são 3 fronteiras, não uma hierarquia.

**Achado do João durante o brainstorming, absorvido pelo bloco:** `TurmasTable` e `BudgetsTable`
mostravam "Sem resultados para os filtros aplicados" com o dropdown em "Todos" e busca vazia. Causa
**provada no source** do `primereact` instalado (`dropdown.cjs.js:1441`), não por hipótese: sem a
prop `optionValue`, o `onChange` devolve o **objeto da opção** quando `option.value` é vazio por
`ObjectUtils.isEmpty` — e `isEmpty(null)` é `true`. Isso derrubou a tese inicial de "zero pixel
muda": o bloco volta a ter um checkpoint visual, pequeno (2 telas).

**Spec revisada pelo João em 2026-08-03**, com 3 correções que viraram D5b (a detecção cobre FQN
inline e group `use`, não só linhas `use`), D6b (H.4.1 corrige as 2 contradições de
`estrutura-monolito.md` sobre a própria regra que automatiza) e D16 (`filtering` mudar de dono é
mudança de contrato, e vai para o JSDoc e para a `frontend-fsliced.md`).

**Plano:** 9 tasks (0 branch · 1 matriz · 2 docs+P-04 · 3 lint · 4 vitest+`useTableFilter` ·
5 `useCrudPage` · 6 fix do empty state · **7 checkpoint visual do João** · 8 gate),
`executor: claude` — a matriz é decisão de arquitetura, as sondas de lição 10 exigem julgar se a
falha veio pelo motivo certo, e a Task 7 é gate humano.

## Último item fechado — 2026-08-03

`abstracao-componentes-catalog` — **item 4 do `backlog.md`, selecionado explicitamente pelo João em
2026-08-03**, logo depois do `/revisar-frontend` de `features/catalog` da mesma sessão. Spec aprovada
(D1–D10, §4 com 13 invariantes, §5 com o gate) e plano executado em **8 tasks** via `/executar-bloco`
+ `executing-plans` inline (`executor: claude` — sem task delegada ao Codex: frontend sem test
runner, DoD é comportamento idêntico provado na tela, cada extração exigiu decidir na hora se o
markup era cópia literal).

**Sem context packet** (`context_packet: null`): a fonte foi o código de
`frontend/src/features/catalog/`, a rule `.claude/rules/frontend-fsliced.md` e o relatório do
`/revisar-frontend` da mesma sessão — nada de Drive/Notion/Figma.

**Escopo entregue (5 tasks de conteúdo).** Task 1 (C-3/C-4): `CoursesTable.tsx:87` — o template
literal quebrado (`` `pi pi-book }` ``) virou `"pi pi-book"` e o hex `'#25A5E4'` hardcoded virou
`BRAND_COLOR` de `@shared/config/brand`, ambos no-op visual por construção. Task 2 (B-1):
`modulesTotal`/`hoursMismatch` subiram do `CourseDialog` para o `useCourseForm` — o `reduce` que
vivia em componente agora mora no hook, dono de `form.modules`/`form.workload_hours`. Task 3 (C-1):
o quadro de módulos (76 linhas, 5 campos por item) virou `ModuleFields` (lista, `key={i}`, add,
totais) + `ModuleCard` (um módulo, `index` fechado nos handlers) — molde `ContactFields`/
`ContactCard` do `ClientDialog`, `Fragment` no lugar de `<div>` (os filhos são irmãos diretos do
`section` com `space-y-4`). Task 4 (B-2): a navegação do olho (`useNavigate`/`usePermissions`/
`openRedator`) subiu para o `useCourseRedatores(enabledIds, onClose)`, que passou a expor
`canOpenRedator` e `openRedator`; `onClose` roda antes do `navigate`. Task 5 (C-2): a seção de
redatores (ternário de 4 ramos: loading > erro > create > view/edit) virou `CourseRedatoresSection`
— não achatada em guarda sequencial, o 3º ramo é modo de diálogo, não estado de carga. B-3
(`enabledIds` alias) desapareceu como efeito colateral da Task 5; os `r.id as number` ficaram
concentrados no `CourseRedatoresSection` (ajuste da D8, fora do escopo mexer no `generated.ts`).

`CourseDialog.tsx` foi de **251 para 96 linhas**.

Branch `refactor/abstracao-componentes-catalog` a partir do `main` (D1, sem worktree — DoD provado
na tela contra o `docker compose` do main tree), 5 commits de conteúdo (`9bc5973`..`c78d719`).

**Prova visual em 1 checkpoint (D10), sem baseline capturada** (mesma limitação dos blocos
anteriores — sem ferramenta de browser/screenshot na sessão; a checagem "na tela" de cada task
individual foi substituída por revisão de diff literal linha a linha, com a prova real reservada
para este checkpoint único): Cursos (busca, os 2 empty states, ícone na cor de marca), diálogo
**create** (add/mover/remover módulo, total, aviso âmbar sem bloquear submit, grid de redatores
selecionável), **view** (leitura, olho leva a `/personas?redator=<id>`, "sem redatores" quando
vazio), **edit** (campos e módulos editáveis, redatores em leitura), **erro** de redatores com
Reintentar (backend derrubado e restaurado) — **aprovado pelo João em 2026-08-03**.

**Gate automatizado (Task 7):** `pnpm build` + `pnpm lint` verdes; diffs de `backend/`, `shared/`,
`locales/` e `generated.ts` vazios; greps de query-em-componente, `primereact` direto,
cross-feature, `#25A5E4` fora de `shared/config/brand.ts`, `pi-book }` quebrado e `reduce(` em
componente — todos sem saída; `CourseDialog.tsx` em 96 linhas (abaixo de 100); nenhum órfão
(`ModuleFields`, `ModuleCard`, `CourseRedatoresSection` com exatamente 1 consumidor cada;
`modulesTotal`, `hoursMismatch`, `canOpenRedator`, `openRedator` todos com leitor); suíte backend
**372 passed (1360 assertions)**, igual à baseline — sem regressão. Pint **n/a** (zero arquivo de
`backend/` no diff); `typescript:transform` **n/a** (nenhum DTO tocado).

**Review em 2026-08-03 (`/revisar-sprint`, baixo risco** — 100% frontend, zero arquivo de `backend/`,
`generated.ts`, locales, auth, RBAC, schema ou dinheiro no diff, `executor: claude`; só lente Claude,
sem Codex). Órfãos: nenhum — os 10 arquivos de `catalog` com consumidor, os 3 componentes novos com
exatamente 1 cada. Leis §5: sem violação.

**As extrações foram provadas literais, não assumidas.** Comparação normalizada do `main` contra os
arquivos novos: `ModuleCard` é **idêntico byte a byte** às linhas 97-170 do `CourseDialog` original,
com exatamente 4 linhas divergentes — todas previstas (`key={i}` migrou para o `.map`; `i === 0` /
`i === length-1` viraram `isFirst`/`isLast`; os 3 handlers viraram props). `ModuleFields` preserva a
ordem dos blocos (vazio → lista → add → total → aviso). `CourseRedatoresSection` difere do ternário
original só pelas chaves `{...}` de interpolação JSX que somem ao virar `return` — os 4 ramos na
mesma ordem, cada um produzindo um elemento, DOM sem nó novo. Fidelidade ao molde confirmada:
`fieldErrors?: Record<string, string[]> | null` é a assinatura exata do `ContactCard`/`ContactFields`,
e `ReturnType<typeof useCourseRedatores>` tem precedente em `RedatorDesignation.tsx`
(`useRedatorPicker`), com os 7 campos do hook consumidos. Descartados antes de virar achado:
`enabledIds` chegar ao hook e ao componente não pode divergir (mesma `form.redator_ids`, mesmo
render, D3); derivação sem `useMemo` é o comportamento de antes.

**1 achado 🟡, aprovado pelo João e corrigido na mesma sessão** (`58ce5d8`):

- **Q-1 🟡** A **régua de ~150 linhas não existia.** A spec §1 deste bloco abre citando "251 linhas
  … contra a régua de ~150 **da rule**", e o `state.md` do bloco anterior a cita igual — mas
  `grep -niE "régua|~1[0-9]{2}|tamanho"` na `frontend-fsliced.md` voltava **vazio**, e
  `pendencias.md` também não a registrava (lição 13: doc que descreve intenção não-construída).
  Pior, o padrão que ela deveria conter — bloco coeso preso dentro de componente grande — custou
  **três blocos consecutivos** de refactor: `abstracao-componentes-operation` (2026-08-02),
  `zerar-catraca-e-componentes-commercial` e este. Pela cláusula de reincidência do `/revisar-sprint`
  + lição 14, virou **mecanismo**: `max-lines` (150) em `eslint.config.js` sobre
  `src/features/*/components/**`, mais o texto correspondente na rule (com os moldes
  `ContactFields`/`ContactCard` e `ModuleFields`/`ModuleCard`, e a regra do `Fragment` na extração).
  O limite saiu da distribuição real, não de chute: 53 dos 57 componentes de feature já ficavam
  abaixo dele. Entrou com **catraca** de 4 legados (`StudentDialog` 189, `RedatorDialog` 189,
  `RedatorDocumentSlot` 175, `BudgetDetailPage` 171), lista que só encolhe. **Bloco de config
  separado** do `no-restricted-syntax` de propósito — `ignores` compartilhados reabririam em silêncio
  a catraca de query-em-componente zerada em 2026-08-03.
  **Provado nos dois sentidos (lição 10):** com a catraca esvaziada, reprovou exatamente os 4, com as
  contagens batendo o `wc -l` (`File has too many lines (171|175|189|189). Maximum allowed is 150`);
  sonda temporária de 160 linhas em `catalog/components/Course/` reprovou **com a catraca ativa**
  (prova de que ela não acoberta arquivo novo); a **mesma** sonda movida para `catalog/hooks/` ficou
  em silêncio, confirmando o escopo — hook longo é legítimo, componente inchado não. Sonda apagada,
  árvore limpa.

**Revalidação pós-correção:** `pnpm build` + `pnpm lint` verdes; todos os greps do DoD rerodados
limpos; os 4 diffs proibidos (`backend/`, `shared/`, `locales/`, `generated.ts`) seguem vazios; placar
da catraca reconferido em exatamente 4 arquivos, sem drift.

**Divergência de DoD, resolvida pelo próprio Q-1:** `CoursesTable.tsx` ficou com 125 linhas — acima
do "~110" que a spec §5 pedia. Não era dívida deste bloco (124 no `main` antes da Task 1; a +1 é o
import do `BRAND_COLOR`, e o escopo era a linha 87, não a estrutura do arquivo). O número "~110" da
spec era régua avulsa de um bloco; o mecanismo do Q-1 fixa a régua do projeto em **150**, e
`CoursesTable` passa nela com folga. Não há dívida aberta aqui.

**Gate de fechamento (2026-08-03).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o critério é comportamento idêntico na tela, provado pelo João no checkpoint único (D10), aprovado em
2026-08-03; a única mudança depois dele foi `58ce5d8` (Q-1), que tocou **apenas** `eslint.config.js` e
`.claude/rules/frontend-fsliced.md` — nenhum componente, confirmado por `git show --name-only` no
fechamento — então a aprovação visual continua válida, diferente do bloco do redator, onde o markup
mudou de forma e a prova teve de ser refeita. A metade mecanismo foi **reprovada de novo no próprio
fechamento (lição 10)**: sonda de 160 linhas em `catalog/components/Course/` devolveu
`File has too many lines (160). Maximum allowed is 150  max-lines` **com a catraca ativa** (ela não
acoberta arquivo novo), e a **mesma** sonda em `catalog/hooks/` ficou em silêncio (escopo correto —
hook longo é legítimo); sondas apagadas, árvore limpa. Placar da catraca reconferido pelo `wc -l`:
exatamente os 4 arquivos de `ignores` acima de 150 (`StudentDialog` 189, `RedatorDialog` 189,
`RedatorDocumentSlot` 175, `BudgetDetailPage` 171), sem drift; `CourseDialog` em 96 linhas.
Suíte backend **372 passed (1360 assertions)** como regressão; `pnpm build` + `pnpm lint` verdes;
Pint **n/a** (zero arquivo de `backend/` no diff); `generated.ts`, locales e `shared/` sem diff e
nenhum DTO tocado, logo sem `typescript:transform`; greps das leis §5.6 (`primereact` direto,
cross-feature) e do DoD (query-em-componente, `#25A5E4` em `features/`) sem saída; sem órfão — os 3
componentes novos com exatamente 1 consumidor cada e os 4 campos novos de hook com leitor.
Pendências: nenhum gatilho vencido (o mais próximo é P-04, 2026-08-15) e nenhuma pendência nova — a
catraca de `max-lines` nascida aqui é item de código e foi para §Débitos técnicos do `backlog.md`,
não para `pendencias.md`. **P-25 segue aberta:** o `frontend-fsliced.md` foi tocado, mas no parágrafo
da régua de tamanho, não no da fronteira de tipo que fecharia o gatilho dela.

Código morto: nenhum. O `frontend/src/features/operation/components/.gitkeep`, que o fechamento
anterior registrou como órfão com deleção não commitada no working tree do João (lição 9), **foi
deletado por ele em `e236aa0`**, commit anterior a esta branch — a pendência não existe mais.

Arquivado: `plans/archive/2026-08-03-abstracao-componentes-catalog.md` ·
`specs/archive/2026-08-03-abstracao-componentes-catalog-design.md` (sem context packet — a fonte foi
o código de `features/catalog/`, a rule `frontend-fsliced.md` e o relatório do `/revisar-frontend` da
mesma sessão).

**Aberto, registrado, não resolvido:** a catraca de 4 legados do `max-lines` (§Débitos técnicos do
`backlog.md`); o B-7 (`courses.data ?? []` no `QuoteWizard`); e P-25.

## Penúltimo item fechado — 2026-08-03

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
