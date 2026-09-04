---
schema_version: 2
mode: multi-lane
focused_lane: lane-c
active_feature: null
active_work_item: frontend-arrumacao-de-testes
workflow_state: ready_for_closure
next_owner: claude
next_action: close_active_work_item
resume_state: null
active_spec: docs/superpowers/specs/2026-09-03-frontend-arrumacao-de-testes-design.md
active_plan: docs/superpowers/plans/2026-09-03-frontend-arrumacao-de-testes.md
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
    branch: refactor/backend-envelope-de-erro-e-recusa-de-dominio   # aberta de main@4a0080ce em 2026-09-02; bloco fechado em 2026-09-03, PR por abrir
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: backend-envelope-de-erro-e-recusa-de-dominio   # item 26, fechado em 2026-09-03
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
    active_work_item: frontend-arrumacao-de-testes   # item 27, promovido explicitamente pelo Joao em 2026-09-03
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: ../fix-frontend
    branch: refactor/frontend-arrumacao-de-testes   # aberta de origin/main@182be2ab em 2026-09-03; a anterior (fix/frontend-dividas-de-mecanismo, item 25) mesclou na PR #98 (24bf770c). O commit 3833810c reorganizou o backlog e abriu a ficha do 27; a promocao veio depois, no mesmo dia
    active_spec: docs/superpowers/specs/2026-09-03-frontend-arrumacao-de-testes-design.md
    active_plan: docs/superpowers/plans/2026-09-03-frontend-arrumacao-de-testes.md
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-dividas-de-mecanismo   # item 25, fechado em 2026-09-03
last_completed_work_item: backend-envelope-de-erro-e-recusa-de-dominio
state_basis_commit: 3833810c
updated_at: 2026-09-04T05:05:00-03:00
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

## Ocupação corrente — 2026-09-03

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree | `refactor/backend-envelope-de-erro-e-recusa-de-dominio` (bloco **fechado** em 2026-09-03; PR por abrir) | `idle` |
| `lane-b` | — (itens 10 e 12 **estacionados**) | — | `../lotus-infra` | `chore/prontidao-pre-nuvem` (fatia 1 mesclou no PR #86; a branch segue viva para a PR 2 do fechamento) | `idle` |
| `lane-c` | `frontend-arrumacao-de-testes` (item 27) | Frontend | `../fix-frontend` | `refactor/frontend-arrumacao-de-testes` (aberta de `origin/main@182be2ab`; a do item 25 mesclou na PR #98) | `ready_for_closure` (review feito; os 5 achados aprovados pelo João foram aplicados) |


**O item 27 assumiu a `lane-c` em 2026-09-03** — `frontend-arrumacao-de-testes`, promovido
explicitamente pelo João com a lane em `idle`, e é o **primeiro da ordem de execução** decidida em
2026-09-03. `Contexto: não` na ficha, então **nasce em `ready_for_planning`**: não há packet a gerar,
as fontes (o levantamento medido contra `main@24bf770c`, a ficha `P-58` candidata a hospedeiro e o
próprio código) vivem no repositório. O escopo é mecanismo de teste — `test.projects` separando
`node` para `tests/**` de `jsdom` para `src/**`, um `renderWithProviders` em `src/shared/testing/`
para os 33 arquivos que remontam o `QueryClient` à mão, e dois pares de arquivo sem sujeito próprio
juntados — **sem tocar em asserção de comportamento**. A branch `refactor/frontend-arrumacao-de-testes`
já existia desde `3833810c`, carregando só a reorganização do backlog; a promoção é agora.

**O brainstorming remediu a ficha e derrubou um dos quatro achados.** Três confirmaram (os 11
arquivos de `tests/` não tocam DOM; 33 sítios de `new QueryClient`; `shared/testing/` com só o
`i18n.ts`), mas o quarto — juntar dois pares de arquivo de teste "partidos por acidente de autoria"
— **não é acidente**: os dois docblocks declaram que a partição saiu da régua `max-lines` de 150, e
a **`P-68` a ratificou por decisão escrita em 2026-09-03**. Juntos dão 224 linhas cada par. O João
**recusou o achado** com veredito escrito, entre três saídas medidas. A ficha também erra em dois
números — são **760** testes nesta árvore, não 759, e sete grafias de `QueryClient`, não uma.

**O espelho do topo virou para a `lane-c` nesta árvore**, fora do main tree: é o mesmo caso da
**P-55**, e segue o precedente medido de 2026-08-26 (lane-b) e o de 2026-08-24, quando as três lanes
fizeram o mesmo. A `lane-a` e a `lane-b` estão `idle`, então o espelho não desloca bloco ativo de
ninguém.

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


## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-09-03 | `backend-envelope-de-erro-e-recusa-de-dominio` (paga a **P-71**, a **P-72** e a metade de comportamento da **P-60**; abre a **P-75** e a **P-76**; nascem `TipoDeRecusa` e `RecusaDeDominio` em `app/Shared/Exceptions/` e a rule `.claude/rules/backend-lang.md`) | Item 26 da fila |
| 2026-09-03 | `frontend-dividas-de-mecanismo` (fecha `P-68`, `P-69`, `P-70`, `P-30`, `P-42` e o débito `D-69`; abre a **P-74**) | Item 25 da fila |
| 2026-09-02 | `backend-projecao-de-arquivados` (nenhuma pendência nasce ou fecha; abre `ArchivedListing` e `RespostaDeRecurso` em `app/Shared/`) | Item 24 da fila |
| 2026-09-02 | `frontend-campo-de-formulario-liga-no-form` (o campo recebe `name` e busca valor, setter, erro e `readOnly` do form; catraca `ERRO_DE_CAMPO_A_MAO`) | **Sem ficha na fila** — o rótulo `item 24` foi tomado por engano; o 24 é o `backend-projecao-de-arquivados` |
| 2026-09-01 | `frontend-decisoes-de-ui-pendentes` (paga a **P-67** e as fichas `D-63`, `D-64`, `D-66`, `D-67`, `D-68`, `D-32`; abre a `D-69`, a `D-70` e o item 23) | Item 21 da fila |

> **Colisão de rótulo, 2026-09-02.** Os dois blocos que fecharam neste dia foram registrados como
> "item 24" em lanes diferentes. O `24` do `backlog.md` é o `backend-projecao-de-arquivados`, com
> ficha na fila desde `14b25b6c`; o `frontend-campo-de-formulario-liga-no-form` nunca teve ficha —
> nasceu do §3 do review de arquitetura de 2026-09-01 e tomou o rótulo por engano. Decisão do João
> em 2026-09-02, no fechamento da lane-a: **o 24 é o bloco de backend**, e o registro da lane-c passa
> a dizer "sem ficha na fila". Nenhum número é reusado nem renumerado.

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
