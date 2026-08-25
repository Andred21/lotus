---
schema_version: 2
mode: multi-lane
focused_lane: lane-c
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
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
    branch: feat/certificacao-historico-do-aluno   # fechada em 2026-08-24; PR aberto, ainda não mesclada
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: certificacao-historico-do-aluno
  lane-b:
    active_feature: cicd
    active_work_item: cicd-ci-governanca-e-artefato
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../lotus-infra
    branch: cicd/ci-governanca-e-artefato
    active_spec: docs/superpowers/specs/2026-08-24-cicd-ci-governanca-e-artefato-design.md
    active_plan: docs/superpowers/plans/2026-08-24-cicd-ci-governanca-e-artefato.md
    context_packet: docs/superpowers/context-packets/2026-08-24-cicd-ci-governanca-e-artefato.md
    blocker: null
    resume_state: null
    last_completed_work_item: compose-por-worktree
  lane-c:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: refactor/frontend-revisao-ui-f2   # fechada em 2026-08-25; ainda não mesclada
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-revisao-ui-por-modulo-f2
last_completed_work_item: frontend-revisao-ui-por-modulo-f2
state_basis_commit: 8d588511
updated_at: 2026-08-25T18:40:00-03:00
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
| `lane-a` | — | — | main tree | `feat/certificacao-historico-do-aluno` (mesclada, PR #73) | `idle` |
| `lane-b` | `cicd-ci-governanca-e-artefato` (item 11) | GitHub/Infra | `../lotus-infra` | `cicd/ci-governanca-e-artefato` | `executing` |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-revisao-ui-f2` (fechada em 2026-08-25, não mesclada) | `idle` |

**A `lane-b` fechou o `compose-por-worktree` em 2026-08-24, voltou a `idle` e recebeu o item 11 no
mesmo dia**, por promoção explícita do João. A narrativa do bloco anterior está em
`historico/state-archive.md`; a entrega, em `historico/progress.md`. Nenhuma lane recebe item novo
sozinha: promoção é do João, contra o `backlog.md`.

**Promoção do item 11 — 2026-08-24.** O `backlog.md` marca o item como `Contexto: sim`, então a lane
nasce em `context_required`: o Context Packet vem antes do `/planejar-bloco`, e o packet é do Codex
(`.agents/skills/lotus-context-packet`), em sandbox read-only. A branch sai de `main@6e8e8618`, que já
é `origin/main` — as três lanes anteriores mesclaram.

**Fora de ordem em relação ao item 10, de propósito.** O `backlog.md` recomenda `10→11→12`, mas o que
sobrou do item 10 é o `infra-producao-provisionamento-aws` (EC2, RDS, S3, SES, TLS), travado nas
quatro decisões do João que o bloco do runtime mediu como abertas. O item 11 é GitHub, GHCR e
governança de branch — **não toca conta AWS**. Quem depende de recurso real é o item 12
(`SSH EC2 → compose pull`), e ele continua atrás do 10. A dependência que o 11 realmente tem é o
runtime, e esse fechou em 2026-08-22 (PR #67): é a imagem dele que a CI vai construir e etiquetar por
SHA.

**A interseção que a seleção de 2026-08-22 previu não existe — medida e desfeita.** Aquela seção
escreveu que o `BD-15` e a futura CI tocavam `.github/workflows`; era previsão, não medição. O
Context Packet mediu: não há `.github/` nesta árvore, `git log --all -- .github/workflows` volta
vazio, e a PR #66 (BD-15) não lista o diretório. **Todo workflow deste bloco nasce do zero** — não há
o que preservar, e não há colisão a vigiar com a lane-c.

**A `lane-c` fechou o item 17 em 2026-08-24** — `tabelas-coluna-de-acoes-e-largura`, narrativa
integral em `historico/state-archive.md`. A worktree `../fix-frontend` e a branch
`refactor/tabelas-coluna-de-acoes` seguem vivas: a branch **ainda não foi mesclada**, é o PR a
abrir. A lane não recebe item novo sozinha: promoção é do João, contra o `backlog.md`. O
fechamento mediu a suíte do backend em **906 passed / 5 skipped** depois de reconstruir a imagem
`app` desta worktree — a antiga era anterior ao `memory-cli.ini` e o §6 do `CLAUDE.md` fatalava por
memória nela. Está registrado como **P-57**, e é ambiente, não código: o bloco não toca `backend/`. O merge
da `main` (PR #70) entrou aqui e o gate foi refeito sobre ele: lint 0, build verde, **102 arquivos /
573 testes** — os 3 casos de `tests/compose-dev.test.ts` que reprovavam eram o `frontend/.env` desta
árvore com `VITE_API_URL` legado, que o teste não afasta; virou a **P-58**.

**A `lane-a` fechou o item 2 em 2026-08-24** — `certificacao-historico-do-aluno`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/certificacao-historico-do-aluno` nasceu de `main@cad0d1fb`, mescla a `main` de PR #72 para
dentro neste commit e vai a PR; a árvore é o main tree, que não se destrói. A lane não recebe item
novo sozinha: promoção é do João, contra o `backlog.md`.

**Gate refeito sobre a `main` de PR #72, dentro do merge:** backend **937 passed / 5 skipped**,
frontend lint 0, build verde e **107 arquivos / 595 testes**, Pint `passed` nos 18 arquivos PHP do
bloco. O merge pediu três consertos de conteúdo, não de marcador: a `HistorialTable` ficou com a
coluna presa e a largura por política da `main` **e** com o `display_status` do servidor deste
bloco; a tabela de turmas do detalhe do aluno perdeu os `style` literais e passou a declarar
largura, com a chave `certificate` nova em `studentTurmaWidths` (pesa como `COL.text` — a célula
empilha código, tag, data, marca de reemissão e o botão do PDF); e as duas pendências abertas por
este bloco foram renumeradas para **P-59** e **P-60**, porque a `main` já usava `P-55` e `P-56`. Os
3 casos de `tests/compose-dev.test.ts` que reprovavam aqui eram a **P-58** de novo — o
`frontend/.env` desta árvore com `VITE_API_URL` legado —, e a árvore adotou o molde do
`frontend/.env.example` (arquivo gitignored, nada commitado).

**O que a `main` trouxe e a `lane-a` NÃO refaz:** o `compose-por-worktree` pagou a **P-03** em
2026-08-24, depois que este bloco já rodava. O gate P-03 citado na narrativa arquivada deste bloco
fica como está — era verdade no dia da promoção, e narrativa arquivada não se reescreve.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-25 | `frontend-revisao-ui-por-modulo` (fatia 2 de 2) | Item 16 da fila |
| 2026-08-24 | `certificacao-historico-do-aluno` | Item 2 da fila |
| 2026-08-24 | `tabelas-coluna-de-acoes-e-largura` | Item 17 da fila |
| 2026-08-24 | `compose-por-worktree` (paga a **P-03**) | Fora da fila — ficha `P-03` |
| 2026-08-24 | `frontend-revisao-ui-por-modulo` (fatia 1 de 2) | Item 16 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
