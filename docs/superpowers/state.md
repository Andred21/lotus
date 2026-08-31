---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
active_feature: null
active_work_item: prontidao-pre-nuvem
workflow_state: executing
next_owner: claude
next_action: request_code_review
resume_state: null
active_spec: docs/superpowers/specs/2026-08-29-prontidao-pre-nuvem-design.md
active_plan: docs/superpowers/plans/2026-08-29-prontidao-pre-nuvem.md
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
    branch: feat/hardening-i18n-e-erros-api   # aberta de main@37e0e2d4; fechada em 2026-08-30, sem merge
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: hardening-i18n-e-erros-api
  lane-b:
    active_feature: null
    active_work_item: prontidao-pre-nuvem
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../lotus-infra
    branch: chore/prontidao-pre-nuvem   # criada de infra/producao-provisionamento-aws@50f3a1f3 em 2026-08-29; main@37e0e2d4 mesclada para dentro (5b121aaa)
    active_spec: docs/superpowers/specs/2026-08-29-prontidao-pre-nuvem-design.md
    active_plan: docs/superpowers/plans/2026-08-29-prontidao-pre-nuvem.md
    context_packet: null   # Contexto: nao -- fontes sao o repositorio e a API do GitHub, registradas na spec §3
    blocker: null
    resume_state: null
    parked_work_items:
      - infra-producao-provisionamento-aws   # item 10, ready_for_planning em 2026-08-26; retoma apos este bloco; packet partial em context-packets/2026-08-26-infra-producao-provisionamento-aws.md
      - cicd-promocao-deploy-e-rollback      # item 12, blocked desde 2026-08-26 (nao ha host); packet em context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md
    last_completed_work_item: cicd-ci-governanca-e-artefato
  lane-c:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: fix/frontend-triagem-audits-item-18   # aberta de main@37e0e2d4; fechada em 2026-08-30, sem merge ainda
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-triagem-dos-audits-do-item-18
last_completed_work_item: frontend-estilizacao-padronizacao-de-componentes
state_basis_commit: 24e0f037
updated_at: 2026-08-29T16:10:00-03:00
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
| `lane-a` | — | — | main tree | `feat/hardening-i18n-e-erros-api` (item 7 fechado em 2026-08-30, rebaseada sobre `main@afe273cf`; **sem merge**) | `idle` |
| `lane-b` | `prontidao-pre-nuvem` (item 20) | CI/GitHub/Infra | `../lotus-infra` | `chore/prontidao-pre-nuvem` | `ready_for_execution` |
| `lane-c` | — | — | `../fix-frontend` | `fix/frontend-triagem-audits-item-18` (item 19 fechado em 2026-08-30; **sem merge**) | `idle` |


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

**O item 20 assumiu a `lane-b` em 2026-08-29** — `prontidao-pre-nuvem`, criado no `backlog.md` e
promovido explicitamente pelo João nesta sessão, **antes** de planejar o item 10. O pedido dele foi
literal: entender o CI, arrumar o que aparece vermelho a cada integração, entender o espelho
`Andred21 → Gatika-CL` e **comprovar que o código de lá funciona** — e só então mexer em nuvem. A
leitura mediu que o CI não falha (o `audit-dev` pinta vermelho por sete advisories transitivas de
devDeps, sob `continue-on-error`), que o corporativo está onze PRs atrás e que **ninguém nunca puxou
o par corporativo do GHCR**; o João decidiu que `audit-dev` passa a reprovar e a segurar a imagem,
que o par será puxado e executado aqui por script versionado, e **adiou** a decisão sobre o
repositório pessoal estar público (divergência com a `P-62`, registrada na spec §3.5). O item 10
fica **estacionado** ao lado do 12 (`parked_work_items`), com o packet `partial` guardado; retoma
sobre `main` já com o par provado. A branch `chore/prontidao-pre-nuvem` nasce de
`infra/producao-provisionamento-aws@50f3a1f3` e **mescla `main@37e0e2d4` para dentro** (`5b121aaa`)
antes do primeiro artefato — 103 commits, único conflito em `state.md`. Acrescentar o item 20 fora
do main tree segue a **P-55**. Spec aprovada por seções no brainstorming:
`specs/2026-08-29-prontidao-pre-nuvem-design.md`. **Plano escrito e a lane em `ready_for_execution`
em 2026-08-29** (`plans/2026-08-29-prontidao-pre-nuvem.md`): oito tasks em duas fatias — a PR 1
(workflow, lockfile, `scripts/provar-release.sh` com catraca, docs) **mescla no meio do plano**,
porque o espelho publica a árvore desse merge e a prova do par corporativo só existe depois dele;
a fatia 2 é ação externa (merge, PAT do João, espelho de onze PRs, CI corporativo, três execuções
do script) e evidência em `audits/`. A sonda do DoD 1 é a ordem das tasks (workflow antes do bump),
não um commit de lockfile rebaixado; o script inclui `migrate --force` entre `pull` e `up`, que é o
fluxo de deploy que o item 10 fixou (D7).

**A `lane-a` fechou o item 7 em 2026-08-30** — `hardening-i18n-e-erros-api`, narrativa integral em
`historico/state-archive.md` e entrega em `historico/progress.md`. A branch
`feat/hardening-i18n-e-erros-api` nasceu de `main@37e0e2d4`, foi **rebaseada sobre `main@afe273cf`**
(que traz o item 19 da `lane-c`, PR #87, e o item 20 da `lane-b`, PR #86) no fechamento, e **ainda
não mesclou** — o gate de fechamento não integra. Zero colisão de código: os oito conflitos do
rebase foram todos em `docs/superpowers/`, resolvidos pela invariante de dono — **o espelho do topo
não foi tocado**, porque a `focused_lane` passou a ser a `lane-b`, que está em `executing` com o
item 20. O
fechamento pagou o item 0 **remedindo o DoD contra a API real depois do review**, porque os quatro
achados mudaram o envelope: recusa de domínio, 403 de redator, 404 de model binding **e** de rota
inexistente, 422, 429, conta desativada no meio da sessão e as descrições do Dashboard, todos nos
três locales, mais as três bordas de fallback (sem header, `es`, `fr-FR`) caindo em es-CL. Gate:
suíte **1149 passed / 5 skipped**, `generated.ts` sem diff contra a `main` nem na árvore,
`pnpm lint`/`build` verdes, pint `passed` nos 92 arquivos PHP do bloco. A **P-61** fechou por
mecanismo e foi para `encerradas.md`; a **P-66** saiu do rastro, que é o primeiro fechamento
posterior ao dela. **Nasceu uma pendência no próprio gate:** o 419 devolve `detail` literal em
inglês nos três locales (`CSRF token mismatch.`) porque o `TokenMismatchException` traz `getMessage()`
não vazio e vence o fallback do `detailFor()` — o `title` já sai localizado. É a **P-72**: o 419 não
está entre os sete braços que a **D5** enumera, e o remédio é decisão de desenho do envelope
(lei §5.4), não conserto de fechamento. A pendência que a execução deixou em aberto sem ficha — as
recusas de role de sistema em português — **foi paga pelo review (Q-2)** e não virou ficha nenhuma.
A lane volta a `idle` e não recebe item novo sozinha: promoção é do João, contra o `backlog.md`.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-30 | `hardening-i18n-e-erros-api` (paga a **P-61**, `D-07`, `D-18`, `D-36`, `D-38`, `D-58`; abre a **P-70**, a **P-71** e a **P-72**) | Item 7 da fila |
| 2026-08-30 | `frontend-triagem-dos-audits-do-item-18` (paga a **P-63**; abre a `D-63`..`D-68` e rehospeda a **P-67** na `D-66`) | Item 19 da fila |
| 2026-08-29 | `frontend-estilizacao-padronizacao-de-componentes` (paga a `D-62`; abre a **P-67** e a **P-68**) | Item 18 da fila |
| 2026-08-29 | `hardening-performance-e-dados` (paga a **P-66** e o `D-15`; abre a **P-69**) | Item 6 da fila |
| 2026-08-28 | `hardening-auditoria-privacidade-e-observabilidade` | Item 5 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
