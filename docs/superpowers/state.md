---
schema_version: 2
mode: multi-lane
focused_lane: lane-c
active_feature: frontend-estilizacao-padronizacao-de-componentes
active_work_item: frontend-estilizacao-padronizacao-de-componentes
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md
active_plan: docs/superpowers/plans/2026-08-28-frontend-estilizacao-padronizacao-de-componentes.md
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
    branch: feat/hardening-api-arquivos-e-abuso   # mesclada em 2026-08-26 (PR #78)
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-api-arquivos-e-abuso
  lane-b:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../lotus-infra
    branch: cicd/ci-governanca-e-artefato   # fechada em 2026-08-26; mesclada (PR #77)
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: cicd-ci-governanca-e-artefato
  lane-c:
    active_feature: frontend-estilizacao-padronizacao-de-componentes
    active_work_item: frontend-estilizacao-padronizacao-de-componentes
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: ../fix-frontend
    branch: refactor/frontend-estilizacao-componentes   # aberta de main@b7283736 na promocao; PR #80 mesclado em 2026-08-28
    active_spec: docs/superpowers/specs/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md
    active_plan: docs/superpowers/plans/2026-08-28-frontend-estilizacao-padronizacao-de-componentes.md
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-hardening-final
last_completed_work_item: hardening-api-arquivos-e-abuso
state_basis_commit: b7283736
updated_at: 2026-08-29T06:15:00-03:00
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

## Ocupação corrente — 2026-08-28

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree | `feat/hardening-api-arquivos-e-abuso` (mesclada, PR #78) | `idle` |
| `lane-b` | — | — | `../lotus-infra` | `cicd/ci-governanca-e-artefato` (mesclada, PR #77) | `idle` |
| `lane-c` | `frontend-estilizacao-padronizacao-de-componentes` (item 18) | Frontend | `../fix-frontend` | `refactor/frontend-estilizacao-componentes` (aberta de `main@b7283736`) | `ready_for_closure` (Q-1..Q-6 aprovados e aplicados; gate reverificado) |


> **Esta tabela é estado corrente, e por isso acompanha o frontmatter.** A linha da `lane-c` ficou
> em `ready_for_execution` enquanto o frontmatter andava até `ready_for_review` — as outras duas
> linhas batiam, então quem lesse a tabela concluiria que a lane ainda tinha bloco por executar, e a
> invariante manda PARAR diante de divergência de fase, não escolher fonte (Q-4 do review de
> 2026-08-27). Lane que muda `workflow_state` muda a própria linha aqui no mesmo commit.

**A `lane-a` fechou o item 4 em 2026-08-25** — `hardening-api-arquivos-e-abuso`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-api-arquivos-e-abuso` nasceu de `main@7fa1cb0a`, foi mesclada pelo **PR #78** em 2026-08-26 e mesclou a `main`
de PR #73/#75/#76/#77 para dentro neste commit; a árvore é o main tree, que não se destrói. A lane não recebe item novo sozinha: promoção é
do João, contra o `backlog.md`.

**A `lane-c` fechou o item 8 em 2026-08-27** — `frontend-hardening-final`, narrativa integral em
`historico/state-archive.md` e entrega em `historico/progress.md`. A worktree `../fix-frontend`
segue viva e a branch `refactor/frontend-hardening-final` foi mesclada pelo **PR #80** em 2026-08-28 (merge `b7283736`), com a `main` de
PR #78/#79 mesclada para dentro e o gate refeito sobre ela (backend **999 passed / 5 skipped**,
frontend lint 0, build verde, **111 arquivos / 622 testes**, DoD remedido no navegador). A lane não recebe item novo sozinha: promoção é do João, contra o `backlog.md` — e o
**item 18** que este bloco escreveu na fila não é exceção. O fechamento mediu backend **940 passed /
5 skipped**, frontend lint 0, build verde e **111 arquivos / 622 testes**, com o DoD refeito no
navegador contra o código pós-review.

## Promoção — 2026-08-28: o item 18 entra na `lane-c`

O João promoveu explicitamente o **item 18**, `frontend-estilizacao-padronizacao-de-componentes`,
depois da análise desta data sobre `backlog.md`, `pendencias/` e `audits/`. A dependência dele — o
item 8 — fechou em 2026-08-27, e a fonte é o `audits/2026-08-26-estilizacao-componentes.md`: **18
achados medidos, nenhum aplicado**. `Contexto: não`, então o bloco nasce em `ready_for_planning`,
sem packet. A **P-63** já está agrupada nele desde o fechamento do item 8.

**A `D-62` entra junto, por decisão do João no mesmo ato.** O hospedeiro dela era o item 8, que
fechou pagando `P-46`/`D-03`/`D-33`/`D-35` e **não** a D-62 — medido aqui: `frontend/eslint.config.js`
não tem uma linha sobre `AppDropdown`, `inputId` ou `aria-label`, e a quarta ocorrência do defeito
nasceria verde. O remédio mora no mesmo arquivo que este bloco toca. A **D-34** continua **sem
hospedeiro**: o outro candidato natural é o item 9, e escolher é do João.

**Este commit escreve o espelho singular a partir da worktree, e isso é a P-55.** A invariante diz
que `focused_lane` e os campos do topo são fronteira durável do main tree, mas `/planejar-bloco` lê
os singulares — lane sem espelho apontando para si é planejada contra a lane errada. É o **quarto**
caso da mesma pendência, registrado na ficha dela; não é exceção nova nem reescrita da invariante,
que segue aguardando a decisão do João.

### Planejamento fechado — 2026-08-28

Spec em `specs/2026-08-28-frontend-estilizacao-padronizacao-de-componentes-design.md`, plano em
`plans/2026-08-28-frontend-estilizacao-padronizacao-de-componentes.md`: 17 tasks, 93 passos,
executor `claude`. A escrita do plano mediu três coisas que **corrigem** o desenho e valem sobre o
texto da spec, e estão registradas na seção "Correções ao desenho" do próprio plano:

1. **D1 (Sidebar):** o asset é PNG, não SVG — não há `viewBox` a corrigir. Medida a caixa opaca de
   `LogoDark.png` (335×466): padding de 31/12/15/27px, que renderizado vale ~8px e **não** explica
   os 60px do `ml-15`. Recortar o asset não fecha o achado; o que sai é o empurrão manual, e o
   `h-30` fica porque é a altura do wordmark.
2. **D3 (Login):** a limitação §7 da spec está **paga e passa**. `--shell-ink` mede 8,71:1 e 9,86:1
   contra as duas pontas do `--brand-gradient`; `--shell-ink-muted`, 4,93:1 e 5,57:1. Os dois
   passam o 4,5:1 na ponta pior.
3. **`D-62`:** o seletor de lint foi rodado **antes** de virar task. Reprova exatamente uma
   ocorrência viva — `BudgetDocumentsCard.tsx:36`, a quinta que a ficha previa nascer verde — e a
   sonda negativa (remover o `inputId` de `TurmaStatusFilter.tsx:44`) reprova nomeando o arquivo.
   Os 11 `AppDropdown` dentro de `FormField` recebem o `inputId` por contexto e são grafia certa.

Um ponto que a spec não decidiu e o plano fixa: `FormSection` e os quatro `h3` de operation
consomem `SectionLabel` com `rule={false}`, para que os 8 sítios do Dashboard fiquem
byte-idênticos e nenhuma hairline nova apareça onde achado nenhum pediu.

**A narrativa do item 17 saiu daqui neste fechamento.** Ela dizia que a branch
`refactor/tabelas-coluna-de-acoes` seguia viva e sem merge — a branch já não existe nesta árvore, e
a narrativa integral do bloco (com a **P-57** e a **P-58**, que continuam abertas nas fichas) está
em `historico/state-archive.md` desde o fechamento dele. Bloco encerrado não guarda parágrafo aqui.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-27 | `frontend-hardening-final` (paga a **P-46**, `D-03`, `D-33`, `D-35`) | Item 8 da fila |
| 2026-08-26 | `cicd-ci-governanca-e-artefato` | Item 11 da fila |
| 2026-08-25 | `hardening-api-arquivos-e-abuso` | Item 4 da fila |
| 2026-08-25 | `frontend-revisao-ui-por-modulo` (fatia 2 de 2) | Item 16 da fila |
| 2026-08-24 | `certificacao-historico-do-aluno` | Item 2 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
