---
schema_version: 2
mode: multi-lane
focused_lane: lane-c
active_feature: null
active_work_item: tabelas-coluna-de-acoes-e-largura
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-24-tabelas-coluna-de-acoes-e-largura-design.md
active_plan: docs/superpowers/plans/2026-08-24-tabelas-coluna-de-acoes-e-largura.md
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
    active_feature: null
    active_work_item: tabelas-coluna-de-acoes-e-largura
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../fix-frontend
    branch: refactor/tabelas-coluna-de-acoes
    active_spec: docs/superpowers/specs/2026-08-24-tabelas-coluna-de-acoes-e-largura-design.md
    active_plan: docs/superpowers/plans/2026-08-24-tabelas-coluna-de-acoes-e-largura.md
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-revisao-ui-por-modulo
last_completed_work_item: frontend-revisao-ui-por-modulo
state_basis_commit: cad0d1fb
updated_at: 2026-08-24T21:10:00-03:00
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
| `lane-c` | `tabelas-coluna-de-acoes-e-largura` (item 17) | Frontend | `../fix-frontend` | `refactor/tabelas-coluna-de-acoes` | `executing` |

**A `lane-a` fechou o item 3 em 2026-08-23 e voltou a `idle`.** A branch
`feat/hardening-acesso-ownership-e-integridade` traz a `main` de volta pelo merge que registra este
estado e **ainda não foi mesclada** — é o PR aberto. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

**A `lane-b` fechou o item 10 em 2026-08-22** — `infra-producao-runtime-e-aws`, mesclada no
**PR #67** (merge `31f91987`), narrativa em `historico/state-archive.md`. A worktree
`../lotus-infra` e a branch `infra/producao-runtime-e-aws` **foram destruídas depois do merge**, por
decisão do João e pelo mesmo precedente da lane que fechou o BD-15; por isso `tree` e `branch` dela
são `null`.

**A `lane-c` recebeu o item 17 em 2026-08-24, por promoção explícita do João** contra o
`backlog.md`, com a árvore em `idle`. O item declara `Contexto: não`, então a rota é direta a
`ready_for_planning` e `context_packet` permanece `null` — não há fonte externa a recuperar; a
evidência do bloco é medição local de 2026-08-24 (15 sítios de `AppDataTable`/`SearchableTableFrame`,
12 com coluna de ação, 2 presas).

A branch anterior da lane, `refactor/frontend-revisao-ui`, **foi mesclada** no **PR #69** (merge
`cad0d1fb`) — o registro acima, que a dava como não mesclada, ficou velho no fechamento da fatia 1 e
é corrigido aqui. A worktree `../fix-frontend` estava em detached HEAD sobre esse merge; a branch
`refactor/tabelas-coluna-de-acoes` nasce dele. Não há rebase pendente: `cad0d1fb` **é** a `main`.

Interseção a vigiar entre as lanes vivas: nenhuma — `lane-a` e `lane-b` seguem em `idle` e o item 17
é frontend puro (`frontend/src/**`), sem toque em `backend/` nem em `generated.ts`, logo sem gatilho
da P-03. Integração segue serial.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-24 | `frontend-revisao-ui-por-modulo` (fatia 1 de 2) | Item 16 da fila |
| 2026-08-23 | `hardening-acesso-ownership-e-integridade` | Item 3 da fila consolidada |
| 2026-08-22 | `infra-producao-runtime-e-aws` | Item 10 da fila |
| 2026-08-22 | `BD-15-docs-guardrails-e-sincronizacao` | Item 14 da fila |
| 2026-08-22 | `feedbacks-resolver-escopo` | Item 1 da fila consolidada |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
