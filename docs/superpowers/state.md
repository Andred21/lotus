---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
active_feature: cicd-host-alinhado-ao-sha
active_work_item: cicd-host-alinhado-ao-sha
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md
active_plan: docs/superpowers/plans/2026-09-26-cicd-host-alinhado-ao-sha.md
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
    branch: fix/backend-config-e-conteudo-de-documento   # aberta de main@5be61b63 em 2026-09-24; o item 29 fechou nela em 2026-09-25 e ela NAO foi mesclada — integracao e passo proprio, com o Joao. A anterior (chore/harness-hooks-de-guarda, item 28) mesclou na PR #106 (38e08a08)
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: backend-config-e-conteudo-de-documento   # item 29, fechado em 2026-09-25; branch ainda nao mesclada
  lane-b:
    active_feature: cicd-host-alinhado-ao-sha
    active_work_item: cicd-host-alinhado-ao-sha   # item 31, promovido pelo Joao em 2026-09-26 (P-88 + P-87, P-86 condicional); Contexto: nao
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../lotus-infra
    branch: cicd/host-alinhado-ao-sha   # aberta de origin/main@e5ac01a9 em 2026-09-26. A anterior (cicd/promocao-deploy-e-rollback, item 12) mesclou inteira pelas PRs #108 a #111 (e5ac01a9)
    active_spec: docs/superpowers/specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md
    active_plan: docs/superpowers/plans/2026-09-26-cicd-host-alinhado-ao-sha.md
    context_packet: null
    blocker: null
    resume_state: null
    arquivos_do_descarte:
      - archive/infra-producao-provisionamento-aws-v1   # 305b6ca4 — spec, plano, gates, R1-R4 e toda a medicao
      - archive/site-contact-form-v1                    # 6b643710 — a R5 (POST /api/public/contact), provada e descartada junto
    last_completed_work_item: cicd-promocao-deploy-e-rollback   # item 12, fechado em 2026-09-26; mesclado ate a PR #111 (e5ac01a9)
  lane-c:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: refactor/frontend-arrumacao-de-testes   # aberta de origin/main@182be2ab em 2026-09-03; a anterior (fix/frontend-dividas-de-mecanismo, item 25) mesclou na PR #98 (24bf770c). O commit 3833810c reorganizou o backlog e abriu a ficha do 27; a promocao veio depois, no mesmo dia
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-arrumacao-de-testes   # item 27, fechado em 2026-09-04
last_completed_work_item: cicd-promocao-deploy-e-rollback
state_basis_commit: 35784d9f
updated_at: 2026-09-26T20:00:00-03:00
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

## Ocupação corrente — 2026-09-26

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — (item 29 `backend-config-e-conteudo-de-documento` **fechado em 2026-09-25**) | — | main tree (gate P-03) | `fix/backend-config-e-conteudo-de-documento` (de `main@5be61b63`, **não mesclada** — integração é passo próprio, com o João) | `idle` |
| `lane-b` | **31** `cicd-host-alinhado-ao-sha` (promovido em 2026-09-26; o item 12 anterior mesclou até a PR #111, `e5ac01a9`) | Infra/CI-CD | `../lotus-infra` | `cicd/host-alinhado-ao-sha` (de `origin/main@e5ac01a9`) | `executing` (execução iniciada em 2026-09-26, Task 1) |
| `lane-c` | — (item 27 **fechado em 2026-09-04**) | — | `../fix-frontend` | `refactor/frontend-arrumacao-de-testes` (mesclada na `main` em `9c038cca`) | `idle` |


> **Esta tabela é estado corrente, e por isso acompanha o frontmatter.** A linha da `lane-c` ficou
> em `ready_for_execution` enquanto o frontmatter andava até `ready_for_review` — as outras duas
> linhas batiam, então quem lesse a tabela concluiria que a lane ainda tinha bloco por executar, e a
> invariante manda PARAR diante de divergência de fase, não escolher fonte (Q-4 do review de
> 2026-08-27). Lane que muda `workflow_state` muda a própria linha aqui no mesmo commit.


## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-09-26 | `cicd-promocao-deploy-e-rollback` (abre a **P-86** e a **P-87**, esta com o gatilho disparado pelo próprio review e não pago; emenda a **P-62** com o botão sem Environment; nascem `.github/workflows/deploy.yml`, `deploy/aws/criar-oidc-e-role.sh`, o ledger `releases.jsonl`, o gate de schema e o cadeado do `deploy.sh`, e as catracas `workflow-deploy`, `deploy-sh`, `backup-db` e `criar-oidc-role`; ADR-14 ganha emenda datada e a lição 19 a regra da sonda que apaga o exit) | Item 12 da fila |
| 2026-09-25 | `backend-config-e-conteudo-de-documento` (fecha a **P-59** e a **P-79** por mecanismo e a **P-75** por veredito escrito; abre a **P-85**; dispara sem pagar, pela segunda vez, a **P-53**; nascem `App\Shared\Support\FusoDoNegocio`, `Certification\Services\CertificateValidationUrl` e `ValidacaoDeCertificadoNaoConfigurada`, e as catracas `DataDeCalendarioTest` e `FusoDeArmazenamentoTest`; `config/app.php` fica em `UTC` literal por decisão escrita) | Item 29 da fila |
| 2026-09-20 | `harness-hooks-de-guarda` (fecha a **P-82**; abre a **P-83** — sete decisões de política dos guardas que só existiam no ledger gitignorado — e a **P-84** — o harness não existe em doc versionado; nascem `.claude/settings.json`, `.claude/hooks/` com os cinco guardas e `.claude/tests/` com sete arquivos) | Item 28 da fila |
| 2026-09-20 | `infra-producao-provisionamento-aws` (item 10, **v2** — replanejado do zero; a v1 e a R5 foram descartadas para `archive/`). Os sete DoD fecharam, o sétimo pelo **ramo ficha** que a Task 19 prevê. Fecha a **P-58**; abre a **P-77**, a **P-78**, a **P-79** e — no próprio gate de fechamento, por decisão do João de adiar — a **P-80** (custo) e a **P-81** (access key); **dispara a `P-05` sem pagar** (a produção subiu com as 30 migrations não consolidadas). Nascem `deploy/bin/verificar-backup.sh`, `deploy/nginx/tls.conf`, `docker-compose.prod-tls.yml`, `deploy/aws/user-data.sh` e o runbook `deploy/aws/README.md`; o ADR-09 ganha a revisão 2026-09 e a lição 19 é emendada pela terceira ocorrência | Item 10 da fila |
| 2026-09-04 | `dominio-decisoes-de-rbac-e-semantica` (fecha as quatro fichas de decisão `D-09`, `D-10`, `D-11` e `D-16`; nenhuma pendência nasce ou fecha, mas **dispara sem pagar** os gatilhos da `P-51` e da `P-53`; nascem `RoleOptionData`, `StudentClientOptionData`, `UmContatoPrincipal` e `DeleteClientAddressAction`) | Item 22 da fila |

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
