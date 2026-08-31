---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
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
    branch: —   # feat/hardening-performance-e-dados mesclou (PR #83) e foi apagada em 2026-08-29
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-performance-e-dados
  lane-b:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../lotus-infra
    branch: chore/prontidao-pre-nuvem   # criada de infra/producao-provisionamento-aws@50f3a1f3 em 2026-08-29; main@37e0e2d4 mesclada para dentro (5b121aaa); fatia 1 mesclou no PR #86 (308edc50) e a branch segue viva para a PR 2 do fechamento
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    parked_work_items:
      - infra-producao-provisionamento-aws   # item 10, ready_for_planning em 2026-08-26; retoma apos este bloco; packet partial em context-packets/2026-08-26-infra-producao-provisionamento-aws.md
      - cicd-promocao-deploy-e-rollback      # item 12, blocked desde 2026-08-26 (nao ha host); packet em context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md
    last_completed_work_item: prontidao-pre-nuvem
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
last_completed_work_item: prontidao-pre-nuvem
state_basis_commit: a8c55efd
updated_at: 2026-08-31T23:55:00-03:00
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

## Ocupação corrente — 2026-08-31

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree (em `main`) | — (`feat/hardening-performance-e-dados` mesclou, PR #83, e foi apagada) | `idle` |
| `lane-b` | — (itens 10 e 12 **estacionados**) | — | `../lotus-infra` | `chore/prontidao-pre-nuvem` (fatia 1 mesclou no PR #86; a branch segue viva para a PR 2 do fechamento) | `idle` |
| `lane-c` | — | — | `../fix-frontend` | `refactor/frontend-estilizacao-componentes` (fechada em 2026-08-29, **sem merge**) | `idle` |


> **Esta tabela é estado corrente, e por isso acompanha o frontmatter.** A linha da `lane-c` ficou
> em `ready_for_execution` enquanto o frontmatter andava até `ready_for_review` — as outras duas
> linhas batiam, então quem lesse a tabela concluiria que a lane ainda tinha bloco por executar, e a
> invariante manda PARAR diante de divergência de fase, não escolher fonte (Q-4 do review de
> 2026-08-27). Lane que muda `workflow_state` muda a própria linha aqui no mesmo commit.

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

**A `lane-a` fechou o item 6 em 2026-08-29** — `hardening-performance-e-dados`, narrativa integral
em `historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-performance-e-dados` nasceu de `main@f584432b`, foi **rebaseada sobre
`main@b4101da9`** (que traz o item 18 da `lane-c`, PR #82) no fechamento, e **mesclou pelo PR #83**
(merge `2ae48f31`). A colisão conhecida em `HistorialTable.tsx` foi resolvida nesse rebase, e cobrou uma extração: as
linhas das duas lanes somadas passaram da régua de 150, então o filtro de estado saiu para
`HistorialStatusFilter.tsx` — movimento literal, no molde que o `TurmaStatusFilter` registra desde
2026-08-24. **E cobrou uma correção que não é do rebase, e sim deste bloco:** a reprovação
intermitente do `pnpm test` que o gate anterior registrou como flake é um `setTimeout` do
`useServerTable` disparando depois do teardown do jsdom (`window is not defined`), porque o vitest
não tem `setupFiles` e nada desmonta o que o teste monta — os dois arquivos que vazavam ganharam
`afterEach(cleanup)` e a suíte foi de 1 reprovação em 4 voltas para 6 verdes de 6; o mecanismo
global virou a **P-69**. Essa correção **não entrou no PR #83** — ele mesclou em `2c66fbbe`, antes de
ela existir, e a `main` passou algumas horas reproduzindo a reprovação; ela entrou pelo **PR #84**
(merge `0a65d1e2`), de branch própria tirada da `main` já mesclada. As duas branches foram apagadas
local e remotamente em 2026-08-29, com `git diff` vazio contra a `main` nas duas. A árvore é o main
tree, que não se destrói, e voltou para `main`. A lane não recebe item novo sozinha: promoção é do
João, contra o `backlog.md`.


> **A linha da `lane-c` acima está divergente, e não é esta lane que a corrige.** Ela diz
> `refactor/frontend-estilizacao-componentes` "fechada em 2026-08-29, **sem merge**"; a branch
> mesclou (PR #82) e **já não existe** no repositório — o `git checkout` dela falha com
> `did not match any file(s) known to git`. A `lane-c` também estava com a `main` em checkout na
> worktree `../fix-frontend`, o que impedia o main tree de voltar para `main`; no fechamento do item
> 6 essa worktree foi posta em **detached** no mesmo commit (`0a65d1e2`, árvore limpa, conteúdo
> idêntico), sem tocar em arquivo nenhum dela. Registro aqui em vez de reescrever a linha porque a
> invariante de dono manda que cada lane escreva só o que é dela, e a de divergência manda PARAR e
> mostrar em vez de escolher fonte. A `lane-c` (ou o João) fecha isso quando retomar a árvore.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-31 | `prontidao-pre-nuvem` (emenda a **P-62**: o pessoal está público e a decisão de visibilidade ficou com o João) | Item 20 da fila |
| 2026-08-29 | `frontend-estilizacao-padronizacao-de-componentes` (paga a `D-62`; abre a **P-67** e a **P-68**) | Item 18 da fila |
| 2026-08-29 | `hardening-performance-e-dados` (paga a **P-66** e o `D-15`; abre a **P-69**) | Item 6 da fila |
| 2026-08-28 | `hardening-auditoria-privacidade-e-observabilidade` | Item 5 da fila |
| 2026-08-27 | `frontend-hardening-final` (paga a **P-46**, `D-03`, `D-33`, `D-35`) | Item 8 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
