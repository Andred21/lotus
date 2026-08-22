---
schema_version: 2
mode: multi-lane
focused_lane: lane-a
active_feature: null
active_work_item: feedbacks-resolver-escopo
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md
active_plan: docs/superpowers/plans/2026-08-22-feedbacks-resolver-escopo.md
context_packet: docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md
blocker: null
lanes:
  lane-a:
    active_work_item: feedbacks-resolver-escopo
    workflow_state: ready_for_execution
    next_owner: claude
    next_action: execute_active_plan
    tree: main-tree
    branch: null  # feat/feedbacks-resolver-escopo, criada na execução
    active_spec: docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md
    active_plan: docs/superpowers/plans/2026-08-22-feedbacks-resolver-escopo.md
    context_packet: docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md
    blocker: null
    resume_state: null
  lane-b:
    active_work_item: infra-producao-runtime-e-aws
    workflow_state: context_required
    next_owner: codex
    next_action: generate_context_packet
    tree: ../lotus-infra
    branch: infra/producao-runtime-e-aws
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
  lane-c:
    active_work_item: BD-15-docs-guardrails-e-sincronizacao
    workflow_state: context_required
    next_owner: codex
    next_action: generate_context_packet
    tree: ../lotus-bd15
    branch: docs/bd15-guardrails-e-sincronizacao
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
last_completed_work_item: bd12-load-state-e-listas
state_basis_commit: c8480eee
updated_at: 2026-08-22T11:20:00-03:00
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

- **Modo multi-lane (desde 2026-08-22):** existe no máximo um `active_work_item` **por lane**; as
  lanes ativas vivem em `lanes:` no frontmatter. Os estados da tabela acima valem por lane.
- Os campos singulares do topo **espelham** a lane apontada por `focused_lane` — é o que
  `/planejar-bloco` e `/executar-bloco` leem; eles operam sempre sobre a lane em foco. Trocar o
  foco é fronteira durável: espelho + `lanes:` mudam no mesmo commit.
- `next_action` deve corresponder a `workflow_state` (em cada lane).
- `active_plan` é obrigatório a partir de `ready_for_execution` (em cada lane).
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- **Gate de árvore por lane:** bloco que toca backend roda no main tree (o compose monta o main
  tree — P-03). Só há uma lane de backend, então a P-03 não é disparada. Worktree é para lane que
  não depende do compose; se precisar subir stack no worktree, vale o precedente de override de
  portas + projeto compose próprio (2026-08-19), decidido no planejamento da lane.
- `docs/superpowers/**` (estado, specs, planos, packets, fichas, backlog) muda somente pelo main
  tree; branch de lane em worktree não toca esses arquivos. Exceção: entregável de doc do próprio
  BD-15, nos paths que o plano da lane-c autorizar.
- **Planejamento é serial** (brainstorming com o João, um bloco por vez) e **integração é serial**
  (uma lane faz merge por vez; após cada merge as demais rebasam antes de continuar). Só a
  execução sobrepõe.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística. Divergência **entre lanes** (mesmo arquivo, mesma decisão) bloqueia as lanes
  envolvidas.
- O backlog nunca promove trabalho automaticamente.

## Seleção multi-lane — 2026-08-22: três blocos promovidos em paralelo

Decisão explícita do João (sessão 2026-08-22): desenvolver blocos em paralelo com worktrees.
Três itens da fila consolidada (`backlog.md@ba59dbd9`) promovidos de uma vez — frentes
disjuntas, colisão mínima de arquivos:

| Lane | Bloco (item da fila) | Frente | Árvore | Branch |
|---|---|---|---|---|
| `lane-a` | `feedbacks-resolver-escopo` (1) | Backend | main tree (gate P-03) | `feat/feedbacks-resolver-escopo`, na execução |
| `lane-b` | `infra-producao-runtime-e-aws` (10) | Infra | `../lotus-infra` | `infra/producao-runtime-e-aws` |
| `lane-c` | `BD-15-docs-guardrails-e-sincronizacao` (14) | Docs | `../lotus-bd15` | `docs/bd15-guardrails-e-sincronizacao` |

- As três lanes nascem em `context_required` — os três blocos exigem Context Packet.
- O gate main-tree/worktree do `/executar-bloco` fica satisfeito sem reabrir a P-03: uma única
  lane de backend, e ela no main tree. O override de portas de 2026-08-19 não é necessário aqui;
  se a lane-b precisar subir o stack do worktree para provar imagem/compose, o planejamento dela
  decide o arranjo (projeto compose próprio + portas próprias, como no precedente).
- Worktrees criados a partir de `main@c8480ee`; **rebase obrigatório** antes de a execução da
  lane começar e antes de cada merge.
- Ordem de planejamento (serial): `lane-a` → `lane-b` → `lane-c`. Execuções sobrepõem depois que
  cada plano fica pronto.
- Interseções conhecidas a vigiar: `lane-c` (BD-15/D-17) e a futura CI (item 11) tocam
  `.github/workflows`; `generated.ts` só regenera na lane-a. Nada disso colide entre as três
  lanes ativas.

## Trabalho ativo — `lane-c` · `BD-15-docs-guardrails-e-sincronizacao`

### Seleção — 2026-08-22

Item 14 do `backlog.md`, **promovido explicitamente pelo João em 2026-08-22** com a árvore em
`idle`. O `/planejar-bloco` foi invocado duas vezes com o slug correto e **barrou nas duas**: em
`idle` o comando mostra a fila e pede seleção, nunca promove. A promoção veio de duas decisões
dele, tomadas com o custo de cada rota na mão:

- **Rota `context_required`**, que é o que a linha do backlog declara (`Contexto: sim`). A metade
  do bloco que mais pesa — `P-31` (sync ADR-16↔Drive), `P-18`/`P-22` (Notion) e a lista de
  sincronização obrigatória `8.4.0–8.4.7` / `8.5.1–8.5.9` / `9.1.4` — tem fonte **fora** do
  repositório. Planejar sem packet transformaria essa metade em limitação declarada.
- **Esta worktree** (`/home/jvbat/projetos/lotus-bd15`, branch `docs/bd15-guardrails-e-sincronizacao`,
  zero commit à frente da `main` em `c8480eee`). O bloco é docs/mecanismos; enquanto não tocar
  `backend/`, o gatilho da **P-03** não vence. Se a `D-17` virar arch test em PHP, a árvore se
  rediscute **antes** da task, não durante.

Escopo herdado da fila, sem edição: `P-20`, `P-21`, `P-23`, `P-31`, `P-32`, `P-39`, `P-43`,
`P-18`, `P-22`, `D-17`, mais a sincronização obrigatória do Notion. A ficha da `P-32` **veta**
desenhar seletor por classe sem reincidência medida ou decisão explícita do João — restrição que
entra no packet e no brainstorming como está escrita.

**Próxima ação:** Codex gera o Context Packet pela skill `lotus-context-packet`
(`.agents/skills/`), em sandbox read-only, sem alterar arquivo nem estado.

## Último item fechado — 2026-08-22 (`bd12-load-state-e-listas`, BD-12 dos blocos de dívida)

### Merge da `main` — 2026-08-22: a árvore que a prova exigia

O João mandou trazer a `main` **antes** da prova de fechamento, e o motivo é medido: a `main` fechou
o **BD-18** em paralelo e o `ca096650` reescreveu a mensagem de falha dentro de `CourseStep.tsx` —
exatamente o sítio que a P-40 mede. Provar sem o merge teria provado código que não vai para a
`main`. A nota do próprio `backlog.md` de lá já dizia isso: *"o alcance de D-55 e P-40 se remede
contra a árvore com o BD-18 dentro, não contra o basis"*.

23 commits, **um único conflito** — o `updated_at` do frontmatter do `state.md` —, resolvido para o
desta árvore. Todo o resto mesclou limpo, `.claude/rules/frontend-fsliced.md` incluído: os dois lados
escreveram em regiões diferentes do mesmo arquivo. `backlog.md`, `historico/progress.md` e
`pendencias/` vieram inteiros da `main`. Árvore mesclada: `pnpm lint` 0, `pnpm build` verde,
**87 arquivos / 481 testes**, zero falha — o `cellMemo={false}` não regrediu nenhuma das 26 provas
novas do BD-18.

### Fechamento — 2026-08-22: os dois débitos provados no navegador, contra a árvore mesclada

**Item 0 do gate, na tela e não no diff** (Chromium, Vite desta árvore na **5174**, API real em
`:8080`, sessão de admin; a 5174 está em `SANCTUM_STATEFUL_DOMAINS` desde `6fd0ad8`):

- **D-55, o sujeito** — em `/cursos`, visão `Archivados`, a célula `Archivado el` do curso arquivado
  em 2026-08-18 acompanhou a troca de idioma **pelo menu, sem F5**, nos três idiomas: `18-08-2026`
  (es-CL) → `8/18/2026` (en) → `18/08/2026` (pt-BR), com o cabeçalho indo junto (`Archivado el` →
  `Archived on` → `Arquivado em`). Antes do knob o cabeçalho trocava e o valor congelava.
- **D-55, os controles positivos** — em `/administracion`, `Último acceso` foi de
  `22-08-2026 01:59 a. m.` para `8/22/2026 01:59 AM` e o `AppTag` de estado de `Activo` para
  `Active`, na mesma troca. Os dois congelavam pelo mesmo motivo e destravaram pelo mesmo knob: o
  alcance é o wrapper, não a coluna de arquivamento.
- **D-55, o controle negativo** — `ArchivedQuotesList` (layout flex, **fora** de DataTable) seguiu
  trocando ao vivo: `Archivado el: 22-08-2026` → `Archived on: 8/22/2026`. Nada regrediu onde o
  defeito nunca existiu. A cotação usada na sonda foi arquivada e **restaurada** pela própria tela.
- **P-40** — com o catálogo de dev **de fato vazio** (`GET /api/courses` = 200 e `[]`), o passo 1 do
  wizard de cotação mostrou o título `Curso` e **`No hay cursos.`**; `No se pudieron cargar los
  datos` e `Reintentar` **não apareceram** (`find` sem match nos dois), o campo de busca não nasceu e
  `Siguiente` ficou desabilitado. Controle positivo dos dois lados: o mesmo wizard listando os cursos
  antes de esvaziar e depois de restaurar.

**O classificador de auto mode recusou o laço de `curl -X DELETE` sobre os cursos** — a mesma família
de recusa que congelou a P-40 em 2026-08-14, quando o `tinker` foi barrado. Contornada pelo caminho
que o usuário usa: os três cursos foram arquivados e restaurados pela ação `Archivar`/`Restaurar` da
linha, no navegador. A medição é a mesma; o que mudou foi a ferramenta.

**Zero resíduo no banco de dev** (P-44 existe por gates que esqueceram o próprio rastro): ids ativos
`[1,2,3]` antes e depois, `IDENTICO`; o único curso arquivado que sobra é o `GATE T7` de 2026-08-18,
anterior ao bloco; a cotação `Mantenimiento de subestaciones` voltou ativa ao `Scap 1`, que exibe as
3 cotações de novo.

**Resto do gate.** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **87 arquivos / 481 testes**,
zero falha. **`php artisan test`, Pint e `typescript:transform` são N/A por escopo medido**, não por
suposição: `git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo** — mesmo precedente do fechamento do BD-18. Código morto: o bloco criou um
arquivo de teste (consumido pelo runner) e uma prop; nenhum `.gitkeep`, nenhum placeholder, e o
`eslint` reprova import não usado. Leis §5: nenhuma contrariada — a mudança vive em `shared/ui`, sem
schema, sem `generated.ts`, sem Sanctum, RBAC, dinheiro ou certificado.

**Pendências.** A **P-40** foi encerrada por este bloco e está em `pendencias/encerradas.md`, com a
linha do índice acompanhando. A **P-29** e a **P-35** saíram de vez: este é o primeiro fechamento
**posterior** ao do BD-14, que é a condição literal que elas registravam. **Nenhuma pendência nasceu
nesta sprint.** O ponto que o review deixou fora de escopo por decisão do João — `beforeAll` mutando
idioma em `archivedColumns.test.tsx` — **não virou ficha**: o arquivo restaura o idioma no próprio
teste e no `afterAll`, o raio foi medido como zero e transformar em pendência uma decisão de não
corrigir seria criar rastro contra a decisão. Fica registrado aqui; se o João quiser ficha, ela nasce
com gatilho.

**Arquivados:** plano em `plans/archive/2026-08-20-bd12-load-state-e-listas.md` e spec em
`specs/archive/2026-08-20-bd12-load-state-e-listas-design.md`; o link da spec dentro do plano foi
reapontado para o caminho novo. **Backlog:** o bloco BD-12 saiu da fila e a ficha do **D-55** saiu da
lista de débitos técnicos, pelo mesmo padrão do BD-18. Nada foi promovido — a fila só anda por
escolha explícita do João.

**Estado: `idle`.** `state_basis_commit` continua em `fc852ce3`, o commit contra o qual o João
promoveu o BD-12; o SHA deste fechamento não entra no arquivo que ele fecha.

## Penúltimo item fechado — 2026-08-20 (`bd18-useloadstate-promise-e-forma`, BD-18 dos blocos de dívida)

### Seleção — 2026-08-20

**Promoção explícita do João**, com esta árvore em `idle`. O gate do `/planejar-bloco` reprovou o
argumento pelo motivo de sempre: veio o título de seção do backlog (`BD-18 · Frontend · useLoadState:
…`, com separadores e travessão pendurado), não o slug — e `active_work_item` era `null`, então
"corresponder exatamente" também falhava. Nenhum arquivo tocado antes da decisão dele.

**Quatro decisões dele fecharam o gate:** o slug `bd18-useloadstate-promise-e-forma`; **rota direta a
`ready_for_planning`, sem Context Packet** (os três débitos nasceram de medição local — D-54 e D-56 no
review e no fechamento do BD-17, D-14 no review do BD-6 —, e não há fonte externa a recuperar); a
worktree `fix-frontend` seguindo na branch atual `docs/bd18-agrupamento-useloadstate`, que já carrega
o commit de agrupamento do backlog; e o **alcance completo do D-54**, contra o que a ficha registrava.

**Segunda árvore viva, medida e não deduzida:** `/home/jvbat/projetos/lotus` está em
`bd14-contrato-de-entrada`, `workflow_state: ready_for_review`. É bloco de **backend**, então a P-03
não dispara (o gatilho dela são dois blocos de backend) e a única colisão possível é
`docs/superpowers/**`, que sempre colide e é merge mecânico. Sexta exceção declarada à invariante de
um `active_work_item`, por decisão do João.

### Planejamento — 2026-08-20

**O escopo do bloco é maior do que as duas fichas registravam, e isso foi medido antes de desenhar.**
A ficha do D-54 dizia "2 hooks compartilhados e 7 consumidores"; a varredura por forma
(`void <query>.refetch()`) contra `93acf6a7` achou **14 produtores em 12 arquivos**, dos quais
**seis** alimentam um `AppErrorState` de tela cheia — o único componente que de fato aguarda a
promise. **Três travam a promise por TIPO** (`useValidationPage.ts:9`, `useDashboard.ts:48`,
`StudentClientField.tsx:40` declaram `() => void`), onde trocar o corpo sem trocar a assinatura não
mudaria nada. E a ficha errava os sítios de prova: `QuotesList:60`/`:74` e `BudgetDialog:85` são
`InlineLoadState`, cujo botão **não tem estado de carga** — hoje a promise ali não muda nada.

Spec em `specs/archive/2026-08-20-bd18-useloadstate-promise-e-forma-design.md`, oito decisões. As que mudam o
desenho em relação ao que o backlog previa: `listSource` mora em **`shared/hooks`**, não em
`shared/lib` ao lado do irmão `archivableSource`, porque precisa de `@tanstack` e de `ProblemDetails`
e a fronteira `shared/lib` × `shared/api` está registrada em três arquivos (D1); a extração são
**duas** exportações, não uma — `listSource` para os quatro sítios de forma de página e `loadFailure`
para os dois hooks de carga, que falam outra grafia e não caberiam na primeira (D2/§3); e o
`InlineLoadState` entra no bloco com a espera compartilhada, senão a promise recém-corrigida seguiria
descartada em 12 usos (D5).


**Plano em `plans/archive/2026-08-20-bd18-useloadstate-promise-e-forma.md`: 10 tasks, uma por commit.** A
ordem interna que o backlog fixou (D-56 antes de D-54, D-14 por último) é respeitada, e a peça nova
entra antes de todo o resto: extrair o normalizador primeiro faz a promise nascer certa nos sítios de
uma vez, enquanto corrigir a promise antes seria consertar cópias que o passo seguinte apagaria.

**Uma segunda medição durante o `writing-plans` emendou a spec, e a decisão de escopo foi do João:**
a política `loadFailure` está escrita à mão em **12** sítios, não nos 6 que a §3 tabela — os seis
extras (`useEnrollmentSection`, `useTurmaDetail`, `useRedatorPicker`, `useTurmaDocsSection` e os dois
de `useBudgetDetail`) são exatamente os arquivos que a D4 já abre para devolver a promise. **Dois
ficam de fora com motivo declarado:** `useHistorial` e `useEmissionPanelState` escrevem
`isError ? (error ?? null) : null`, que é outra política — devolve `null` onde a nossa devolve `{}` —
e trocá-la mudaria tela sem DoD que o cubra.

**Baseline medida antes da Task 1, não herdada:** `pnpm test` 81 arquivos / 453 testes verdes, lint
exit 0, build verde. O gate da Task 10 cobra 85 / 467.

### Execução — 2026-08-20

**As 10 tasks executadas em `subagent-driven-development`, uma por commit**, de `add3511f` a
`ee650ffb`, na worktree `fix-frontend`. Ledger em `.superpowers/sdd/progress.md`. Gate final:
`pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **84 arquivos / 468 testes**.

**As duas varreduras que fecham os débitos, rodadas antes de a rule ser escrita e reconferidas no
review final:** `grep "isError ? (.*?? ({} as"` e `grep "void .*\.refetch()"` devolvem **zero
linha** fora de teste. `git diff main...HEAD -- backend/ generated.ts` = vazio, então Pint,
`php artisan test` e `typescript:transform` seguem N/A por escopo medido.

**Quatro desvios do plano, todos registrados no ledger com o motivo:** (1) o parâmetro de
`listSource` virou **estrutural** — o `...listSource(query)` do plano não compilava, porque
`useCrudPage`/`useArchivedPage` seguram contrato estreito, e a alternativa era um `as UseQueryResult`
que mentiria sobre os fakes de teste; (2) o `refetch` é **anotado** `(): Promise<unknown>` e não
deixado inferir — o inferido vaza `QueryObserverResult` para cima por `ReturnType<>` e obrigaria
todo stub a montar o resultado inteiro; (3) `InlineLoadState.test.tsx` **já existia** (o mapa do
plano errava), então os testes foram acrescentados e o alvo caiu de 85 para 84 arquivos; (4) um
teste a mais que o previsto, cobrindo o ramo `readOnly` do `RedatorCourseSelector`, por achado de
review de task.

**As contagens intermediárias do plano não fechavam em cadeia** (esqueciam os 5 testes da Task 1).
O alvo final dele — 467 testes — estava certo; ficaram 468 pelo desvio (4).

**DoD end-to-end provado no navegador**, contra a API real em `:8080`, com falha **isolada** por
rota (interceptação no browser, sem derrubar o nginx — o `GET /api/me` sobreviveu e o shell não
redirecionou): (1) o "Reintentar" de tela cheia em `/operacion/turmas/6` fica `disabled` com o GET
**segurado em voo** e volta quando ele responde; (2) o `InlineLoadState` do diálogo de orçamento
fica `disabled` **com spinner** durante todo o voo do `GET /api/clients` e volta depois — é o
comportamento que ele não tinha; (3) com o `GET /api/redatores` falhando e cache em mão, a seção
WRITERS do diálogo de curso **mantém os três redatores** e o aviso vai ao lado, sem o erro de seção
inteira; (4) as cinco telas de arquivados (`/comercial`, `/cursos`, `/personas`, `/operacion`,
`/administracion`) seguem alternando ativo/arquivado com as colunas `Archived on`/`Archived by` e
voltam ao ativo.

**O item não-binário da spec §7 foi conferido e aprovado:** o botão do `InlineLoadState` não tem
`icon`, então o PrimeReact **acrescenta** o spinner à frente do label (`p-button-loading-label-only`)
e ele cresce 24px (83 → 107) durante o voo. Como é o último item da linha, não empurra nada e
continua legível.

**Observação medida, não regressão do bloco:** em `TurmaDetailPage` o "Reintentar" fica `disabled`
por ~300ms e então a tela inteira troca pelo esqueleto, porque o ramo `loading` vem antes do
`loadError` na página. Comportamento pré-existente, fora do escopo do BD-18.

**Review final da branch (`requesting-code-review`, opus): "ready to merge with fixes", sem
Critical.** Os três Important foram fechados no commit `ee650ffb`: a rule ganhou as duas exceções
deliberadas (`useHistorial`/`useEmissionPanelState` devolvem `null` onde a política devolve `{}`), o
`onRetry` de `AdminView`/`PeriodFilter` parou de mentir com `() => void`, e o `useRetryPending`
ganhou `catch` e o registro de por que o `setPending` pós-unmount não é vazamento no React 19. O
terceiro Important era a própria transição de estado, feita aqui. Os Minors e os dois débitos novos
que o review mediu (`StudentDetailSections` como terceiro sítio do D-14; a expressão de mensagem do
aviso repetida em 5 componentes) ficam para a triagem do João no review do bloco.


### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 4 achados, zero violação de lei

**Classificação: BAIXO risco** — frontend puro, `executor: claude`, sem schema, `generated.ts`,
Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado. Os três hooks de `certification` entram
só pelo tipo de retorno do `refetch`. **Uma lente, sem revisão independente do Codex.**

**Fronteira do bloco reconferida:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo**. **Gate re-rodado nesta revisão:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **84 arquivos / 468 testes**. **Órfãos: nenhum** — `listSource`, `loadFailure` e
`useRetryPending` têm consumidor, e as duas varreduras do bloco (`void .*\.refetch()` e
`isError ? (… ?? ({} as`) seguem devolvendo zero linha fora de teste e fora dos dois sítios declarados.

**Zero violação das leis §5** e zero contra o gabarito da `frontend-fsliced.md`: nenhuma feature
importa `primereact` direto nem outra feature, nenhum `useEffect` de reset entrou, e a política de
carga passou a nascer num lugar só, que é o que a rule nova cobra.

**Quatro achados, nenhum 🔴. O João aprovou os quatro, e os quatro foram corrigidos:**

- **Q-1 🟡 P — `StudentDetailSections.tsx:33` é o terceiro sítio do D-14.** Gateia por `detail.isError`
  cru e substitui as DUAS seções; com cache em mão um refetch falho apaga vínculos e turmas já
  carregados. Some com o `useStudentDetail` sendo consumido cru (`useQuery` direto, sem
  `useResourceState`), então a derivação da mensagem também está à mão na feature. Fora do escopo
  declarado do BD-18 — destino natural é o `backlog.md`.
- **Q-2 🟢 P — `useDashboard.ts:182` guarda o último `({} as ProblemDetails)` escrito à mão**, num
  arquivo que ESTE bloco abriu. Não é a ternária que a rule nomeia (o ramo já está dentro de
  `if (query.isError)`), mas é a mesma política; `const falha = loadFailure(query); if (falha) …`
  fecha sem mudar comportamento e deixa a linha da D7 com as duas exceções que ela declara.
- **Q-3 🟢 M — `errorDetail ?? t(errorHint)` está composto à mão em 11 sítios / 7 componentes**, dois
  deles escritos por este bloco. É o D-56 um andar acima, na mensagem em vez da fonte. Contrapeso
  registrado: o docblock do `useLoadState` diz que "a política é de quem IMPRIME". Decisão de
  desenho, não correção — destino natural é o `backlog.md`.
- **Q-4 🟢 P — `AppErrorState` não tem arquivo de teste.** A D5 moveu a espera dele para o
  `useRetryPending`, e a única catraca do comportamento vive no `InlineLoadState.test.tsx`: apagar
  `loading={retry.pending}` do `AppErrorState` não deixa nada vermelho, e são os 6 sítios de tela
  cheia que consomem a promise que o D-54 pagou.

### Correções da revisão — 2026-08-20, quatro commits

`c9245218` (Q-2) · `11df3a72` (Q-4) · `ca096650` (Q-3) · `ce402a95` (Q-1), nessa ordem — o Q-3 vem
antes do Q-1 porque o sítio novo do detalhe do aluno já nasce usando o `loadMessage`.

- **Q-2** — `useDashboard` passa a chamar `loadFailure`; o `if` sobre o retorno substitui o
  `if (query.isError)`, porque a política responde as duas perguntas numa. Comportamento idêntico.
- **Q-4** — `AppErrorState.test.tsx` nasce com a promise controlada do molde do `InlineLoadState`:
  `disabled` durante o voo, livre depois de resolver, clique repetido ignorado, handler `void`
  seguindo, mais os dois ramos básicos.
- **Q-3** — `loadMessage(estado, t)` em `shared/lib/screenDetail.ts`, ao lado das duas metades que
  ele junta, recebendo `t` por parâmetro (`shared/lib` não conhece i18next, mesmo motivo de
  `loadErrorHint` devolver chave). Os **13 sítios de 8 componentes** adotaram; `grep "errorDetail ?? t("`
  fora de teste devolve **uma** linha, que é a do próprio helper. A linha da rule entrou junto,
  no commit que zerou o último sítio — mesma disciplina da D7.
- **Q-1** — `StudentDetailSections` adota `useResourceState`, gateia por `failedWithoutData` e mostra
  um `InlineLoadState` só, acima das duas seções. Catraca nova no molde dos outros dois sítios do
  D-14 (o caso obrigatório é o do ramo COM cache). **`StudentLinkRow` saiu junto**: com o aviso o
  componente passou de 150 linhas e o `max-lines` reprovou — extração literal, nenhuma condicional
  mudou de forma.

**Gate depois das quatro:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **86 arquivos / 479
testes** (eram 84 / 468). As duas varreduras do bloco seguem em zero, e a terceira nasceu com o Q-3.
**Fronteira intacta:** `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
= zero arquivo. **Nada ficou para o `backlog.md`** — os dois achados que a execução tinha deferido
(`StudentDetailSections` e a mensagem repetida) foram exatamente Q-1 e Q-3, e estão pagos.

**Não provado na tela:** as quatro correções têm catraca de teste; o DoD de navegador do bloco foi
provado antes delas, e o Q-1 mudou ramo de tela (`StudentDialog` em modo view, com o
`GET /api/students/{id}` falhando com cache em mão). Conferir no fechamento.

### Fechamento — 2026-08-20

**O que ficou pendente do review foi provado, e é o item 0 do gate:** o ramo do Q-1 na tela, na
árvore `fix-frontend` servida na **5174** (a 5173 é o `pnpm dev` do main tree, hoje em
`feat/bd12-datatable-idioma-e-catalogo-vazio` — provar nela teria provado o código de outro branch;
as duas portas já estão em `SANCTUM_STATEFUL_DOMAINS` e `FRONTEND_URL` desde o `6fd0ad8`). Chromium
contra a API real em `:8080`, com falha isolada por rota (`**/api/students/35` → 500
`application/problem+json`), sem derrubar nada em volta.

**Os três ramos, com a rede confirmando a sequência** (`200` → `500` → `500` → `200` no
`GET /api/students/35`), sobre a aluna Javiera Lagos (1 vínculo, 1 turma):

1. **Falha COM cache — o defeito que o Q-1 pagou.** Reabrir o diálogo com o GET em 500 mantém
   "Company links" (`Enel Distribución · Current · since Aug 2026`) e "Turma history"
   (`Scap 5 - Cot 1 · Seguridad en alta tensión · Jun 2026 · Failed`), e põe **um** aviso `role=alert`
   ACIMA das duas, com "Retry". Antes da correção, o `detail.isError` cru apagava as duas seções.
2. **Retry com a falha persistente** mantém tudo — aviso, vínculos e turmas —, e some quando a rota
   volta: `unroute` + clique devolve `200` e zera o `alert`. É o `refetch` do D-54 devolvendo a
   promise no caminho real.
3. **Falha SEM cache** (recarga com a rota ainda mockada) substitui as DUAS seções pelo
   `AppErrorState` — "Could not load the data" / "Check your connection and try again." / "Retry" —,
   sem cabeçalho órfão. É o `failedWithoutData` e a D16 (vazio silencioso proibido) na tela.

**A mensagem impressa é o hint por status, não o `detail` do servidor** — o `detail` injetado
("Falha injetada no DoD") não aparece, porque o `screenDetail` só o repassa com `localDetail: true`.
Comportamento por desenho, conferido de passagem.

**Gate:** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **86 arquivos / 479 testes**.
Backend **872 passed / 5 skipped, 3095 asserções**, intocado — pelo binário direto com
`memory_limit` elevado, porque o comando do `CLAUDE.md` §6 morreu de novo: é a **P-50**, que ganhou a
reprodução desta árvore com o pico agora **acima** do teto (129,00 MB contra 128M). **Pint e
`typescript:transform` não se aplicam** — `git diff --name-only main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos: nenhum** — `listSource`, `loadFailure`, `useRetryPending`,
`loadMessage` e `StudentLinkRow` têm consumidor. **As três varreduras do bloco seguem em zero fora de
teste**, cada política com uma única linha viva: `listSource.ts:19`, `screenDetail.ts:98`, e nenhum
`void …refetch()`.

**Um aviso de console apareceu e NÃO é deste bloco:** `Each child in a list should have a unique
"key" prop` no `TableBody` da **listagem** de alunos, medido pelo timestamp do log antes da primeira
falha injetada. `StudentsTable.tsx` não está entre os 51 arquivos do bloco. É o mesmo achado
registrado em 2026-08-19 no painel de emissão — mesma classe, segundo sítio.

**Um gatilho de pendência ficou ambíguo e vai para o João, não para o fechamento:** a **P-39** fecha
"quando um bloco tocar RBAC de catálogo **ou reusar a receita de injeção de falha do BD-6**". A
técnica foi reusada aqui (e já tinha sido no DoD da execução e no do BD-17), mas a fonte — o plano
arquivado do BD-6 — **não** foi lida nem reusada, e o próprio corpo da ficha proíbe retro-editá-la
(regra da P-27). O gatilho como está nunca vence por leitura própria; quem decide o que ele quer
dizer é o João. **Nenhuma pendência nasceu nesta sprint** e nenhuma das encerradas venceu a sprint de
rastro (a lista está vazia desde o fechamento anterior).

**Estado ao fechar: `idle`.** O merge com a `main` mudou isso na mesma hora — ver abaixo.

### Merge com a `main` — 2026-08-21: o mesmo trabalho estava agrupado duas vezes

**Duas árvores editaram o mesmo backlog sem se ver, e a colisão é de escopo, não de texto.** Às
**14:57** de 2026-08-20, nesta worktree, o João promoveu o **BD-18** cobrindo D-54, D-56 e D-14 — e
esse commit tirou a D-14 do BD-12. Às **16:33**, no main tree, ele reagrupou o **BD-12** para
*"load-state: o contrato de lista, o `refetch` e os sítios do BD-6"*, cobrindo **D-14, D-54, D-55,
D-56 e P-40**, e o promoveu a `ready_for_planning`. O segundo commit foi escrito sobre um backlog que
não tinha o primeiro: por isso a D-14 reaparece lá e o D-54/D-56 aparecem como órfãos a hospedar.

**Decisão do João no merge: o BD-12 segue promovido, com o escopo reduzido ao que sobrou.** D-14,
D-54 e D-56 estão pagos e provados por este bloco, então saem da cobertura do BD-12, que fica com
**D-55** (o `DataTable` não repinta as células `body` na troca de idioma ao vivo) e **P-40**
(remedição do ramo "catálogo genuinamente vazio" contra HEAD) — dois itens, não cinco. Nenhum dos
dois foi tocado aqui.

**Uma correção de índice entrou junto, e não é achado deste bloco:** o `pendencias/README.md` dizia
"Encerradas (0)" enquanto `encerradas.md` já carregava **P-29** e **P-35**, fechadas no BD-14 — o
fechamento de lá atualizou a ficha e não a linha do índice. As duas **não saem** no fechamento do
BD-18: ele correu em paralelo ao BD-14, não depois dele, e contar este fechamento como a sprint de
rastro apagaria a ficha antes de qualquer bloco posterior a ler.

**`state_basis_commit` continua em `fc852ce3`, que é o que o João escreveu ao promover o BD-12, e
isso é uma ressalva a carregar para o planejamento:** a árvore que o bloco vai medir já inclui o
BD-18, então o alcance de D-55 e P-40 se remede contra o merge, não contra o basis. Trocar o campo
aqui seria escolher por heurística um SHA que ninguém decidiu.

## Antepenúltimo item fechado — 2026-08-20 (`bd14-contrato-de-entrada`, BD-14 do backlog)

### Execução — 2026-08-20: 9 tasks, técnica `subagent-driven-development`, main tree

Bloco de backend, então **main tree** e não worktree (P-03: o compose monta o main tree, e testar
backend em worktree produziria verde contra código diferente). Base da branch `feat/bd14-contrato-de-entrada`:
`0fe30b13`. Ledger task a task em `.superpowers/sdd/progress.md` — aqui fica só o que decide.

As três leis que o bloco construiu:

- **"Ausente não é nulo"** (D1) — `App\Shared\Data\WritableAttributes::from()` tira do array toda
  chave que chega como `Optional`; só `null` explícito apaga. Aplicada a 10 campos em 5 `Update*Action`.
- **Chave `#[Computed]` no corpo de escrita vira 422** (D3) — `App\Shared\Data\ComputedFields::rejected()`
  com a regra `missing`, e **não** `prohibited`: o vendor implementa `validateProhibited` como
  `! validateRequired`, então presente-porém-vazio (`null`, `''`, `[]`) passaria com 200 silencioso.
- **Colisão de índice único de `users` vira 422 com o campo nomeado** (D4) — `UserProvisioner::writing()`
  sobre os 9 sítios que escrevem `User`, cobrindo as duas grafias de driver.

Mais `seq_in_budget` fora do `$fillable` (D5), escrito pela Action sob o lock que já existia.

### Três decisões tomadas durante a execução

1. **Convenção vence o plano nos nomes de teste** (decisão do João): classe em inglês, método em
   português. As quatro classes de omissão foram renomeadas; o plano cita os nomes antigos no DoD da
   Task 9 e a equivalência está no ledger.
2. **A varredura da Task 8 passou dos `paths_autorizados` do plano.** O `## Handoff` autorizava
   `Quote::create` → `forceCreate` só em `Comercial/**` e `Operation/**`; sobravam 15 arquivos e a
   branch ficava com 22 falhas. Estendida depois de confirmar que **não existe `Quote::create(` em
   `backend/app/`** — a varredura é 100% código de teste. 45 arquivos, 50 ocorrências.
3. **`ProfileData` e `SessionUserData` ganharam `#[Computed]`** fora da lista de seis do plano, porque
   a DoD exige os 11 campos de foto. São DTOs só-de-saída, nascem de `fromUser()`, nunca de request.

### DoD — 2026-08-20, remedido em `5a8bcdc`

**861 testes verdes / 5 skipped**, por diretório porque a suíte unida estoura o `memory_limit` de
128M do container (P-50 confirmado de novo): Cadastros 155 · Certification 97 · Comercial 86 ·
Dashboard 37 · Identity 256 · Operation 144 · Shared 69 · Unit 17. Zero falhas. Pint verde nos
**76** arquivos PHP do bloco. `typescript:transform` com **zero diff** em `generated.ts`. Cada item
da DoD da spec mapeia para um teste nomeado e existente.

### Review final da branch — o achado que os gates por task não podiam ver

Veredito: **o que o bloco construiu está correto e provado, nada regrediu.** Mas a lei que ele declara
não vale em todo lugar que devia valer, e três contraexemplos estão dentro das Actions que o próprio
bloco editou.

A raiz: o `DefaultValuesDataPipe` do Spatie entrega o **default literal** quando a chave está ausente,
**antes** do ramo que preencheria `Optional`. `WritableAttributes` recebe então um valor real e não
tem como saber que ele foi inventado. A medição da D-13 era cega a isso — ela procurou o idioma
`instanceof Optional ? null`, e aqui o valor nunca chega como `Optional`.

Seis campos, nenhum deles regressão do bloco. **`UserData::$is_active = true` é controle de acesso:**
um `PUT /api/users/{id}` que omita a chave reativa staff desligado, e `is_active` é o portão que
`AuthController:52` usa para barrar login. Fora do `active_work_item` (a D-13 mediu 10 campos, a D-12
mediu 11 de foto; nenhum destes seis está nas listas) e o remédio ainda escolhe entre duas leituras
da D1 — foi para **[P-51](./pendencias/abertas.md)** com o custo dos dois caminhos medido.

Os Minor de código do próprio bloco foram corrigidos antes do handoff: `bfcbbc7` (o tradutor de
coluna duplicada sequestrava `NOT NULL constraint failed`), `dd0cda1` (o arch test dos 11 campos
passava vazio se o `glob` não achasse nada) e `5a8bcdc` (três dialetos fora de compasso).

### Um ponto de estado a refazer no fechamento

O base da branch, `0fe30b13`, é literalmente o commit que promoveu `bd17-superficie-de-arquivados` a
`ready_for_planning` — e o BD-14 sobrescreveu esse `active_work_item`. Nada se perdeu (o BD-17 e seus
três débitos vivem no `backlog.md:208`), mas **a promoção precisa ser refeita quando o BD-14 fechar.**
O `state_basis_commit: 0c8db94` não é o base da branch e não deveria ser: é o commit contra o qual as
medições do `backlog.md` foram tomadas, que é o que o campo quer dizer.

> **Resolvido no merge da `main` (ver a seção do merge, adiante):** a promoção não precisou ser
> refeita — a `main` promoveu, executou e fechou o BD-17 em paralelo, em 2026-08-20.

### Review do bloco — 2026-08-20: risco ALTO, duas lentes, zero violação de lei

Classificação **alto risco** (DTO de entrada, contrato HTTP, identidade/acesso, `generated.ts` no
raio). Duas lentes: gabarito do projeto (CLAUDE.md §5 · `docs/README.md` · ADRs · rules) e revisão
independente do Codex (read-only) sobre `0fe30b13..HEAD` — **o Codex não confirmou nenhum achado**.

Reprovas rodadas nesta review, não herdadas: **861 verdes / 5 skipped** por diretório (P-50 de novo:
a suíte unida morre no `memory_limit`, e `php -d memory_limit=512M` não sobe o limite do processo
filho do `artisan test`); `typescript:transform` com árvore limpa; nenhum órfão (os dois helpers
novos têm 7 e 6 chamadores); `Quote::create` sem sobra fora da Action.

Dois achados, ambos sobre o **alcance** da lei nova, nenhum regressão do bloco:

- **Q-1 🟡** — a D-12 aplicou `ComputedFields::rejected()` só à chave de foto. Seis chaves
  `#[Computed]` não-foto seguem engolidas com 200 em DTO de entrada: `UserData::$last_login`,
  `RedatorData::$last_login` e `$documents`, `StudentData::$current_client_id`,
  `$current_client_name` e `$enrollments_count`. `current_client_id` é o caso que dói: quem mandar
  vínculo no `PUT /api/students/{id}` recebe 200 e nada acontece. `documents` NÃO entra sem olhar o
  multipart do redator.
- **Q-2 🟢** — o arch test dos 11 campos varre só `app/Domains/*/Data/*.php`; campo de foto que
  nascer em `app/Shared/*/Data/` escapa da varredura e da contagem.

### Correções do review — 2026-08-20: os dois achados aprovados

O João aprovou Q-1 e Q-2; os dois entraram, com o teste reprovando antes (5 vermelhos contra o
código antigo).

- **Q-1** — `ComputedFields::rejected()` passou a listar as chaves `#[Computed]` não-foto dos três
  DTOs de entrada que as tinham: `last_login` em `UserData` e `RedatorData`;
  `current_client_id`, `current_client_name` e `enrollments_count` em `StudentData`.
  `RedatorData::$documents` ficou **de fora por medição**, com o porquê no sítio: ali a chave é
  escrita real (multipart de arquivo, descartado por `prepareForPipeline` antes dos pipes) e
  `missing` reprovaria o upload legítimo. O SPA não manda nenhuma das cinco chaves fechadas —
  `useStudentForm:22` já traduz `current_client_id` para `client_id`, que segue aceita.
- **Q-2** — o arch test dos 11 campos passou a varrer também `app/Shared/*/Data/*.php`. A contagem
  segue 11: hoje não há campo de foto fora de `Domains`, e é exatamente esse futuro que o glob
  cobre.

Reprovas depois das correções: **866 verdes / 5 skipped** por diretório (Shared foi de 69 para 74),
Pint verde nos 4 arquivos tocados, `typescript:transform` sem diff em `generated.ts`.

**Review encerrada sem achado pendente.**

---

### Fechamento — 2026-08-20: a DoD provada contra a API real, e o banco de dev devolvido como estava

**Critério de aceite provado end-to-end** (nginx `:8080`, sessão Sanctum de admin, MySQL de dev),
não só por suíte:

- **DoD 1 e 2** — `PUT /api/users/108` **omitindo** `rut` e `phone` → **200**, e o `GET` seguinte
  devolveu `rut="16.982.435-5"` e `phone="+56 9 8888 0001"` intactos. O mesmo `PUT` com
  `"rut": null, "phone": null` → **200** e os dois campos `null`. O par é a prova: só o segundo ramo
  deixaria a regressão passar verde.
- **DoD 3** — `photo_url` no corpo → **422** nas duas formas (`"http://evil/x.png"` e `null`), com
  `El campo photo url no debe estar presente.`; `last_login` → **422**; no aluno,
  `current_client_id` e `enrollments_count` → **422** (as chaves que o review acrescentou).
- **DoD 4** — `POST /api/users` com RUT já cadastrado → **422** com
  `rut: "Este RUT já está cadastrado."`. A corrida **em si** não é alcançável por uma request só —
  as duas portas (check e índice) devolvem a MESMA resposta por desenho, e a tradução do índice está
  provada em `UniqueIndexCollisionTest` com as cinco mensagens reais de driver.
- **DoD 5** — dois `POST /api/budgets/14/quotes` com `"seq_in_budget": 99` no corpo gravaram **1** e
  **2**. O payload não vence a derivação sob lock.

**Resto do gate.** Backend **866 passed / 5 skipped** por diretório (Cadastros 155 · Certification 97
· Comercial 86 · Dashboard 37 · Identity 256 · Operation 144 · Shared 74 · Unit 17); a suíte unida
morreu no mesmo `memory_limit` de sempre (P-50, gatilho visto vencer de novo e registrado na ficha).
Frontend `pnpm lint` 0, `pnpm build` verde, **435 testes**. Pint `--test` **passed** nos **76**
arquivos PHP do bloco (nunca sem argumento). `typescript:transform` rodado de novo com **zero diff**
em `generated.ts`. Código morto: os dois helpers criados têm 7 e 6 chamadores, nenhum `.gitkeep`
nasceu no bloco. Leis §5: nenhuma contrariada.

**Zero resíduo no banco de dev** (a P-44 existe justamente por gates que esqueceram o próprio
rastro): o staff de sonda (`gate-bd14@lotus.cl`, id 108), o orçamento `GATE-BD14` (id 14), as duas
cotações (13, 14) e as **6** linhas de auditoria que eles geraram foram removidos com `forceDelete`.
Conferido depois: `user=0 budget=0 quotes=0`.

**Pendências.** **P-29** e **P-35** encerradas por este bloco e movidas para `encerradas.md` com o
rastro do que as fechou. **P-51** nasceu na review final e segue aberta (decisão do João). **P-50**
teve o gatilho visto vencer de novo. **P-49 ficou órfã de bloco:** a ficha ainda diz `Bloco: BD-14`,
que acabou de fechar sem absorvê-la — reagrupar é decisão do João, não heurística do agente.

**`state_basis_commit` passa de `0c8db94` a `c61e2f4`, e isso não é divergência.** `0c8db94` era o
commit contra o qual as medições do `backlog.md` foram tomadas para ESTE bloco; fechado o bloco, o
campo volta a apontar para o último commit que comprova a entrega — o segundo dos dois que
corrigiram os achados do review.

**Um ponto de estado que este fechamento NÃO resolveu:** a `feat/bd14-contrato-de-entrada` nasceu
sobre `0fe30b13`, o commit que promovia `bd17-superficie-de-arquivados` a `ready_for_planning`, e o
BD-14 sobrescreveu esse `active_work_item`. O estado fecha em `idle` porque o gate proíbe promover
por ordem óbvia; **a promoção do BD-17 é do João** (`backlog.md`, BD-17). Isso valia enquanto este
branch não via a `main`: o merge de 2026-08-20, na seção adiante, mostrou o BD-17 já promovido,
executado e fechado lá.

### Merge da `main` — 2026-08-20: a promoção pendente do BD-17 já tinha sido feita do outro lado

O João mandou trazer a `main` para este branch antes de o PR ([#62](https://github.com/Andred21/lotus/pull/62))
ser mesclado. `git merge main` sobre a base `0fe30b13` trouxe **17 commits** e abriu **dois
conflitos, os dois de documentação de estado** — `state.md` e `historico/progress.md`. **Todo o
código mesclou limpo:** o BD-14 é backend puro e o BD-17 é frontend puro, e os dois não dividem
arquivo nenhum.

**A pendência que este fechamento deixou para o João não existe mais.** A `main` promoveu, executou,
revisou e fechou o `bd17-superficie-de-arquivados` em paralelo, entre 2026-08-19 e 2026-08-20
(`6edf1224`). O ponto anotado duas vezes acima — "a promoção do BD-17 é do João" — está resolvido por
fato consumado, não por decisão nova. **Dois `active_work_item` viveram ao mesmo tempo, em linhas
diferentes**, pelo mesmo padrão já registrado no fechamento do `arquivados-roots-restantes`: o
invariante de um só vale dentro de cada branch, não entre elas.

**Quem é o último item fechado se decide por relógio de commit, não por lado do merge:** o BD-17
fechou às **14:39** (`6edf1224`) e o BD-14 às **16:04** (`2e8c8887`). Por isso
`last_completed_work_item` fica em `bd14-contrato-de-entrada` e `state_basis_commit` em `c61e2f4` —
o commit que comprova a entrega, nem o do fechamento nem o do merge.

**Doc — o que ficou de cada lado:**

- **`state.md`:** a janela de cinco fechamentos intercalou os dois lados na ordem real
  (`bd14-contrato-de-entrada` → `bd17-superficie-de-arquivados` → `arquivados-roots-restantes` →
  `identity-ativacao-acesso-redator` → `arquivados-e-restauracao`). Saiu da janela, para o git e para
  a linha de entrega no `progress-archive.md`: `bd13-listagens-e-abas`.
- **`progress.md`:** as duas linhas novas entraram em ordem de fechamento — BD-17 antes do BD-14 — e
  a mais antiga da tabela (Dashboard B1, 2026-08-16) desceu para o `progress-archive.md`, que mantém
  a janela em dez. Os dois lados já tinham arquivado a MESMA linha por conta própria (Meu Perfil
  backend, 2026-08-15), e o git mesclou isso sem duplicar.
- **`backlog.md` e `pendencias/`:** sem conflito. Cada lado removeu o seu bloco (o BD-14 aqui, o
  BD-17 lá) e a nota de "cada um saiu desta lista" ganhou o BD-14 com os débitos que ele levou (D-12
  e D-13). Nenhuma colisão de ID: a **P-51** é daqui e o maior ID da `main` é o P-50. A **P-50** ficou
  com as medições dos DOIS fechamentos — 866 testes aqui, 828 lá, e o mesmo comando documentado
  morrendo nas duas árvores.

**A P-49 continua órfã de bloco.** O merge não a reagrupa: a ficha segue dizendo `Bloco: BD-14`, e
escolher o novo hospedeiro é decisão do João.

**Suítes depois do merge:** o frontend rodou inteiro — `pnpm lint` 0, `pnpm build` verde,
**81 arquivos / 453 testes** (as 18 provas novas do BD-17 entraram junto). O backend **não foi
medido de novo, e não precisa ser**: os 17 commits da `main` não tocam um arquivo de `backend/`
(`git log 0fe30b13..main -- backend` devolve zero), então a medição do fechamento — **866 passed /
5 skipped**, por diretório, porque a suíte unida esbarra na P-50 — continua sendo a desta árvore.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Quarto item fechado — 2026-08-20 (`bd17-superficie-de-arquivados`, BD-17 dos blocos de dívida)

### Seleção — 2026-08-19

**Promoção explícita do João**, do BD-17 recém-registrado: os três débitos (D-51, D-52, D-53) foram
medidos no mesmo dia, no `/revisar-frontend` da superfície inteira de arquivados contra `0c8db94`, e
entraram no backlog pelo commit `82c1d0c4` antes de qualquer plano. **Rota direta a
`ready_for_planning`, sem Context Packet** — a fonte do bloco é o próprio código medido, não Drive
nem Notion, e `context_packet` ficou `null` do começo ao fim.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd17-superficie-de-arquivados` a partir
de `0c8db946`. **Risco projetado BAIXO e confirmado no review:** frontend puro, sem schema, sem
`generated.ts`, sem Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`.

### Execução — 2026-08-20: 3 peças novas, 6 roots adotando, 1 sítio corrigido direto

**A ordem interna do backlog foi respeitada: D-53 antes de D-51.** Corrigir a data primeiro obrigaria
a tocar 8 sítios e deixaria o nono root livre para reintroduzi-la; com a coluna compartilhada, o
`formatDate` tem um pouso só.

**As três peças, todas em `shared/`:** `archivableSource()` mais `ArchivableRow<T>`/`ListSource<T>` em
`shared/lib/archivable.ts` (`1bc35876`); `archivedColumns(t)` em `shared/ui` (`86c691a7`); e os dois
aliases de operação em `features/operation/hooks/` (`8d6a2dec`), que existem porque `useTurmas.ts` é
artesanal, não passa pelo `createCrudResource` e devolvia `UseQueryResult` cru — a assimetria que
fazia a `OperationPage` ser a única a derivar `loadError` dentro da prop.

**`archivedColumns` é FUNÇÃO, nunca componente, e isso tem catraca.** O `DataTable` do PrimeReact
resolve coluna lendo o filho **direto** (`Children.toArray`), então um componente — ou um Fragment
envolvendo as duas colunas — achataria as duas numa coluna lixo, sem `field`, **sem estourar build,
lint ou suíte**. O teste prova as duas formas lado a lado, e prova também que o `{archived && ...}`
das tabelas não deixa coluna fantasma no modo ativo.

**Seis roots adotaram em cinco commits** (`de3b362b`, `9dba76c6`, `db506f39`, `9747ad33`, `4cca8f97`,
`60dfd1cc`): as 8 declarações de `XRow` à mão sumiram, as ~84 linhas de coluna duplicada viraram uma
chamada, e o quarteto de ternários dentro das props das 6 páginas virou uma escolha só. O nono sítio
do D-51, `ArchivedQuotesList`, é layout flex e não tabela — foi corrigido direto (`1d61b287`).

**Uma correção medida entrou na spec (§11):** o `tsc` reprovou com **TS2322** e forçou o tipo de
retorno explícito `ReactElement[]` em `archivedColumns` (`ae102f11`). Sem ele a inferência abria a
porta para exatamente a forma que a catraca proíbe.

### DoD — provado na tela, não no diff

**Navegador em `en-US`, interface em `es-CL`:** a coluna "Archivado el" imprime no idioma da
**interface**, que é o defeito inteiro do D-51 (`8/19/2026` do navegador contra `19-08-2026` do resto
da tela). Teste de regressão no molde do precedente `AppFileRow.test.tsx`, medindo contra o `Intl` da
tag fixada — não contra o próprio `formatDate`, que passaria por acaso numa máquina cujo locale
coincidisse com o da interface.

**Dois débitos nasceram da medição, e nenhum é regressão deste bloco.** **D-54** — o `refetch` do
`useLoadState` faz `void query.refetch()` e engole a promise que o `AppErrorState` aguarda (Q-14); é
anterior ao bloco, e é por isso que os aliases novos nasceram **sem** ele, com o `refetch` devolvendo
a promise e um teste guardando a diferença. **D-55** — o `DataTable` não repinta as células `body` na
troca de idioma ao vivo; isolado como limitação de plataforma porque `ÚLTIMO ACCESO` (`formatDateTime`,
fora do escopo) e o `AppTag` de estado congelam igual, enquanto o `ArchivedQuotesList`, mesma
`formatDate` **fora** de DataTable, troca ao vivo. Com recarga a grafia está correta nos três idiomas
— o D-51 está pago.

### Revisão de sprint — 2026-08-20: risco BAIXO, uma lente, 2 achados 🟢, zero violação de lei

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex.
**Fronteira do bloco provada:** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve zero arquivo. **Órfãos:** nenhum — os 8 símbolos novos têm consumidor, e `useTurmas`/
`usePendingQuotes` seguem vivos pelas query keys e pelos outros hooks. **Escopo pago, medido:** zero
`toLocaleDateString()` cru em `src/`, zero `archived_at?:` declarado à mão, zero quarteto de ternário.

**Q-1 🟢, corrigido no branch** (`4c9a2580`): `usePendingQuotesPage` morava em `useTurmasPage.ts` e
quebrava o um-hook-por-arquivo dos outros 7 aliases. **Q-2 🟢, registrado como D-56**: a forma
normalizada `{items, loading, error, refetch}` passa a ser montada à mão em **5 sítios**, padrão
reincidente da mesma política que já divergiu em 2026-08-14 — o texto da linha de rule ficou guardado
na ficha, para ser escrito quando o débito for pago (escrevê-lo antes tornaria a rule falsa nos cinco
sítios).

**Dois candidatos foram descartados por serem decisão consciente já registrada** — D-54 e D-55 —, e a
observação de que o `state.md` não tinha narrativa do BD-17 caiu na verificação: **todas** as seções
deste arquivo são de item **fechado**, escritas pelo `/fechar-sprint`, não durante a execução.

### Fechamento — 2026-08-20

**Gate do frontend:** `pnpm build` verde, `pnpm lint` exit 0, `pnpm test` **81 arquivos / 453 testes**
(baseline do bloco: 77 / 435). **Backend intocado e verde assim mesmo: 828 passed / 5 skipped, 3006
asserções** — pelo binário direto com `memory_limit` elevado, porque o comando que o `CLAUDE.md` §6
documenta morre no meio: é a **P-50**, reproduzida aqui com pico de 127,00 MB. **Pint e
`typescript:transform` não se aplicam** — zero arquivo de `backend/`, zero DTO.

**A P-03 apareceu pelo gatilho dela, e não fechou:** o `docker compose up -d` desta árvore não sobe o
`mysql` porque o `lotus-mysql-1` do main tree já ocupa a porta 3307. A suíte não precisa dele (sqlite
`:memory:`), então o `app` subiu com `--no-deps`; o que **não** dá para refazer nesta sessão é a prova
de navegador, que depende da API com dado real. Ela está feita e datada acima, contra `1d61b28`, e o
único arquivo de renderização que mudou desde então foi o tipo de retorno de `archivedColumns`.

**Estado: `idle`.** Próxima ação: o João escolher o próximo item do `backlog.md`. Nada foi promovido.

## Quinto item fechado — 2026-08-19 (`arquivados-roots-restantes`, Próximos blocos item 1)

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima terceira** vez: o argumento `arquivados-roots-restantes` era **slug inventado por
mim no turno anterior**, não slug promovido, e `active_work_item` estava `null`.

**Três decisões dele fecharam o gate:** o slug `arquivados-roots-restantes`; a rota **direta a
`ready_for_planning`, sem Context Packet novo**; e **main tree**, partindo de
`feat/arquivados-e-restauracao@6fd0ad8` e não da `main`.

**O gate pegou um erro meu de escopo, e ele é o registro mais importante desta seleção.** Ao oferecer
as opções eu descrevi o escopo como `Budget`/`Quote`, `Redator`, **`Student`** e `Turma`/`Enrollment`
— montado sobre os 8 roots do Context Packet de 2026-08-18. A linha 101 do backlog diz outra coisa:
**`Budget`, `Quote`, `User`, `Redator`, `Turma` e `Enrollment`**, com `Student` em **"Fora de
escopo"** por não ter `destroy` hoje. Eu **incluí `Student`** e **omiti `User`**. O João escolheu
seguir o backlog, e o escopo do bloco são os **seis roots** da linha 101. A medição do próprio turno
confirmou o motivo do backlog: `students` é `apiResource` com `index/store/show/update` apenas
(`Identity/routes.php:46`), então arquivar aluno seria superfície nova com regra a inventar — não
replicação.

**Por que a branch não nasce da `main`.** `App\Shared\Concerns\ArchivesChildren`,
`LoadsCascadedChildren`, `useArchivedPage`, `ArchiveSwitch` e o `archived` do `createCrudResource`
existem **só** na `feat/arquivados-e-restauracao`, que segue sem merge por decisão do João. Nascer da
`main` significaria reimplementar ou conflitar. A branch `feat/arquivados-roots-restantes` foi criada
de `6fd0ad8` ANTES deste commit, seguindo o precedente do bloco anterior.

**`state_basis_commit` passa de `3d02a46` a `6fd0ad8`, e isso não é divergência.** `3d02a46` era o
baseline escrito quando o bloco anterior entrou em `ready_for_review`; os dois commits seguintes
(`1e07786` correções do review, `3d7e95c` fechamento) e o `6fd0ad8` desta sessão vieram depois. Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar.

**Por que não há Context Packet novo.** O packet
`context-packets/2026-08-18-arquivados-e-restauracao.md` já foi gerado **sobre os 8 aggregate roots**,
não sobre os dois executados, e as fontes externas (Notion H.5.1–H.5.4 + Drive) foram esgotadas nele
— inclusive a ausência medida de documento funcional no Drive. O molde de decisão vive em
`specs/archive/2026-08-18-arquivados-e-restauracao-design.md` e a mecânica em código. Recuperação
externa não se repete sem fonte nova.

**`context_packet` aponta para o packet do bloco anterior, e isso é obedecer o invariante, não
reciclar por preguiça.** O invariante diz que, quando o trabalho depende de contexto externo, o
campo **não pode ser `null` em `ready_for_planning`**. O packet cobre os 8 roots, então é fonte
válida para estes seis; herdá-lo declarado é mais honesto que apagar a dependência escrevendo
`null`.

**Um commit fora de bloco entrou antes desta promoção.** `6fd0ad8` (`fix(cors)`) fecha o lado de
aplicação da **P-45**: `allowed_origins` tratava `FRONTEND_URL` como valor único e o `.env` de dev já
é lista (`5173,5174`). Não é deste bloco nem do anterior — era o WIP do João que atravessou os dois,
declarado na seleção anterior. Com ele, `php artisan test` dá **717 passed / 5 skipped** sem precisar
de `FRONTEND_URL` no comando. Pint também limpou a formatação pré-existente da linha `paths`.

### Medição da abertura — 2026-08-18, sobre `6fd0ad8`, não herdada

Sete medições, feitas antes do brainstorming e registradas para ele.

1. **Gates de arquivamento que já existem, por root.** `Budget` recusa se houver cotação **aprovada**
   (`DeleteBudgetAction:20`, 422 "Recuse-a antes"); `Quote` recusa `status === Approved`
   (`DeleteQuoteAction:19`); `Turma` recusa `status !== EmAndamento`
   (`Turma::assertAcademicallyWritable():143`, RN-15); `Enrollment` recusa pela turma
   (`RemoveEnrollmentAction:11`); `User` recusa o último superadmin ativo (`DeleteStaffUserAction` +
   `SuperadminGuard`) e o controller ainda faz `abort_unless($user->type === 'admin', 404)`
   (`UserController:60`). **`Redator` não tem gate nenhum** — `RedatorController:53-58` chama
   `$redator->delete()` cru, sem Action.
2. **Só dois dos seis roots cascateiam com a marca.** `Client` e `Course` usam `markAndDelete`
   (feitos). `Budget → quotes`, `Redator → documents + user` e `Student → user` cascateiam com
   `delete()` cru, **sem `archived_with_parent`**. `Turma` e `Enrollment` **não têm hook `deleting`
   nenhum**: arquivar turma hoje deixa matrículas, documentos e o pivot ativos.
3. **A coluna existe em 5 tabelas** — `client_addresses`, `client_contacts`, `users`,
   `course_modules`, `course_certificate_templates`. Faltariam ao menos `quotes` e `files`; `users`
   já tem e é reaproveitada por `Redator` e `Student`. **O bloco toca schema**, então o planejamento
   lê `docs/adrs.md` e `docs/der-fisico.md`.
4. **O gate de Operação torna a lista de Arquivados estruturalmente pequena.** `Concluida` é estado
   **terminal** (enum, D5) e `assertAcademicallyWritable` exige `EmAndamento`, então turma concluída
   e suas matrículas **nunca** chegam a Arquivados. Coerente com o peso legal; confirmar no
   brainstorming se é o comportamento desejado antes de construir a tela.
5. **`Certificate` é o piso legal e NÃO é soft-deletable.** `Certificate extends Model` sem
   `SoftDeletes`, com `enrollment()`, `course()` e `redator()` os três `belongsTo(...)->withTrashed()`.
   O certificado sobrevive ao arquivamento de tudo que o originou e lê os pais arquivados. Isso
   **valida** o modelo e impõe que arquivar `Redator` ou `Course` não quebre essa leitura.
6. **Redator arquivado some da turma em silêncio.** `turma_redator` é pivot cru (`id`, `turma_id`,
   `redator_id`, `timestamps`) — sem `deleted_at`. A FK é `restrictOnDelete` ("redator com turma não é
   apagado", lição #15), o que barra **hard** delete, não soft. `Turma::redatores()` é
   `belongsToMany` **sem `withTrashed`** (`Turma.php:82`), então a linha do pivot fica viva e a turma
   simplesmente para de listá-lo. Três saídas possíveis: gate, cascata do pivot, ou `withTrashed` na
   relação.
7. **Os dois restores automáticos seguem sem decisão.** `StudentResolver:71-79` restaura `User` e
   `Student` ao reencontrar o RUT na importação; `EnrollStudentAction:38` restaura a matrícula ao
   re-matricular. Com `*.restore` virando permissão por agregado, existem dois caminhos que
   restauram **sem permissão e sem intenção do usuário**. Pendência aberta desde o Context Packet.

**Débito com gatilho vencido, entra por construção:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` dizem *"Esta acción no se puede deshacer."* — deixa de ser verdade no
instante em que `Budget`/`Quote` ganharem restore. Ficou registrado como gatilho no bloco anterior.

**Débito ligado, não vencido:** a **D-37** (backfill de `archived_with_parent`, publicada como `D-34` antes do merge da `main`) tem gatilho no
primeiro deploy, não neste bloco. Cada tabela nova da medição 3 amplia o alcance dela — registrar,
não resolver.

**Risco de review projetado: ALTO.** O bloco **toca schema** (colunas novas), **toca RBAC**
(permissões `*.restore` por agregado), **toca `generated.ts`** e **toca dado com peso legal**
(`Turma`, `Enrollment` e os documentos do `Redator`). A classificação final é do `/revisar-sprint`,
não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: brainstorming das decisões abertas, depois plano.

### Brainstorming e spec — 2026-08-18: sete decisões, e a medição achou um 500 alcançável

**O bloco não era o que o backlog previa, e a medição é que mostrou.** A linha 101 diz *"replicar é
ligar os hooks, a Action, o endpoint e a tela, não reescrever a semântica"*. Isso descreve `Budget`,
`User` e `Redator` — e é falso para os outros três. Os seis roots se separam em **três classes**:
replicação limpa (lista de topo + `createCrudResource`: `Budget`, `User`, `Redator`), lista de topo
fora da fábrica (`Turma`, com `useTurmas` artesanal) e **sem lista de topo** (`Quote` e `Enrollment`,
que vivem dentro do detalhe do pai).

**O achado que justifica o bloco inteiro: restaurar uma turma pode dar 500.** `turmas.active_quote_id`
é coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END` com `UNIQUE`, e
`Quote::turma()` é `hasOne` **sem `withTrashed`**, então `CreateTurmaAction:25` deixa criar turma
nova sobre a cotação de uma arquivada — por desenho, dito em texto no comentário da migration.
Restaurar a primeira estoura `SQLSTATE[23000]`. É o **primeiro conflito de unicidade alcançável** do
tema: a D4 do molde ("conflito não é alcançável") vale para `Client`, `Course` e também `Quote` —
`CreateQuoteAction:22` deriva `seq_in_budget` com `withTrashed()`, medido —, e é falsa só para
`Turma`.

**O segundo achado tem peso legal e é silencioso.** `turma_redator` não tem `deleted_at` e
`Turma::redatores()` é `belongsToMany` sem `withTrashed` (`Turma.php:82`). Arquivar um redator deixa
a linha do pivot viva e o faz **desaparecer** de três sítios — a listagem
(`TurmaQueryBuilder::LISTING:26`), o painel de emissão (`EmissionPanelQuery:94`) e
`CertificateEligibility:118`, que passa a **recusar a emissão de certificado** de turma concluída que
ele ministrou. Nada no código avisa.

**As sete decisões do João:**

1. **D1 — gate de conflito na `RestoreTurmaAction` → 422.** Aceita escrever a primeira
   `ValidationException` nova desde a **D-07** e reabri-la, porque a alternativa é 500 em operação de
   usuário sobre dado com peso legal.
2. **D2 — `Turma` ganha a cascata que nunca teve** (`enrollments` + `files`). Pivot fora.
3. **D3 — `Redator` ganha gate** (turma em andamento → 422) **e `redatores()` passa a `withTrashed`**.
   Os dois são necessários: o gate cobre turma em andamento, o `withTrashed` cobre a concluída, que é
   onde a emissão acontece.
4. **D4 — os dois restores automáticos ficam automáticos**, como exceção declarada com teste. A
   permissão guarda a ação Restaurar da tela, não todo caminho que revive uma linha.
5. **D5 — `Quote` e `Enrollment` têm Arquivados dentro do detalhe do pai**, com endpoints escopados.
   Os dois têm `DELETE` próprio hoje, então sem superfície de restauração o registro ficaria
   inalcançável para sempre.
6. **D6 — um bloco, três fases por módulo** (Commercial → Identity → Operation), um DoD no fim.
7. **D7 — o RBAC espelha o guard do arquivar: cinco permissões novas, não seis.** `User` staff **não
   ganha permissão nova** — seu `destroy` é guardado por `identity.access.manage`, que é
   `SEGREGATED`, e um `identity.user.restore` normal deixaria restaurar mais frouxo que arquivar.
   `identity.user.restore` cobre `Redator`, porque o módulo já usa `identity.user.*` para os três
   tipos de ator.

**Quatro decisões derivadas, tomadas por mim e declaradas na spec:** três colunas novas (`quotes`,
`files`, `enrollments`; `users` reaproveitada); as cascatas passam a marcar e **três Actions ganham
transação que não tinham** (`DeleteQuoteAction`, `DeleteTurmaAction`, e a `ArchiveRedatorAction` que
nasce) porque enumera-e-apaga sem transação é check-then-act; a lista de arquivados de `User` filtra
`type === 'admin'` espelhando o `abort_unless` do `destroy`, senão os usuários de cliente, redator e
aluno arquivados pelas cascatas vazam na tela de staff; e a **dívida de copy do molde é paga** —
`budget.confirmDeleteBody` e `quote.confirmDeleteBody` param de dizer "no se puede deshacer", cujo
gatilho era exatamente este bloco.

**A auto-revisão da spec achou três defeitos e os corrigiu inline.** Um glob (`useBudgetQuotes*`) no
lugar de path exato; a sigla `D10` colidindo entre esta spec e o molde; e uma **lacuna real** — o
binding do restore aninhado. `->scopeBindings()` resolve `{enrollment}` por `$turma->enrollments()`,
que é escopada por `deleted_at IS NULL`, então matrícula arquivada daria **404 antes de chegar à
Action**. A spec passou a exigir `onlyTrashed()` explícito no binding.

**O frontend não migra nada, e isso foi medido:** `useArchivedPage` aceita `ArchivableResource`
**estrutural** (`useArchivedList` + `useRestore`), não a fábrica. `Turma` satisfaz o contrato à mão
no `useTurmas.ts` artesanal, e os aninhados fecham o id do pai no próprio hook.

**Risco reavaliado: segue ALTO.** Schema (3 colunas), RBAC (5 permissões), `generated.ts` e dado com
peso legal — agora com um item a mais que a promoção não previa: o bloco **toca o caminho de emissão
de certificado**.

**Estado: `planning`.** Próxima ação: escrever o plano.

### Plano — 2026-08-18: 15 tasks, executor Claude, e a escrita achou oito coisas que a spec não podia saber

**`docs/superpowers/plans/2026-08-18-arquivados-roots-restantes.md`**, 15 tasks em três fases
(Commercial 1–6, Identity 7–10, Operation 11–14, fechamento 15). Cada task tem paths exatos, o código
inteiro de cada passo, o comando de verificação com a saída esperada e o commit — nada de "similar à
Task N".

**Escrever o plano contra o código exigiu oito decisões derivadas (P1–P8), todas declaradas no
próprio plano.** As três que mudam trabalho:

- **P7 — três telas expõem a rota de arquivar sem ter botão nenhum.** `DELETE /api/redatores/{redator}`,
  `DELETE /api/users/{user}` e `DELETE /api/turmas/{turma}` existem no backend, mas `RedatoresTable`,
  `Admin/UsersTable` e `TurmasTable` **não têm** ação de arquivar, e `api/useTurmas.ts` não tem
  mutação de DELETE. Uma visão de Arquivados sozinha nasceria impossível de exercitar pela interface —
  o DoD da lei §8 não teria como ser cumprido. As Tasks 10 e 14 trazem **as duas metades**, no molde
  exato do `ClientRowActions`. **É escopo que a spec não pediu**; se o João preferir o escopo estrito,
  as duas tasks perdem o botão de arquivar e aquelas fases passam a ser provadas por `curl`.
- **P4 — nascem dois QueryBuilders.** `Budget` monta `with([...])` solto no controller e
  `Identity/QueryBuilders/` está **vazio**. A lição Q-8 (a lista de Arquivados mostra o registro como
  ele estava no instante do arquivamento) exige `asOfArchiving`, que é método de trait e mora em
  builder. `BudgetQueryBuilder` e `RedatorQueryBuilder` nascem; `QuoteQueryBuilder` e
  `TurmaQueryBuilder` ganham `withArchivedListingData()`; `EnrollmentQueryBuilder` não ganha nada
  (matrícula é folha).
- **P6 — a turma arquivada mostraria `0 alumnos`.** `TurmaData::fromModel` lê
  `enrolled_count: $turma->enrollments_count` **sem fallback**, e `withCount('enrollments')` conta só
  as ativas — depois da cascata D2, toda turma arquivada apareceria vazia. O `withArchivedListingData`
  reescreve a contagem com o mesmo predicado do trait. É o Q-8 aplicado a um `withCount`.

As outras cinco: **P1** (o path `useBudgetQuotes.ts` da spec §4 não existe — o arquivo é
`useQuotes.ts`), **P2** (as duas mensagens novas saem em **es-CL**, por precedente de
`Turma::assertAcademicallyWritable()`, e são duas linhas se o João decidir a D-07 no outro sentido),
**P3** (`RestoreEnrollmentAction` aplica a RN-15, simétrica com `RemoveEnrollmentAction:12`), **P5**
(`Redator::turmas()` nasce, inversa de `Turma::redatores()`, para o gate D3) e **P8** (`lockRow` entra
em `Redator` e `Turma`, onde a cascata nasce inteira neste bloco, e **não** entra em `Budget`/`Quote`,
onde o caminho de arquivar já existia com transação e sem lock — acrescentar mutex só no restore
criaria assimetria pior que a que resolve).

**Nenhuma chave de locale nova.** O bloco `archive.*` dos três arquivos cobre confirmar, toasts,
colunas e ações. A única mudança de copy é a **D11**: os dois `confirmDeleteBody` de `budget` e
`quote`, que diziam *"Esta acción no se puede deshacer."* e deixam de ser verdade na Task 3.

**`generated.ts` tem commit próprio, no fim.** As Tasks 5, 10 e 14 rodam `typescript:transform` para o
`tsc` enxergar os DTOs novos, mas não o commitam: três commits deixariam o arquivo em três estados
intermediários e o manifesto do transformer fora de sincronia em dois deles. Task 15, um commit, seis
tipos.

**Handoff: `executor: claude`, risco projetado ALTO.** O bloco toca quatro leis do §5 (tipos gerados,
RBAC, fronteira de features, DoD provado) e tem três pontos que exigem julgamento fora do plano: a
Task 7 muda `Turma::redatores()`, lida por Operation e Certification, e manda **ler a asserção** de
qualquer teste que vire vermelho; a P7 é escopo declarado que o João pode cortar; e a P2 reabre a
D-07.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-roots-restantes`, por
instrução posterior do João. Ordem obrigatória: a Task 1 (colunas + permissões) precede tudo, e dentro
de cada fase o backend precede o frontend.

### Execução — 2026-08-19

Técnica `subagent-driven-development` a partir da Task 2 — a restrição de AgentTool caiu no meio do
bloco e o João pediu a troca; a Task 1 saiu inline, sob `executing-plans`. Main tree pela P-03.
Ledger task a task em `.superpowers/sdd/progress.md`, com implementador e revisor próprios por task.

**A Task 1 achou um gap do plano, e ele é de guardrail.** `PermissionI18nParityTest` exige paridade
exata entre `PermissionCatalog::descriptions()` e as chaves `perm.*` das três locales — permissão
nova sem tradução reprova a suíte. O plano registrou "nenhuma chave de locale nova" pensando no bloco
`archive.*`; `perm.*` é outro namespace e as cinco permissões novas o obrigam. As cinco chaves
entraram no mesmo commit da Task 1, ao lado de cada `*_delete` correspondente. Sem isso a Task 15
descobriria o vermelho no fim, com cinco fases de distância da causa.


### DoD end-to-end — 2026-08-19 (Task 15): as três fases encadeadas, provadas no navegador

Chromium contra a API real e a MySQL de desenvolvimento. O frontend do main tree subiu na **5174** —
a 5173 é o `pnpm dev` do worktree `fix-frontend` do João, e provar a tela nela teria provado o
código de outro branch. O `.env` já previa a porta.

**Fase 1 — Comercial.** O primeiro alvo (`Scap 1`) recusou com **422** e uma frase em PORTUGUÊS:
*"Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes."* É gate pré-existente e
correto (`DeleteBudgetAction:21`), mas a frase está hard-coded na Action e fora do idioma da tela —
achado registrado abaixo. Refeito em `Scap 8`, com cotação e anexo criados pelo próprio app:
arquivar levou cotação e anexo com `archived_with_parent = true`; Arquivados mostrou **`Quotes = 1`**
com a cotação já soft-deletada (a contagem as-of-archiving); restaurar devolveu os três totais
(**42 / 0 / 0 UF**), a cotação e o `anexo-dod.pdf`, com a marca limpa.

**Fase 2 — Identity, e o caso com peso legal (D3).** Nenhum redator do banco tinha só turma
concluída, então Ana Reyes saiu da turma 6 (em andamento, que ficou com Juan Morales) — ação do
próprio app, desfeita no fim. Com só a turma 3 (concluída), arquivá-la passou o gate; a cascata
levou `user#4` e o REUF. **Em `/certificados`, o diálogo de emissão listou `Redator: Ana Reyes` —
arquivada — e a emissão respondeu `201`**, gerando `LOT-2026-1005` (`redator_id = 3`, status
`emitido`, com UUID de validação). É o `Turma::redatores()->withTrashed()` da Task 7 provado onde
importa: sem ele o certificado não sairia. Restaurar devolveu redator, usuário e REUF com a marca
limpa, e Ana voltou à turma 6.

**Fase 3 — Operação.** Turma 2 (`Scap 4 - Cot 1`, 8 alunos, 3 documentos) arquivada pelo botão da
linha (P7): cascata de 8 matrículas e 3 documentos, todas com marca. Arquivados mostrou
**`Students = 8`** com as oito já soft-deletadas. Restore devolveu **200 — não 201** — e trouxe as
onze peças com marca zerada; o detalhe mostrou os 8 alunos e o switch local da D5. Arquivar e
restaurar UMA matrícula fechou o ciclo: a lista de arquivadas veio escopada pela turma, com data e
autor, e o restore (`POST /api/turmas/2/alunos/13/restore` → **200**) invalidou as duas listas.

**D10 na tela.** Com `user#5` (`type = redator`) arquivado, `/administracion` → Arquivados mostrou
**"No archived records"**. Usuário de redator não vaza para a lista de staff.

**O gate D1 na MySQL real.** A suíte roda em sqlite, então a premissa de banco foi conferida no
motor de verdade: `turmas.active_quote_id` existe como coluna gerada
`(case when (deleted_at is null) then quote_id end)` com o índice `turmas_active_quote_id_unique`
(`Non_unique = 0`). É o que torna o gate da `RestoreTurmaAction` um 422 em vez de um 500.

**O que ficou no banco de desenvolvimento.** Uma cotação (`Scap 8 - Cot 1`, 42 UF, pendente) e um
anexo em `Scap 8`, e o certificado `LOT-2026-1005` — artefatos que o próprio roteiro do DoD manda
criar. O anexo de teste que subiu em `Scap 1` foi removido. Todo o resto voltou ao estado anterior:
Ana Reyes na turma 6, Carlos Fuentes ativo, turma 2 e suas onze peças vivas.

### Achados fora do escopo do bloco, para a triagem do review

- **`DeleteBudgetAction:21` responde em português numa interface es-CL**, com a frase hard-coded na
  Action em vez de locale. Pré-existente; é a mesma D-07 que a spec deste bloco reabriu para as duas
  frases novas (que saíram em es-CL).
- **Requisição não autenticada sem `Accept: application/json` responde 500** (`Route [login] not
  defined`) em vez de 401. No `laravel.log` desde 2026-08-16, não é regressão deste branch.
- **Aviso do React `Each child in a list should have a unique "key" prop` no `TableBody`** do painel
  de emissão de certificados. Fora dos arquivos deste bloco.

### Encerramento da execução — 2026-08-19

Quinze tasks provadas, em **28 commits** sobre `6fd0ad8`. Backend **795 passed / 5 skipped**;
frontend `lint`, `build` e **391 testes** limpos. `backend/config/cors.php` não foi tocado por
nenhum commit do bloco — o único commit que o altera é `6fd0ad8`, do João, que é a base.

Os tipos gerados entraram num commit só, no fim (`fdc043e`): 30 inserções, zero remoções, com o
manifesto junto.

Dois desvios do plano, ambos registrados no ledger com a evidência:

1. **O Step 6 da Task 14, ao pé da letra, reprova o `pnpm lint`.** As colunas do rastreio mais a de
   ações levaram `TurmasTable.tsx` a 185 linhas contra a régua de 150 (catraca do D8 do B2). O
   implementador parou em vez de partir o arquivo sozinho; parti eu, em `c2e6c37` — cinco corpos de
   célula para `TurmaCells.tsx`, tabela em 143 linhas, comportamento intacto.
2. **O plano afirmou duas vezes que o `lockRow` fecha a janela contra quem escreve filho, e o código
   não faz isso** — no redator (Task 7) e na turma (Task 11). Os comentários dizem o que o código
   faz, e a P-47 passou a cobrir os dois roots. **O plano não é fonte sobre o comportamento do
   código.**


### Review — 2026-08-19: risco ALTO, duas lentes, seis achados e zero violação de lei

**Classificação ALTO e a segunda lente foi acionada.** Schema (3 colunas), RBAC (5 permissões),
`generated.ts` e o caminho de emissão de certificado — quatro dos gatilhos da skill num bloco só.
Codex rodou read-only sobre `6fd0ad8..HEAD` contra plano, spec e leis §5; os seis achados dele foram
verificados por mim no código antes de qualquer um entrar no relatório.

**Órfãos: zero**, nos dois lados. **Leis §5: nenhuma violação** — sem Repository, sem regra em
controller, cascata instância a instância, `generated.ts` regenerado com manifesto no mesmo commit,
`ValidationException` nas duas frases novas, zero `primereact` direto e zero import cruzado em
`features/`, financeiro não gateia nada. Suítes conferidas na hora: backend **795 passed / 5
skipped**, frontend **391 testes**.

**Seis achados, nenhum 🔴:**

1. **Q-1 🟡 P — `RestoreQuoteAction:34-47` restaura cotação sem exigir orçamento ativo.** A rota é
   plana e a Action não olha o pai, então cotação de orçamento arquivado volta sozinha: some da tela
   (o binding do pai dá 404) mas segue aprovável por API, e cotação aprovada origina turma. É o
   raciocínio da própria **D10** — aplicado a `User` e não a `Quote`.
2. **Q-2 🟡 P — `QuotesList.tsx:44-59`.** `nameLost` e o `InlineLoadState` com Reintentar existem só
   no ramo ativo; o ramo `archived` volta a pintar `—` em silêncio quando o GET de cursos falha,
   justamente na tela que existe para reconhecer a cotação antes de restaurar. É o defeito do BD-6
   reentrando pela porta nova.
3. **Q-3 🟡 M — o kit de arquivados está copiado por root em três camadas:** 6 `*RowActions.tsx` (397
   linhas), 6 hooks `use*Archived`, e o par `toArchive` + `ConfirmDialog` em cinco Pages.
   **Reincidente (2ª sprint)** — proposta de regra para `.claude/rules/frontend-fsliced.md`
   apresentada ao João junto do relatório.
4. **Q-4 🟢 P — o teste 9 da spec §5 não foi escrito, e o código faz o contrário do que ele
   prometia:** `useQuotes.ts:21` invalida `budgetsApi.keys.all`, não a chave do pai.
5. **Q-5 🟢 P — `RestoreTurmaAction:40-55` é check-then-act:** trava a turma que volta e pergunta
   sobre a cotação, que ninguém trava. Mesma classe da **P-47**, ator diferente (criador de irmã, não
   escritor de filho) — a ficha atual não alcança.
6. **Q-6 🟢 — o gate D3 não vale na volta.** Arquivar turma, arquivar redator, restaurar turma
   devolve turma em andamento com redator arquivado. Fecha com gate no restore ou com declaração na
   spec, como a exceção da D4.

**Três achados do Codex foram descartados, com razão registrada:** a audit `restored` duplicada sob
concorrência é simetria deliberada e comentada (decisão consciente não é achado); o `—` do cliente em
`ArchivedBudgetData` é pré-existente e aparece igual na visão ativa, com o erro já escalando; e o
redator no restore de turma entrou rebaixado a 🟢 porque a emissão segue íntegra pelas três peças da
D3. **Zero divergência de julgamento entre as duas lentes.**

**Estado: `blocked`, `resume_state: reviewing`.** Próxima ação: o João aprova o que entra. Somente
achado aprovado vira código.


### Correções do review — 2026-08-19: os seis achados aprovados, em seis commits

O João aprovou **Q-1 a Q-6**. Nenhum foi deferido para o backlog.

**Q-1 — o restore da cotação passou a exigir orçamento ativo.** `RestoreQuoteAction` lê
`$quote->budget->trashed()` e recusa com **422** em es-CL. O teste que provava a limpeza da marca
virou dois: o 422 do gate e o caminho que ele obriga a usar (restaurar o pai devolve a cotação com
`archived_with_parent` em `false`) — sob o gate, cotação marcada implica orçamento arquivado, então
o antigo cenário deixou de ser alcançável.

**Q-5 e Q-6 saíram no mesmo commit, porque tocam a mesma Action.** `Quote::lockRow()` nasceu e os
DOIS caminhos que decidem sobre a cotação a travam: `CreateTurmaAction` — que também moveu as duas
checagens para dentro da transação — e `RestoreTurmaAction`. É o **primeiro eixo com tomador dos dois
lados** desde que a P-47 foi aberta. O segundo gate da turma recusa restaurar turma **em andamento**
com redator arquivado; turma concluída fica de fora, porque é nela que o certificado é emitido e a
emissão já lê redator arquivado pelo `withTrashed` da D3.

**Q-2 — o aviso de nome perdido passou a valer nos dois modos** do `QuotesList`, com o cálculo sobre
a lista VISÍVEL e o `InlineLoadState` extraído para um nó reaproveitado — para não haver um terceiro
sítio onde esquecer.

**Q-4 — o critério 9 da spec §5 existe e o código passou a cumpri-lo.** `useRestoreQuote` recebe o
`budgetId` e invalida o detalhe do pai (que alcança a lista de arquivadas por prefixo) mais a lista
de orçamentos, cujos totais mudam. As outras mutações seguem em `keys.all`: nascem dentro do detalhe
do pai, onde não há outro orçamento montado. O teste vive em `quoteKeys.invalidatedByRestore` e
reprova contra o código antigo.

**Q-3 — o kit de arquivados virou um só, e a regra foi escrita.** Nascem `useArchiveToasts` (interno,
fora do barrel), `useArchiveAction`, `ArchiveRowActions` e `ArchiveConfirmDialog`; `useArchivedPage`
absorveu os toasts do restore e continua propagando os callbacks de quem chama. Os oito hooks de
página caíram de **370 para 162 linhas**, os seis `*RowActions` viraram adaptadores que só chamam
`can()` e passam **booleanos** — `shared/ui` não importa `shared/hooks` —, e os cinco blocos de
`ConfirmDialog` viraram cinco chamadas de cinco linhas. Saldo do commit: **603 linhas a menos, 403 a
mais**. O padrão reincidente virou o item **"Kit de arquivados"** em `.claude/rules/frontend-fsliced.md`.

**Verificação depois das correções:** backend **797 passed / 5 skipped** (era 795: +3 testes novos,
−1 que deixou de ser alcançável); frontend **394 testes em 67 arquivos**, `lint` e `build` limpos.
Zero `primereact` direto e zero import cruzado em `features/`. Nenhuma peça nova órfã. `generated.ts`
não foi tocado — nenhum DTO mudou.

**O que NÃO foi feito, e é do fechamento:** a prova no navegador dos dois 422 novos (cotação sob
orçamento arquivado; turma com redator arquivado) e das três telas que o Q-2/Q-3 tocaram. As suítes
provam os endpoints e o `pnpm build` prova os tipos; o DoD da lei §8 pede a tela, e esta sessão não
teve navegador. **Entra no `/fechar-sprint` como item obrigatório, não como opcional.**



### Fechamento — 2026-08-19: os dois 422 novos provados no navegador, e a `main` andou por baixo

**O item obrigatório que o review deixou para cá foi cumprido, no Chromium contra a API real e a
MySQL de desenvolvimento.** O frontend do main tree subiu na **5174** de novo — a 5173 é o `pnpm dev`
do worktree do João —, sessão de admin, interface em **es-CL**.

**O 422 do Q-6 é alcançável pela interface, e o roteiro é o da própria ficha.** Turma 2
(`Scap 4 - Cot 1`, em andamento, 8 alunos, redator Pedro Soto) arquivada pelo botão da linha — a
cascata marcou as **8 matrículas** (`archived_with_parent = 1`, medido no banco). Com a turma dele
arquivada, `/personas` deixou arquivar **Pedro Soto** (o gate da D3 só enxerga turma viva, por
desenho). Em `/operacion` → Arquivados, a linha veio como estava no instante do arquivamento —
**8 alunos** (P6) e o redator **arquivado ainda visível** (`withTrashed` da D3) — e **Restaurar
devolveu `POST /api/turmas/2/restore` → 422** com a frase da Action em es-CL: *"Un redactor de esta
clase está archivado: restáuralo antes de restaurar la clase."* Restaurado o redator (200), a mesma
turma voltou (200) com as 8 matrículas e a marca zerada.

**O 422 do Q-1 NÃO é alcançável pela interface, e isso é a razão de o gate existir — foi provado nos
dois passos.** Arquivado o orçamento `Scap 8`, a cascata marcou a cotação (`archived_with_parent =
1`); abrir `/comercial/presupuestos/8` devolveu **`GET /api/budgets/8` → 404** (*"No query results
for model … Budget 8"*), porque o binding do pai é padrão — a lista de arquivadas da cotação vive
dentro do detalhe e some junto. A rota que sobra é a **plana**, e ela foi exercida do contexto da
própria página (mesma sessão, mesmo `Origin`, mesmo CSRF): `POST /api/quotes/11/restore` → **422**,
envelope RFC 7807 com
*"El presupuesto de esta cotización está archivado: restáuralo primero."* Restaurar o orçamento pela
tela (200) devolveu a cotação com a marca limpa.

**Q-2 e Q-4 também foram provados na tela, e não por leitura.** Com `http://localhost:8080/api/courses*`
roteado para 500, a aba **Arquivados** do detalhe passou a mostrar *"No se pudo procesar la respuesta
del servidor."* + **Reintentar** ao lado da cotação com `—` no lugar do nome — o ramo que antes
pintava o traço em silêncio. Removida a rota, **Reintentar** trouxe *"Trabajos en líneas energizadas
220kV"* de volta. E o restore da cotação atualizou o **detalhe do pai sem reload**: `0 UF / 0
cotizaciones` viraram `42 UF / 1` no mesmo instante — a invalidação da chave do pai que o critério 9
da spec pedia.

**Q-3 exercitado nas telas, não só nos testes:** os diálogos de arquivar de turma, redator, cotação e
orçamento saíram todos do `ArchiveConfirmDialog` único, com o toast *"Registro archivado."* do
`useArchiveAction`; as listas de Arquivados de `/operacion`, `/personas`, `/administracion`,
`/cursos` e `/comercial` renderizaram pelo `useArchivedPage`. **Zero erro de console** em toda a
sessão. A **D11** apareceu onde devia: o diálogo da cotação diz *"Podrás restaurarla desde
Archivados."*, e o do orçamento avisa que *"Sus cotizaciones se archivarán junto con él."*

**Zero resíduo.** Tudo que o roteiro arquivou foi restaurado: turma 2 e suas 8 matrículas, Pedro
Soto (`redatores.id = 2`), o orçamento 8 e a cotação 11 com `archived_with_parent = 0`. O banco de
dev terminou o gate como começou.

**Resto do gate.** Backend **797 passed / 5 skipped** (2942 asserções); frontend `pnpm lint` exit 0,
`pnpm build` verde e **67 arquivos / 394 testes**; `pint --test` **`passed`** nos **54 arquivos PHP**
do bloco (nunca sem argumento); `typescript:transform` rodado de novo **sem drift** — `git diff` em
`shared/types/` vazio, então o `generated.ts` do commit `fdc043e` está em sincronia e não foi editado
à mão. Código morto: varredura nos **41 arquivos criados pelo bloco** (fora testes) não achou nenhum
sem consumidor; os `.gitkeep` de `features/*/stores|api|hooks` seguem alheios e não foram tocados.
Leis do §5: zero `primereact` em `features/`, zero import cruzado entre features, zero
`abort(4xx)` novo (o único do repositório é o `abort(404)` público pré-existente), nenhum Repository,
nenhum trigger de banco.

**Pendências.** A **P-45** cumpriu a sprint de rastro e saiu de `encerradas.md`. A **P-47** já tinha
sido reescrita pelas correções do review e cobre os dois eixos. Três fichas mexidas por medição
deste gate: a **P-35** (o gatilho venceu **pela metade** — o bloco tocou `Quote`, `DeleteQuoteAction`
e `RestoreQuoteAction`, mas **não** `CreateQuoteAction`, então a simetria do `$fillable` não foi
absorvida), a **P-44** (as telas de Arquivados deram um **segundo palco** às sondas: `E2E Gate
Redator 1/2` em `/personas`, `GATE T7` em `/cursos`, dois clientes de sonda em `/comercial` — nada
disso é deste bloco e nada foi apagado) e a **P-48**, que nasce aqui: o `title` do envelope RFC 7807
é português nos seis ramos enquanto os `detail` novos são es-CL. **Não é bug vivo** — `problemMessage`
não lê `title` — e traduzir é a decisão de idioma que a D-07 espera.

### A divergência que o fechamento encontrou e NÃO resolve: a `main` fechou outro bloco em paralelo

`origin/main` está **56 commits à frente** da base deste branch (`6fd0ad8`) e contém o
`feat/identity-ativacao-acesso-redator` inteiro, fechado pelo João em **2026-08-19 16:05**
(`967cc618`, merge `f2d74da7`). O `state.md` da `main` diz `workflow_state: idle` com
`last_completed_work_item: identity-ativacao-acesso-redator`; o deste branch dizia
`ready_for_closure` para `arquivados-roots-restantes`. **Dois `active_work_item` viveram ao mesmo
tempo, em linhas diferentes** — o invariante de um só valeu dentro de cada branch, não entre elas.

**O fechamento não escolheu por heurística e não importou nada da `main`:** o estado deste branch,
o plano, a spec, os 36 commits e o `progress.md` concordam entre si sobre a etapa do bloco, então o
gate rodou sobre o que existe aqui. O que fica para a decisão do João, no merge:

1. **`backlog.md` conflita nos dois sentidos.** A `main` ainda traz o item 1 na redação **anterior**
   aos dois blocos de arquivamento ("tornar o lifecycle de archive/restore explícito") — ela nunca
   recebeu nem o `arquivados-e-restauracao` nem este —, e já removeu o item de **ativação de acesso
   do redator**, que neste branch continua listado (renumerado para 3 por este fechamento, porque a
   regra manda remover **somente** o item concluído).
2. **`pendencias/` conflita.** Na `main` a **P-45** segue **aberta**; aqui ela foi encerrada dentro do
   `arquivados-e-restauracao` e o rastro saiu agora. A **P-48** não colide: o maior ID da `main`
   também é o P-47.
3. **`progress.md` tem dez linhas dos dois lados, com conjuntos diferentes** — a `main` tem a linha
   do bloco de identidade e não tem as dos dois blocos de arquivamento.
4. **`state.md` vai conflitar inteiro**, e a janela de cinco fechamentos difere.

Nada disso é regressão deste bloco: nasce de a `feat/arquivados-e-restauracao` seguir sem merge por
decisão do João, com este branch nascendo dela. **Reconciliar é decisão dele, não do fechamento.**

### Merge da `main` — 2026-08-19: a divergência acima foi resolvida por instrução do João

O João mandou trazer a `main` para este branch antes do PR. `git merge origin/main` (base
`b758068b`) trouxe os 56 commits do `identity-ativacao-acesso-redator` e abriu **10 conflitos** —
6 de doc, 3 de componente e 1 de manifesto. Suítes depois do merge: **828 passed / 5 skipped**
(3006 asserções) no backend, **77 arquivos / 435 testes**, `lint` 0 e `build` verde no frontend.

**Código — três conflitos, três composições, nenhum "escolhe um lado":**

1. **`QuotesList.tsx`** — a `main` tinha o `InlineLoadState` inline com `t(courses.errorHint)`; este
   branch tinha o mesmo nó **extraído** em `avisoDeNome`, porque o Q-2 o reusa nos dois modos. Ficou a
   extração daqui **com o `errorHint` de lá**: o `useLoadState` da `main` escolhe a dica por status
   (403/404/genérico), e o nosso literal `'common.loadErrorHint'` era mais burro.
2. **`RedatoresTable.tsx`** — a `main` pôs o botão de **reenviar convite** na célula de ações; este
   branch trocou a célula inteira pelo `RedatorRowActions` do kit. A célula agora tem os dois, e o
   convite **só aparece na lista ativa**: o `User` do redator desce com a cascata, então reenviar
   acesso a um redator arquivado não é ação que exista. Coluna de `8rem` para `10rem`.
3. **`PeoplePage.tsx`** — a `main` desceu o dado para `RedatoresTab`/`StudentsTab` (D-04: com o hook
   acima das abas, o `renderActiveOnly` não alcançava e a tela buscava as duas listas). Ficou a
   estrutura de lá, e **a fiação de arquivados deste branch desceu junto** para a `RedatoresTab` —
   `useRedatoresArchived`, o `toArchive`, as props de modo e o `ArchiveConfirmDialog`. A casca voltou
   a não ter hook de dado nenhum.

**`generated.ts` e o manifesto foram regenerados, não resolvidos à mão** — `typescript:transform`
sobre o backend já mesclado, que é a única fonte válida (lei §5.3). O `RedatorData` da `main` ganhou
`is_active`, e o fixture do `RedatorRowActions.test.tsx` passou a trazê-lo: o `tsc -b` reprovou
primeiro, o teste foi corrigido depois.

**Três colisões de ID, resolvidas pelo precedente da P-35 (quem renumera é quem ainda não publicou
na `main`):**

- **`D-34` → `D-37`** — a `main` publicou um `D-34` (gate RBAC do Dashboard atravessando o seam como
  `null`) e um `D-35`; o backfill de `archived_with_parent` deste branch ficou com o próximo livre, e
  as três citações em `state.md`/`progress.md` acompanharam.
- **`P-47` → `P-49`** — a `main` publicou uma `P-47` (os 7 redatores do seed sem a role `redator`); a
  ficha do `lockRow` meio mutex é a renumerada.
- **`P-48` foi retirada** — era duplicata da **D-36** da `main`, que já registrava o envelope RFC 7807
  não localizado desde o BD-13. A medição do nosso fechamento (o 422 com `title` em PT e `detail` em
  es-CL no MESMO envelope) foi **enxertada na D-36**, que é a ficha dona do assunto.

**Doc — o que ficou de cada lado:**

- **`backlog.md`:** o item de arquivamento sumiu (entregue nos dois blocos desta linha) e o de
  **ativação de acesso do redator** também (entregue na `main`) — sobraram Roles/permissões e
  Hardening. O texto do B2 passou a ser o da `main`: o bloqueio do valor da view do Redator **caiu**.
- **`pendencias/`:** a **P-45** continua **encerrada**, e agora com prova de código em vez de
  histórico — depois do merge o `explode` existe nos dois sítios que leem `FRONTEND_URL`
  (`tests/TestCase.php:25` e `config/cors.php:22`). As duas fichas da `P-44` (sondas nas telas de
  Arquivados, daqui; rastro do gate do identity, de lá) ficaram as duas.
- **`progress.md`:** as quatro entregas novas entraram em ordem de data e as duas mais antigas
  desceram para o `progress-archive.md`, que também perdeu **3 linhas duplicadas** — os dois lados
  tinham arquivado as mesmas entregas por conta própria.
- **`state.md`:** a janela voltou a cinco fechamentos, intercalando os dois lados
  (`arquivados-roots-restantes` → `identity-ativacao-acesso-redator` → `arquivados-e-restauracao` →
  `bd13-listagens-e-abas` → `bd16-perfil-e-kit-compartilhado`). Saíram da janela, para o git e para o
  `progress-archive.md`: `dashboard-frontend-analitico-e-redator`, o trabalho fora de bloco de
  2026-08-17 e `meu-perfil-frontend`.

**O merge achou uma coisa que nenhum dos dois lados tinha:** juntas, as duas suítes passam de
**828 testes** e estouram o `memory_limit` de **128M** do container — o `docker compose exec -T app
php artisan test` do `CLAUDE.md` §6 morre com `Allowed memory size … exhausted` no
`ManualTurmaTest`. Não é defeito de teste (o `--filter` passa em 2,35s) nem do merge: o pico é
**129 MB**, um megabyte além do default. Pelo binário direto com `-d memory_limit=1G` a suíte fecha
verde. Virou a **P-50**, travada em decisão do João, porque `docker/php/uploads.ini` cai em `conf.d`
e vale para o PHP-FPM de produção também.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.
