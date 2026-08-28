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
active_spec: docs/superpowers/specs/2026-08-28-hardening-performance-e-dados-design.md
active_plan: null
context_packet: docs/superpowers/context-packets/2026-08-28-hardening-performance-e-dados.md
blocker: null
lanes:
  lane-a:
    active_feature: hardening
    active_work_item: hardening-performance-e-dados
    workflow_state: planning
    next_owner: claude
    next_action: continue_active_planning
    tree: main-tree
    branch: feat/hardening-performance-e-dados   # aberta de main@f584432b na promoção; PR #81 mesclado em 2026-08-28
    active_spec: docs/superpowers/specs/2026-08-28-hardening-performance-e-dados-design.md
    active_plan: null
    context_packet: docs/superpowers/context-packets/2026-08-28-hardening-performance-e-dados.md
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-auditoria-privacidade-e-observabilidade
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
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: refactor/frontend-estilizacao-componentes   # aberta de main@b7283736; fechada em 2026-08-29, SEM merge
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-estilizacao-padronizacao-de-componentes
last_completed_work_item: frontend-estilizacao-padronizacao-de-componentes
state_basis_commit: 0d0645f7
updated_at: 2026-08-29T07:05:00-03:00
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

## Ocupação corrente — 2026-08-29

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | `hardening-performance-e-dados` (item 6) | Backend | main tree | `feat/hardening-performance-e-dados` | `planning` |
| `lane-b` | — | — | `../lotus-infra` | `cicd/ci-governanca-e-artefato` (mesclada, PR #77) | `idle` |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-estilizacao-componentes` (fechada em 2026-08-29, **sem merge**) | `idle` |


> **Esta tabela é estado corrente, e por isso acompanha o frontmatter.** A linha da `lane-c` ficou
> em `ready_for_execution` enquanto o frontmatter andava até `ready_for_review` — as outras duas
> linhas batiam, então quem lesse a tabela concluiria que a lane ainda tinha bloco por executar, e a
> invariante manda PARAR diante de divergência de fase, não escolher fonte (Q-4 do review de
> 2026-08-27). Lane que muda `workflow_state` muda a própria linha aqui no mesmo commit.

**A `lane-a` fechou o item 5 em 2026-08-28** — `hardening-auditoria-privacidade-e-observabilidade`,
narrativa integral em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-auditoria-privacidade-e-observabilidade` nasceu de `main@038b4a70`, recebeu o merge
da `main` de PR #77/#80 com o gate refeito sobre ele, e **mesclou pelo PR #81** (merge `f584432b`).
A árvore é o main tree, que não se destrói. A lane não recebe item novo sozinha: promoção é do João,
contra o `backlog.md`.

**Promoção do item 6 — 2026-08-28, `lane-a`.** Promoção explícita do João com a lane em `idle`,
contra o `backlog.md`. O item é marcado `Contexto: sim`, então a lane nasce em `context_required`: o
Context Packet vem antes do `/planejar-bloco` e é do Codex (`.agents/skills/lotus-context-packet`),
em sandbox read-only. A branch `feat/hardening-performance-e-dados` sai de `main@f584432b`, que já é
`origin/main` e traz o merge do próprio item 5. **Árvore:** main tree, pelo precedente de todo bloco
de backend. O espelho já apontava para a `lane-a` — não houve troca de foco neste commit.

**Duas lanes com estado durável fora da `main`, medido na promoção e não tocado aqui.** A `lane-b`
promoveu o item 10 (`4a33f835`, `50f3a1f3`) em `infra/producao-provisionamento-aws`, e a `lane-c`
promoveu o item 18 (`daa90d6b`, `6e86f251`) em `refactor/frontend-estilizacao-componentes`; as duas
estão em `ready_for_planning`/`planning` nas próprias árvores. Por isso o `state.md` da `main` ainda
descreve as duas em `idle`. **A invariante de dono manda: nenhum dos dois blocos foi escrito por este
commit.** Não há colisão de escopo: o item 10 é provisionamento AWS e o item 18 é frontend puro; este
bloco é backend e o único que regenera `generated.ts`.

**O Context Packet do item 6 voltou `ready` — 2026-08-28.** O Codex leu o `requisitos-negocio.md` do
Drive por ID e a task Notion 9.1.3 na base canônica. **Nenhuma fonte fixa número**: o RNF-DES-01 pede
resposta "quase instantânea" sem SLA, o RNF-DES-02 fixa só os 10 usuários simultâneos, o RNF-DES-03
pede documento acessível "imediatamente" sem prazo; a 9.1.3 tem aceite único, "Sem N+1 nas consultas
RBAC/FK principais". Nada menciona Redis nem cache — "Redis não é requisito" do backlog fica de pé. O
teto de `per_page`, eventuais guardas numéricas e o dono dos 30 dias da D-15 são decisões de
engenharia do brainstorming, não regra de negócio ausente — por isso `ready`, não `blocked`. Packet
salvo em `context-packets/2026-08-28-hardening-performance-e-dados.md`.

**Brainstorming do item 6 — 2026-08-28, spec escrita.** Cinco decisões do João, todas de
engenharia: paginam no servidor só as listas que crescem sem teto (`students`, `certificates`,
`turmas` ativo e arquivado); cenário de medição em ordem de grandeza segura (~5k alunos, ~6k
certificados); o painel de emissão ganha janela por data (12 meses) em vez de página, porque o lote
depende da turma inteira em memória; contrato próprio em `App\Shared\Pagination`, não o
`LengthAwarePaginator`; D-15 com dono único em `Shared` — são **três** trintas, não dois. O
levantamento mediu zero paginação na API e um frontend client-side por desenho, o que fez o custo da
opção escolhida subir para o kit compartilhado (`useServerTable`, modo `lazy` em
`AppDataTable`/`SearchableTableFrame`); o João manteve o bloco inteiro aqui. Spec em
`specs/2026-08-28-hardening-performance-e-dados-design.md`; o plano vem a seguir.

**A divergência entre lanes que este bloco mediu na promoção fechou pela integração serial.** O
fechamento do item 11 (`lane-b`) e o do item 8 (`lane-c`) viviam só nas branches delas, e por isso o
`state.md` da `main` descrevia a `lane-b` em `ready_for_closure` e a `lane-c` em `idle`. As duas
mesclaram (PR #77 e PR #80) e a `main` resultante entrou aqui pelo merge do fechamento deste bloco —
**nenhuma linha de lane alheia foi escrita por esta lane**: o que a `lane-b` e a `lane-c` dizem de si
veio do merge, verbatim. Não houve colisão de escopo: o item 8 é frontend puro e o item 11 não tinha
trabalho de código restante.

**O que colidiu foi a numeração de pendência, e quem renumerou foi esta lane.** As três fichas
abertas aqui nasceram `P-62`, `P-63` e `P-64`; a `main` já trazia uma `P-62` (branch protection, da
`lane-b`) e uma `P-63` (o `role="list"` do mini-reset, da `lane-c`), então elas viraram **`P-64`,
`P-65` e `P-66`** no merge. ID já publicado na `main` não se reusa — mesmo movimento que a
`P-61`→`P-63` da `lane-c` registra, e o único lugar onde os números antigos ficam de pé é o plano
arquivado, que é histórico e não se reescreve.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-29 | `frontend-estilizacao-padronizacao-de-componentes` (paga a `D-62`; abre a **P-67** e a **P-68**) | Item 18 da fila |
| 2026-08-28 | `hardening-auditoria-privacidade-e-observabilidade` | Item 5 da fila |
| 2026-08-27 | `frontend-hardening-final` (paga a **P-46**, `D-03`, `D-33`, `D-35`) | Item 8 da fila |
| 2026-08-26 | `cicd-ci-governanca-e-artefato` | Item 11 da fila |
| 2026-08-25 | `hardening-api-arquivos-e-abuso` | Item 4 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
