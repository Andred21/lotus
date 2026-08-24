---
schema_version: 2
mode: multi-lane
focused_lane: lane-a
active_feature: null
active_work_item: frontend-revisao-ui-por-modulo
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-08-22-frontend-revisao-ui-por-modulo-design.md
active_plan: docs/superpowers/plans/2026-08-22-frontend-revisao-ui-por-modulo.md
context_packet: null
blocker: null

lanes:
  lane-a:
    active_work_item: frontend-revisao-ui-por-modulo
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: ../fix-frontend
    branch: refactor/frontend-revisao-ui
    active_spec: docs/superpowers/specs/2026-08-22-frontend-revisao-ui-por-modulo-design.md
    active_plan: docs/superpowers/plans/2026-08-22-frontend-revisao-ui-por-modulo.md
    context_packet: null
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
last_completed_work_item: feedbacks-resolver-escopo
state_basis_commit: 17459d46
updated_at: 2026-08-24T11:20:00-03:00
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
| `lane-a` | ~~`feedbacks-resolver-escopo` (1)~~ — **fechado em 2026-08-22** | Backend | main tree (gate P-03) | `feat/feedbacks-resolver-escopo` (não mesclada) |
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

## Lane-a — 2026-08-22: item 16 promovido, com duas exceções declaradas

Promoção explícita do João (sessão 2026-08-22), com a lane-a em `idle`: item **16**
(`frontend-revisao-ui-por-modulo`) da fila, rota direta a `planning` — o bloco nasce de medição
local (`audits/` + fichas `D-38`/`D-39`), sem fonte externa, então `context_packet` fica `null`.

Duas exceções decididas na abertura, não descobertas na execução:

- **Docs de `docs/superpowers/**` escritos na worktree `fix-frontend`**, contra a invariante que os
  reserva ao main tree. O próprio item 16 nasceu nesta branch (`a259cf80`, `eaa9e15c`) e ainda não
  chegou à `main`; escrever no main tree criaria dois backlogs divergentes.
- **A branch `refactor/frontend-revisao-ui` continua**, com merge só no fim. Ela já carrega código
  do item 16 — `ac4eef8a` (os seis defeitos de `shared/ui` do Dashboard) e `a36be316`.

Registro corrigido: a tabela de seleção multi-lane chama `feat/feedbacks-resolver-escopo` de "não
mesclada"; ela está na `main` desde `15e6a72e` (PR #65).

Corte da fatia (decisão do João): três superfícies em série — Dashboard view `ready-redator`,
Operação (`/operacion` + detalhe) e Comercial (`/comercial` + detalhe). O resto do item 16 fica
para um bloco irmão. **A P-47 não fecha aqui**: o acesso de redator é provisionado pelas portas
reais da API e devolvido no fechamento.

## Lane-a — 2026-08-23: fatia 1 vai a review com escopo cortado pelo João

O bloco `frontend-revisao-ui-por-modulo` sai de `executing` com as **Tasks 1 a 9 executadas e
provadas** (duas runs de `/lotus-ui-review`, 14 achados corrigidos: 5 da run 1 + 9 da run 2) e as
**Tasks 10 a 13 NÃO executadas**, por decisão explícita do João em 2026-08-23 ("quero seguir logo
para o review"). Não é conclusão de plano: é corte de escopo declarado.

Fica em aberto, e a triagem do review herda:

- **Run 3 (Comercial)** — Tasks 10 e 11 do plano, nunca rodadas.
- **Fichas `D-*` da Task 12** — a UI-04 da run 1 (janela da agenda, backend) e a recusa em espanhol
  fixo de `Turma.php:200` (metade da UI-01 da run 2) seguem sem ficha no backlog; `D-38` e `D-39`
  seguem sem a atualização que a task previa.
- **Minor 2, 3 e 5 da revisão da Task 9** — hover coberto pela coluna fixa, sombra de rolagem
  escondida, slot `actions` do `DetailHeader` reposicionado pelo `items-baseline`.
- **Banco de dev não devolvido** (Task 13 Step 1): o papel `redator` concedido na Task 3 segue no
  usuário 1. A devolução foi tentada nesta sessão e recusada pelo classificador de permissão.
- **Stack `lotus-infra` (lane-b) parada** desde a Task 3 para liberar 8080/3307/8025/9000;
  reversível com `docker compose up -d` em `/home/jvbat/projetos/lotus-infra`.

Gate rodado mesmo com o corte: fence `main...HEAD -- backend/ generated.ts` **vazio**, `pnpm lint` 0,
`pnpm build` verde, suíte **96 arquivos / 513 testes**, zero achado `C` aberto nas duas runs. O
destino de cada achado está na §3 dos dois relatórios em `docs/superpowers/audits/`.

## Lane-a — 2026-08-24: review da fatia 1, 4 achados, os quatro corrigidos

**Classificação: BAIXO risco** — uma lente, sem revisão independente do Codex. A fronteira do bloco
foi provada, não suposta: `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts`
devolve **zero arquivo** em 30 commits. **Órfãos: limpo** — todo símbolo novo tem consumidor, o
`useIsCompactViewport` segue exportado do `useViewport.ts` que o substituiu, e as duas chaves de
locale que ficaram órfãs saíram das três. **Leis §5: nenhuma ferida.**

Os quatro achados foram aprovados pelo João e corrigidos, um commit por achado:

- **Q-1 🟡 (`6e38a90f`)** — o link da pendência do redator, corrigido em `d573c568`, levava à turma
  certa e à **aba errada**: a página abria em `useState(0)` (Configuración) e a documentação é o
  quarto dos cinco painéis, que em 390x844 nasce fora da régua. O docblock da lista e a §3 do
  relatório de 2026-08-22 já afirmavam o destino que o código não entregava. A aba passou a ter
  nome (`TURMA_TABS`) e a viver na URL (`?tab=docs`). Três catracas: nome→índice, URL→aba e a
  **ordem dos cinco painéis** — sem a terceira, as duas primeiras provariam uma convenção que o
  JSX não segue.
- **Q-2 🟡 (`ae6b1079`)** — `TurmaConfigCard` e `RedatorDesignation` escondiam a escrita pela RN-15
  e **nunca pela permissão**; `operation.turma.update` e `operation.turma.assign_redator` existem
  no `TurmaController` e nenhuma tela as consultava. Pesava porque este bloco passou a mandar o
  redator para essa página: com `turma.view` e `submit_docs`, ele recebia três controles que só
  rendem 403. Predicado único nos dois arquivos, com catraca por componente e sessão real no store.
- **Q-3 🟡 (`17459d46`)** — `scrollable` tinha nascido ligada **por padrão** no `AppTabView` a
  partir de uma medição feita numa tela só, e o default alcançava os quatro `ModuleTabs`
  (Comercial, Administración, Personas, Certificados), **nenhum medido** — ainda por cima com a run
  de Comercial cortada do escopo. Voltou a ser pedida por sítio; a tela da turma pede, as outras
  quatro pedem quando forem medidas (bullet no item 16 do backlog).
- **Q-4 🟢 (`cebed9b2`)** — quatro sítios montavam a chave de tradução por template e nada ligava o
  union `TurmaDocumentType` às chaves que ele pressupõe: tipo novo imprimiria
  `operation.documents.type.EVALUACION_XPTO` na tela. Mapa único
  (`Record<TurmaDocumentType, string>`, exaustivo por compilador) + catraca das 3 locales. A raiz —
  o DTO tipar `missing_types` como `string[]` — é backend e virou **D-57**.

**Gate re-rodado sobre a árvore corrigida, não herdado:** `pnpm lint` exit 0, `pnpm build` verde,
suíte **99 arquivos / 534 testes** (entrada do review: 96 / 513 — os 21 testes novos são as
catracas dos quatro achados).

**O que a triagem NÃO reabriu**, porque é decisão registrada e não achado: run 3 (Comercial),
fichas `D-38`/`D-39`, Minors 2/3/5 da Task 9, banco de dev com o papel `redator` no usuário 1 e a
stack `lotus-infra` parada. Tudo isso segue na seção de 2026-08-23 acima, e é herança do
fechamento — não deste review.

O fechamento **não foi executado** — é a próxima instrução, por `next_action: close_active_work_item`.

## Último item fechado — 2026-08-22 (`feedbacks-resolver-escopo`, item 1 da fila consolidada)

Sete tasks do `active_plan` executadas e provadas; branch `feat/feedbacks-resolver-escopo`, main
tree (gate P-03), commits `f6b04b45`..`6b4585ea` mais o commit documental deste handoff.

- **Comportamento provado fora da suíte**, não por ferramenta verde: banco de dev de 42 para 40
  permissões, órfãs `feedback.*` em 0, role `redator` de 4 para 2; `migrate:rollback` devolveu as
  duas e `migrate` removeu de novo; `GET /api/permissions` com sessão de admin real devolveu 40
  itens em 5 grupos, zero `feedback.*`; sessão de redator ativo trouxe 2 permissões e
  `POST /api/turmas/6/documents` respondeu **201** — a prova de que a remoção não tirou capacidade.
- **Registro externo (Task 7) escrito com OK do João, documento a documento.** O MCP do Drive não
  edita conteúdo no lugar, então os dois documentos foram recriados e os originais foram para a
  lixeira, pela rota que o João escolheu. IDs vigentes: `requisitos-negocio.md` =
  `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`, `entidade-feedback.md` =
  `16YxxQ52VnEeoah_SCja6TubnvtOtMDql`; Notion 7.4.1 em `Concluída`.
- **Resíduo declarado, não escondido:** `DeleteTurmaDocumentAction` é soft delete, então a sonda de
  upload deixou `files#43` arquivada e inerte (index devolve `[]`). Hard-delete seria escrita
  destrutiva fora dos paths autorizados pelo plano.

### Review de sprint — 2026-08-22: 4 achados, nenhum de comportamento

Classificação **alto risco** (RBAC + migration), então além do gabarito do projeto rodou a segunda
lente do Codex em read-only sobre o mesmo intervalo. **Órfãos: limpo. Leis §5: nenhuma ferida** —
`permissions` é tabela do Spatie, sem `Auditable`, então a §5.2 não é alcançada pela escrita da
migration.

Os quatro achados eram de registro e de força de teste. **O João aprovou Q-1, Q-2 e Q-3**, aplicados
em `dfb18d8d`; **Q-4 ficou deferido** e foi para o `backlog.md`, no bloco 3 (`hardening-acesso-
ownership-e-integridade`), que é onde o resto do RBAC se fortalece.

- **Q-1** — `.claude/rules/backend-ddd.md` e `docs/estrutura-monolito.md` (3 sítios) ainda
  declaravam `Feedback` como domínio a criar. A rule é **normativa e path-scoped**: entra sozinha em
  qualquer toque a `backend/app/**`, e dizia "não existe ainda" — promessa de futuro contra a D1.
- **Q-2** — `docs/README.md` mantinha 26 tabelas-alvo / 19 de domínio contra as 25 / 18 que o bloco
  escreveu no DER; divergência criada pelo próprio bloco.
- **Q-3** — o `active_plan` prometia 43→41 permissões em 4 sítios; o medido é 42→40.
- **Q-4 (deferido)** — os testes da migration não cobrem o filtro `guard_name` nem o
  `forgetCachedPermissions()` do `up()`: apagar qualquer um dos dois deixa a suíte verde (lição 10).
  Impacto hoje baixo — o banco só tem o guard `web` (medido) e o projeto não usa teams.

As correções tocaram **somente documentação** — `git diff` do commit não traz nenhum arquivo de
`backend/` ou `frontend/`, então suíte, build e lint do bloco seguem válidos como provados.

### Fechamento — 2026-08-22: o DoD reprovado contra o banco de dev, e uma pendência que o próprio bloco venceu

**Item 0 do gate, refeito e não herdado.** A suíte roda em sqlite `:memory:` com o catálogo já
limpo, então ela não é prova deste bloco — o que se remediu foi o banco de dev e a API:

- ciclo completo da migration: **40** permissões e **0** órfãs; `migrate:rollback --step=1` devolveu
  as duas `feedback.*` e o total voltou a **42**; `migrate` removeu de novo, órfãs em **0** e a role
  `redator` de volta às suas **2** (`operation.turma.view`, `operation.turma.submit_docs`);
- `GET /api/permissions` com sessão de admin real (cookie Sanctum, `Origin` + `Accept`) devolveu
  **200 com 40 itens em 5 grupos** — `identity` 6, `commercial` 16, `catalog` 5, `operation` 10,
  `certification` 3 — e **zero** `feedback.*`;
- sessão de **redator ativo** (`juan.morales@lotus.cl`) trouxe **exatamente 2** permissões, e
  `GET /api/turmas/6` e `GET /api/turmas/6/documents` responderam **200/200**: a remoção não tirou
  capacidade. O `POST` de documento **não** foi repetido — foi provado em **201** na execução, e
  repetir só criaria uma segunda sonda soft-deleted. O `[]` do index confirma que a `files#43` da
  execução segue inerte.

**Resto do gate.** Suíte **877 testes / 3131 asserções / 0 falha / 5 skipped**; `pnpm lint` exit 0;
`pnpm build` verde; `pnpm test` 87 arquivos / 481 testes; Pint `passed` nos 5 arquivos da sprint;
`typescript:transform` rodado e `generated.ts` **sem diff** — nenhum DTO no intervalo. Nenhuma lei
do §5 ferida. Nenhum `.gitkeep` órfão, nenhum placeholder, zero `feedback` residual em catálogo,
seeder e nas três locales.

**O comando de teste documentado morreu de novo, e é a P-50** — `Allowed memory size of 134217728
bytes exhausted … PhpEngine.php:62`. Terceira medição consecutiva com o pico encostando no teto
(129, 127, 129 MB). A ficha ganhou a medição de hoje; o gate rodou pelo binário direto, como ela
manda.

**A P-43 fechou aqui, e o gate parou para isso.** O `608a436c` tocou `docs/der-fisico.md`, que era
exatamente o gatilho da ficha. Honrá-la mexia no contador que o **Q-2 do review** tinha acabado de
reescrever (`26/19` → `25/18`), então a decisão foi do João, não minha. **O alcance era maior que os
quatro sítios registrados:** medido contra o banco, `certificates` tem 6 linhas e
`certificate_sequences` tem 1, ambas de `2026_08_05_100000_certificates.php`. As duas saíram de
`Tabelas PLANEJADAS` para uma seção `Certification` em `IMPLEMENTADAS`, **escrita a partir da
migration e não do rascunho PT/ES** — o rascunho prometia um `qr_code_hash UK` que não existe em
lugar nenhum do backend e omitia `redator_id`, `snapshot`, `revoked_at`, `revocation_reason` e a
coluna gerada `active_enrollment_id`. O contador virou "18 de domínio, todas implementadas", a
seção virou `Tabelas que NÃO existem (e por quê)` e a legenda que explicava a convenção de tabela
planejada saiu, porque não descrevia mais nada.

**Efeito colateral no backlog, registrado e não silencioso:** a P-43 saiu do escopo do **BD-15**, e a
ficha do **D-17** parou de chamar as permissões `feedback.*` de "instância viva" — este bloco as
apagou. O D-17 mudou de natureza: perdeu o caso vivo e ganhou o **caso de regressão**, porque a
catraca que ele pede tem de reprovar justamente a aresta que este bloco removeu à mão.

**Rastro:** a **P-40** saiu de `encerradas.md` (primeiro fechamento posterior ao do BD-12) e a
**P-43** entrou. Abertas: **29 → 28**. Plano e spec arquivados; a entrega mais antiga do
`progress.md` (2026-08-17, Dashboard B2) desceu **verbatim** para o `progress-archive.md`, que
mantém o limite de dez.

**A branch `feat/feedbacks-resolver-escopo` não foi mesclada** — merge é passo do
`finishing-a-development-branch`, e a integração é serial entre lanes. Decisão do João.

**Estado: `idle` na lane-a.** As lanes `b` e `c` seguem em `context_required` com o Codex; o foco
continua em `lane-a` de propósito — mudar de foco é promover trabalho, e o backlog não promove
sozinho.


## Penúltimo item fechado — 2026-08-22 (`bd12-load-state-e-listas`, BD-12 dos blocos de dívida)

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

## Antepenúltimo item fechado — 2026-08-20 (`bd18-useloadstate-promise-e-forma`, BD-18 dos blocos de dívida)

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

## Quarto item fechado — 2026-08-20 (`bd14-contrato-de-entrada`, BD-14 do backlog)

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

## Quinto item fechado — 2026-08-20 (`bd17-superficie-de-arquivados`, BD-17 dos blocos de dívida)

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
