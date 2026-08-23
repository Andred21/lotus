---
schema_version: 2
mode: multi-lane
focused_lane: lane-a
active_feature: identity
active_work_item: hardening-acesso-ownership-e-integridade
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-08-22-hardening-acesso-ownership-e-integridade-design.md
active_plan: docs/superpowers/plans/2026-08-22-hardening-acesso-ownership-e-integridade.md
context_packet: docs/superpowers/context-packets/2026-08-22-hardening-acesso-ownership-e-integridade.md
blocker: null

lanes:
  lane-a:
    active_work_item: hardening-acesso-ownership-e-integridade
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: main-tree
    branch: feat/hardening-acesso-ownership-e-integridade
    active_spec: docs/superpowers/specs/2026-08-22-hardening-acesso-ownership-e-integridade-design.md
    active_plan: docs/superpowers/plans/2026-08-22-hardening-acesso-ownership-e-integridade.md
    context_packet: docs/superpowers/context-packets/2026-08-22-hardening-acesso-ownership-e-integridade.md
    blocker: null
    resume_state: null
    last_completed_work_item: feedbacks-resolver-escopo
  lane-b:
    active_work_item: infra-producao-runtime-e-aws
    workflow_state: ready_for_review
    next_owner: claude
    next_action: request_code_review
    tree: ../lotus-infra
    branch: infra/producao-runtime-e-aws
    active_spec: docs/superpowers/specs/2026-08-22-infra-producao-runtime-e-aws-design.md
    active_plan: docs/superpowers/plans/2026-08-22-infra-producao-runtime-e-aws.md
    context_packet: docs/superpowers/context-packets/2026-08-22-infra-producao-runtime-e-aws.md
    blocker: null
    resume_state: null
  lane-c:
    active_feature: frontend
    active_work_item: frontend-revisao-ui-por-modulo
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_execution
    tree: ../fix-frontend
    branch: refactor/frontend-revisao-ui
    active_spec: null
    active_plan: null   # exceção declarada — ver "Lane-c" abaixo
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: BD-15-docs-guardrails-e-sincronizacao
last_completed_work_item: feedbacks-resolver-escopo
state_basis_commit: 0b9ffecd
updated_at: 2026-08-23T17:31:56-03:00
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

> A tabela acima é **registro da seleção de 2026-08-22**, não a lista do que está ativo. Os itens 1
> e 14 fecharam e mesclaram no mesmo dia (PR #65 e PR #66, merge `61acc0c3`), e as duas lanes foram
> reatribuídas. O que está vivo agora está na seção abaixo.

## Ocupação corrente — 2026-08-22

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | `hardening-acesso-ownership-e-integridade` (item 3) | Backend | main tree (gate P-03) | `feat/hardening-acesso-ownership-e-integridade` | `ready_for_closure` |
| `lane-b` | `infra-producao-runtime-e-aws` (item 10) | Infra | `../lotus-infra` | `infra/producao-runtime-e-aws` | `ready_for_review` |
| `lane-c` | `frontend-revisao-ui-por-modulo` (item 16) | Frontend | `../fix-frontend` | `refactor/frontend-revisao-ui` | `executing` |

**A `lane-a` recebeu o item 3 em 2026-08-22, por promoção explícita do João.** É backend, então roda
no main tree e satisfaz o gate sem reabrir a P-03: a `lane-b` é infra e a `lane-c` é frontend — não
há backend ∥ backend. O bloco é `Contexto: sim`, logo nasceu em `context_required`; o packet
`2026-08-22-hardening-acesso-ownership-e-integridade.md` veio do Codex em 2026-08-22 com
`status: ready` e cinco fontes recuperadas — Drive e Notion inclusive, endereçados por ID. A **D-34** do escopo é condicional: só entra se o contrato for tocado,
e aí regenera `generated.ts` (lei §5.3) — a spec a declarou **fora**, e o `generated.ts` muda neste
bloco por outro motivo (o `is_active` da P-51).

**Planejamento fechado em 2026-08-22T17:31.** Spec e plano escritos, e o plano corrige **três**
medições que a spec e as fichas traziam erradas: o lock dos escritores de filho é `lockForWrite()` e
não `lockRow()` cru (a diferença é a recusa, que é a P-49 inteira); `ImportStudentsAction` sai da
lista dos seis porque não abre transação (a cobertura vem da linha, no `EnrollStudentAction`); e a
P-47 não se conserta no seeder — ele já atribui a role desde `e3490d84` —, mas por migration de
backfill sobre o dado velho. Handoff declara `executor: claude`.

**A `lane-b` está em `ready_for_review`, não em `context_required`.** O estado da main dizia o
segundo e o `state.md` da própria `../lotus-infra` dizia o primeiro — divergência corrigida em
2026-08-22 a favor da árvore da lane, que é quem tem o trabalho. A árvore dela ainda carrega
`schema_version: 1` (nasceu antes do modo multi-lane); ela converge no fechamento, não antes.

**A `lane-c` é a worktree `../fix-frontend`, e o registro dela nasceu atrasado.** A lane executava o
item 16 desde 2026-08-22 sem existir em `lanes:` — corrigido aqui. Duas irregularidades ficam
**declaradas, não descobertas depois**:

- **`active_plan` é `null` com a lane em `executing`**, contra a invariante que o exige a partir de
  `ready_for_execution`. Exceção decidida pelo João em 2026-08-22: o item 16 é revisão iterativa
  dirigida pelas runs de `/lotus-ui-review`, uma superfície por vez, e o artefato durável de cada
  passada é o relatório datado em `audits/` — não um plano escrito na frente. `ac4eef8a` já entregou
  os 6 wrappers de `shared/ui` da primeira passada.
- **O item 16 foi acrescentado ao `backlog.md` pela worktree** (`eaa9e15c`), contra a invariante que
  reserva ao main tree acrescentar item à fila. O texto **não foi duplicado aqui** por decisão do
  João: duplicá-lo garantiria conflito no merge sem ganho. Ele entra na main pelo merge da lane e
  sai no `/fechar-sprint` dela. Até lá, **a fila canônica do item 16 mora na branch**, não neste
  tree.

Interseção a vigiar entre as lanes vivas: a `lane-c` mexe em `shared/ui` e nos mocks de
`react-i18next`; a `lane-a` é backend e só toca frontend se a D-34 abrir o contrato. Integração
segue serial — a `lane-b` mescla primeiro, e as outras rebasam.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-22 | `BD-15-docs-guardrails-e-sincronizacao` | Item 14 da fila |
| 2026-08-22 | `feedbacks-resolver-escopo` | Item 1 da fila consolidada |
| 2026-08-22 | `bd12-load-state-e-listas` | BD-12 dos blocos de dívida |
| 2026-08-20 | `bd18-useloadstate-promise-e-forma` | BD-18 dos blocos de dívida |
| 2026-08-20 | `bd14-contrato-de-entrada` | BD-14 do backlog |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
