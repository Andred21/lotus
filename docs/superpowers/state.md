---
schema_version: 2
mode: multi-lane
focused_lane: lane-c
active_feature: frontend
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
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: main-tree
    branch: feat/hardening-acesso-ownership-e-integridade
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-acesso-ownership-e-integridade
  lane-b:
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: null   # ../lotus-infra removida em 2026-08-22, depois do merge
    branch: null # infra/producao-runtime-e-aws mesclada no PR #67 e apagada (era c27492d7)
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: infra-producao-runtime-e-aws
  lane-c:
    active_feature: frontend
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
    last_completed_work_item: BD-15-docs-guardrails-e-sincronizacao
last_completed_work_item: BD-15-docs-guardrails-e-sincronizacao
state_basis_commit: 806099d9
updated_at: 2026-08-24T13:10:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.
>
> **Só o trabalho ATIVO mora aqui.** Bloco fechado deixa uma linha em `## Itens fechados`; a
> narrativa dele vive em `historico/state-archive.md`. Este é o arquivo que toda sessão lê
> primeiro (`CLAUDE.md` §3), e ele só se mantém legível se encolher a cada fechamento.

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
- **`docs/superpowers/**` se divide por DONO, não por árvore.** A regra anterior — *"muda somente
  pelo main tree; branch de lane em worktree não toca esses arquivos"* — foi quebrada por 21
  commits da lane-c no mesmo dia em que foi escrita, e a exceção redigida não cobria o que a lane
  realmente escreveu (Q-2 do review de 2026-08-22). Regra vigente, cada lane escreve **só o que é
  dela**, na árvore em que estiver:
  - **O bloco dela em `lanes:`** — nunca o de outra lane.
  - **Spec, plano e context packet dela**, e o arquivamento deles no fechamento.
  - **Fichas de `pendencias/`** que ela abre ou fecha, com a linha do índice que as acompanha.
  - **A linha dela** em `historico/progress.md`, a narrativa dela em `historico/state-archive.md`
    e a linha dela na tabela `## Itens fechados` — tudo no commit de fechamento.
  - **A remoção do próprio item** de `backlog.md`. Promover, reordenar ou acrescentar item ali é
    do main tree, com o João.
  - **Entregáveis de doc** que o plano dela autorizar, nos paths que o plano nomeia.
  - **Nunca os campos singulares do topo**: são espelho de `focused_lane`, e trocar o foco é
    fronteira durável do main tree.

  Colisão que sobrar é resolvida pela integração serial, que já é invariante logo abaixo: uma lane
  mescla por vez, as demais rebasam antes de continuar.
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

> A tabela acima é **registro da seleção de 2026-08-22**, não a lista do que está ativo. Os três
> itens que ela promoveu fecharam: o 1 e o 14 em 2026-08-22 (PR #65 e PR #66, merge `61acc0c3`) e o
> 10 em 2026-08-22 (PR #67, merge `31f91987`). As lanes foram reatribuídas. O que está vivo agora
> está na seção abaixo.

## Ocupação corrente — 2026-08-24

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree | `feat/hardening-acesso-ownership-e-integridade` (não mesclada) | `idle` |
| `lane-b` | — | — | — (destruída) | — (destruída) | `idle` |
| `lane-c` | `frontend-revisao-ui-por-modulo` (item 16) | Frontend | `../fix-frontend` | `refactor/frontend-revisao-ui` | `ready_for_closure` |

**A `lane-a` fechou o item 3 em 2026-08-23 e voltou a `idle`.** A branch
`feat/hardening-acesso-ownership-e-integridade` traz a `main` de volta pelo merge que registra este
estado e **ainda não foi mesclada** — é o PR aberto. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

**A `lane-b` fechou o item 10 em 2026-08-22** — `infra-producao-runtime-e-aws`, mesclada no
**PR #67** (merge `31f91987`), narrativa em `historico/state-archive.md`. A worktree
`../lotus-infra` e a branch `infra/producao-runtime-e-aws` **foram destruídas depois do merge**, por
decisão do João e pelo mesmo precedente da lane que fechou o BD-15; por isso `tree` e `branch` dela
são `null`.

**A `lane-c` é a worktree `../fix-frontend`, e o registro dela nasceu atrasado.** A lane executava o
item 16 desde 2026-08-22 sem existir em `lanes:` — corrigido na reconciliação de 2026-08-22
(`79c246c6`). Duas irregularidades ficam **declaradas, não descobertas depois**:

- **`active_plan` era `null` com a lane em `executing`**, contra a invariante que o exige a partir
  de `ready_for_execution`. A exceção decidida pelo João em 2026-08-22 **expirou no mesmo dia**: a
  spec (`ffa1a35b`) e o plano de 13 tasks (`8e865589`) foram escritos na worktree, e os dois campos
  apontam para eles desde então. O que a `main` registrava como `null` era o atraso do espelho, não
  a ausência do artefato.
- **O item 16 foi acrescentado ao `backlog.md` pela worktree** (`eaa9e15c`), contra a invariante que
  reserva ao main tree acrescentar item à fila. O texto **não foi duplicado aqui** por decisão do
  João: duplicá-lo garantiria conflito no merge sem ganho. Ele entra na main pelo merge da lane e
  sai no `/fechar-sprint` dela. Até lá, **a fila canônica do item 16 mora na branch**, não neste
  tree.

> **Divergência de lane resolvida no merge de 2026-08-23 (main → `lane-a`), por medição.** A `main`
> trazia a `lane-c` em `idle`, com `tree` e `branch` `null` e
> `last_completed_work_item: BD-15-docs-guardrails-e-sincronizacao` — o registro **anterior** à
> reatribuição dela ao item 16, que o `state.md` da própria `../fix-frontend` também ainda carrega.
> A branch da `lane-b` saiu da `main` antes da reconciliação de `79c246c6` e por isso não a viu.
> Quem decidiu não foi a heurística de "mais recente vence": `git worktree list` mostra
> `/home/jvbat/projetos/fix-frontend` viva em `refactor/frontend-revisao-ui`, com commits até
> `1b9f82ad`. O registro que casa com a realidade é o desta branch, e é o que fica.

Interseção a vigiar entre as lanes vivas: nenhuma — a `lane-c` é a única com trabalho vivo, e ele
está em fechamento. Integração segue serial: a `main` entrou nesta branch pelo merge de 2026-08-24
(`0a61706c`, que traz o avatar de diâmetro real do `/perfil`), e é esta branch que mescla a seguir.

> **Rótulo de lane reconciliado no merge de 2026-08-24.** As três seções abaixo foram escritas na
> worktree `fix-frontend` chamando o item 16 de `lane-a`, porque a branch nasceu antes de a `main`
> reatribuir as lanes. Quem manda é a `main`: o item 16 é da **`lane-c`**, e a `lane-a` fechou o
> item 3 em 2026-08-23. Os títulos foram corrigidos; as menções a "lane-a" dentro do texto ficam
> como foram escritas — história não se reescreve, e esta nota é o que as traduz.

## Lane-c — 2026-08-22: item 16 promovido, com duas exceções declaradas

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

## Lane-c — 2026-08-23: fatia 1 vai a review com escopo cortado pelo João

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

## Lane-c — 2026-08-24: review da fatia 1, 4 achados, os quatro corrigidos

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

**Depois do review, reportes do João sobre a `TurmasTable` e nenhum achado novo.** Foram duas
rodadas na mesma tabela, e a segunda é a lição:

- **`ecc3ca75`** — "parecendo comprimida". Quatro colunas declaravam largura e três não, e com
  `table-layout: auto` a sobra vai inteira para quem NÃO declarou: as duas tags e o numeral ficaram
  com ~230px cada num contêiner de 1447px, enquanto o nome do curso quebrava em duas linhas. A
  regra virou *toda coluna declara largura, menos a que absorve a sobra*; o filtro de estado saiu
  para `TurmaStatusFilter` porque as três larguras novas passaram a tabela da régua de 150 linhas.
- **`b2075480`** — a mesma queixa de novo, e o motivo: trocar o sorteio da sobra por um
  destinatário fixo é o mesmo defeito com outro dono. CURSO foi a **519px** em 1603px, metade
  vazia, com CLIENTE ainda truncando em 222px. A largura passou a **porcentagem** (91% + a coluna
  de ações em `rem`, que é a única que não deve escalar): em porcentagem não há sobra a repartir, e
  o `min-content` segue protegendo a tela estreita. A pergunta certa não era "quanto mede cada
  coluna" e sim "para onde vai a sobra" — as três medições ficaram no docblock de
  `turmaColumns.ts`.
- **`d3779709`** — no mesmo quadro, o avatar do `IdentityCell` virava **elipse**: item de flex
  encolhe por padrão, e quando o texto ao lado transbordava o avatar cedia largura e mantinha
  altura. Ovalizavam exatamente as linhas cujo nome truncava. `shrink-0` corrige nos 14 sítios, nas
  duas formas.

Nenhum dos três tem prova de navegador — a stack de dev segue parada.

O João também aprovou o padrão da coluna de ações da mesma tabela (ícones à direita, presa ao
invólucro que rola) **para todas as tabelas do sistema**, e pediu que não poluísse esta execução:
virou o **item 17** do backlog, com a evidência medida (12 tabelas têm coluna de ação, 2 a prendem)
e com a política de largura junto.

O fechamento **não foi executado** — é a próxima instrução, por `next_action: close_active_work_item`.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-23 | `hardening-acesso-ownership-e-integridade` | Item 3 da fila consolidada |
| 2026-08-22 | `infra-producao-runtime-e-aws` | Item 10 da fila |
| 2026-08-22 | `BD-15-docs-guardrails-e-sincronizacao` | Item 14 da fila |
| 2026-08-22 | `feedbacks-resolver-escopo` | Item 1 da fila consolidada |
| 2026-08-22 | `bd12-load-state-e-listas` | BD-12 dos blocos de dívida |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
