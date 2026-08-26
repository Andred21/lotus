---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
active_feature: null
active_work_item: infra-producao-provisionamento-aws
workflow_state: context_required
next_owner: codex
next_action: generate_context_packet
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
    branch: feat/hardening-api-arquivos-e-abuso
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-api-arquivos-e-abuso
  lane-b:
    active_feature: null
    active_work_item: infra-producao-provisionamento-aws
    workflow_state: context_required
    next_owner: codex
    next_action: generate_context_packet
    tree: ../lotus-infra
    branch: infra/producao-provisionamento-aws   # criada de cicd/promocao-deploy-e-rollback@10030c65 em 2026-08-26
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    parked_work_item: cicd-promocao-deploy-e-rollback   # item 12, blocked por dependencia deste; packet em context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md
    last_completed_work_item: cicd-ci-governanca-e-artefato
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
last_completed_work_item: hardening-api-arquivos-e-abuso
state_basis_commit: 83945ff3
updated_at: 2026-08-26T18:05:00-03:00
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
| `lane-a` | — | — | main tree | `feat/hardening-api-arquivos-e-abuso` (PR #78, aberto) | `idle` |
| `lane-b` | `infra-producao-provisionamento-aws` (item 10) | Infra/AWS | `../lotus-infra` | `infra/producao-provisionamento-aws` | `context_required` |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-revisao-ui-f2` (fechada em 2026-08-25, não mesclada) | `idle` |

**A `lane-b` recebeu o item 12 em 2026-08-26** — `cicd-promocao-deploy-e-rollback`, promovido
explicitamente pelo João com a lane em `idle`. É a continuação direta do item 11, que esta mesma lane
fechou: o 11 constrói o artefato imutável por SHA, o 12 o promove para produção com aprovação,
health e rollback. Nasceu em `context_required` (`Contexto: sim` na fila) e **o packet do Codex voltou `status: blocked`** no mesmo dia, com `RECOMMENDED_TRANSITION: blocked`: nao ha destino de deploy. O item 10 (`infra-producao-provisionamento-aws`) segue na fila com as quatro decisoes abertas, e nenhuma das cinco fontes externas consultadas entrega host, credencial SSH ou `/opt/lotus` — o `SSH EC2 -> compose pull -> migrate -> up -> /up` do escopo nao tem onde acontecer. O packet foi guardado assim mesmo, porque e a evidencia do bloqueio; **ele nao autoriza planejamento** (§6 do `/planejar-bloco`: `status: blocked` nunca prossegue). A leitura viva de `Gatika-CL/lotus` falhou com `404`, entao Environment/secrets/branches do corporativo ficam sem comprovacao — a P-62 ja prevê o teto do plano Free. A branch
`cicd/promocao-deploy-e-rollback` sai de `main@83945ff3` — o tip da `origin/main`, que já contém o
item 11 mesclado (PR #79), então o artefato que este bloco promove existe. **O espelho do topo virou
para `lane-b` nesta árvore**, fora do main tree: é a **P-55**, e segue o precedente medido de
2026-08-24, quando as três lanes fizeram o mesmo. A `lane-a` está em `ready_for_planning` do item 5
na branch dela; o João decidiu que o 12 planeja primeiro, e o planejamento segue serial.

**O item 10 assumiu a `lane-b` em 2026-08-26** — `infra-producao-provisionamento-aws`, promovido explicitamente pelo Joao **depois** de o item 12 voltar `blocked` por depender dele. E a saida escolhida entre as tres oferecidas: provisionar antes, em vez de recortar o 12 num workflow que nunca roda. O item 10 tambem e `Contexto: sim`, entao nasce em `context_required`. A branch `infra/producao-provisionamento-aws` sai da propria `cicd/promocao-deploy-e-rollback@10030c65`, e nao da `main`, **de proposito**: o packet do item 12 e o registro do bloqueio viajam junto e chegam a `main` no merge, para que ninguem refaca a medicao. **As quatro decisoes abertas (regiao, tamanho da EC2, DNS/SES + canal de alerta, teto de custo) nao bloqueiam o planejamento** — o proprio item 10 diz isso por escrito; cada uma bloqueia o recurso correspondente, e elas se fecham no brainstorming, com a evidencia de custo e latencia que o packet trouxer.

**O item 12 fica estacionado, nao cancelado.** Ele segue no `backlog.md` (fila nao se mexe durante planejamento), o packet `status: blocked` fica guardado como evidencia e o campo `parked_work_item` da lane-b registra o vinculo. Quando o 10 provisionar o host, o packet do 12 regenera pelo gatilho de staleness que ele mesmo declara: *"um alvo AWS real ser provisionado"*.

**A `lane-a` fechou o item 4 em 2026-08-25** — `hardening-api-arquivos-e-abuso`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-api-arquivos-e-abuso` nasceu de `main@7fa1cb0a`, está em **PR #78** e mescla a `main`
de PR #73/#75/#76/#77 para dentro neste commit; a árvore é o main tree, que não se destrói. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

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

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-26 | `cicd-ci-governanca-e-artefato` | Item 11 da fila |
| 2026-08-25 | `hardening-api-arquivos-e-abuso` | Item 4 da fila |
| 2026-08-25 | `frontend-revisao-ui-por-modulo` (fatia 2 de 2) | Item 16 da fila |
| 2026-08-24 | `certificacao-historico-do-aluno` | Item 2 da fila |
| 2026-08-24 | `tabelas-coluna-de-acoes-e-largura` | Item 17 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
