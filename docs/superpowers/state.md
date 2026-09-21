---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
active_feature: null
active_work_item: cicd-promocao-deploy-e-rollback
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-09-21-cicd-promocao-deploy-e-rollback-design.md
active_plan: docs/superpowers/plans/2026-09-21-cicd-promocao-deploy-e-rollback.md
context_packet: docs/superpowers/context-packets/2026-09-20-cicd-promocao-deploy-e-rollback.md
blocker: null
lanes:
  lane-a:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: main-tree
    branch: refactor/backend-decisoes-de-rbac-e-semantica   # aberta de main@182be2ab em 2026-09-03; item 22 fechado em 2026-09-04 e a branch REBASADA sobre origin/main@9bdaac90 em 2026-09-09, com o item 27 e a infra ja dentro; segue viva na PR #104, aguardando merge
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: dominio-decisoes-de-rbac-e-semantica   # item 22, fechado em 2026-09-04
  lane-b:
    active_feature: null
    active_work_item: cicd-promocao-deploy-e-rollback
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../lotus-infra
    branch: cicd/promocao-deploy-e-rollback   # recriada de origin/main@cff022d4 em 2026-09-20; a homonima de 2026-08-26 estava inteira dentro da main (PR #105 mesclou o item 10 v2)
    active_spec: docs/superpowers/specs/2026-09-21-cicd-promocao-deploy-e-rollback-design.md
    active_plan: docs/superpowers/plans/2026-09-21-cicd-promocao-deploy-e-rollback.md
    context_packet: docs/superpowers/context-packets/2026-09-20-cicd-promocao-deploy-e-rollback.md
    blocker: null
    resume_state: null
    arquivos_do_descarte:
      - archive/infra-producao-provisionamento-aws-v1   # 305b6ca4 — spec, plano, gates, R1-R4 e toda a medicao
      - archive/site-contact-form-v1                    # 6b643710 — a R5 (POST /api/public/contact), provada e descartada junto
    last_completed_work_item: infra-producao-provisionamento-aws   # item 10 v2, fechado em 2026-09-20
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
last_completed_work_item: infra-producao-provisionamento-aws
state_basis_commit: cff022d4
updated_at: 2026-09-21T22:10:00-03:00
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

## Ocupação corrente — 2026-09-20

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — (item 22 **fechado em 2026-09-04**; a branch foi **rebasada sobre `origin/main@9bdaac90`** em 2026-09-09 e a **PR #104** está aberta) | — | main tree | `refactor/backend-decisoes-de-rbac-e-semantica` | `idle` |
| `lane-b` | `cicd-promocao-deploy-e-rollback` (item 12) | CI/CD | `../lotus-infra` | `cicd/promocao-deploy-e-rollback` (de `origin/main@cff022d4`) | `executing` |
| `lane-c` | — (item 27 **fechado em 2026-09-04**) | — | `../fix-frontend` | `refactor/frontend-arrumacao-de-testes` (mesclada na `main` em `9c038cca`) | `idle` |


> **Esta tabela é estado corrente, e por isso acompanha o frontmatter.** A linha da `lane-c` ficou
> em `ready_for_execution` enquanto o frontmatter andava até `ready_for_review` — as outras duas
> linhas batiam, então quem lesse a tabela concluiria que a lane ainda tinha bloco por executar, e a
> invariante manda PARAR diante de divergência de fase, não escolher fonte (Q-4 do review de
> 2026-08-27). Lane que muda `workflow_state` muda a própria linha aqui no mesmo commit.


**A `lane-b` recebeu o item 12 em 2026-09-20** — `cicd-promocao-deploy-e-rollback`, promovido
explicitamente pelo João com a lane em `idle`, na mesma sessão em que o item 10 v2 fechou e mesclou.
É a continuação direta do 11 e do 20: o 11 constrói o artefato imutável por SHA, o 20 provou que o
par do GHCR puxa e executa, o 10 provisionou o host — e o 12 promove esse artefato para a produção
que agora existe, com aprovação, health e rollback. Nasce em **`context_required`** (`Contexto: sim`
na fila).

**O packet de 2026-08-26 não servia, e por isso a lane passou por `context_required` antes de
planejar.** `context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md` estava em
`status: blocked`, e o gatilho de staleness que ele próprio declara (*"um alvo AWS real ser
provisionado"*) **venceu em 2026-09-04**: o motivo do bloqueio era não haver destino de deploy, e o
item 10 criou o destino. `status: blocked` nunca autoriza prosseguir (§6 do `/planejar-bloco`).

**O packet novo é `context-packets/2026-09-20-cicd-promocao-deploy-e-rollback.md`**, gerado pelo
Codex sob a skill `lotus-context-packet` em `base_commit ba22ddce`, `status: partial`,
`RECOMMENDED_TRANSITION: ready_for_planning`. Validado pelo caller: markers exatos, frontmatter
completo, 7 key facts (teto 8), 659 palavras de corpo (teto 1.200), as quatro fontes `unavailable`
com evidência registrada. Ele **desfaz a premissa central da ficha de 2026-08-26**: o release
deixou de ser o par `app`+`web` e passou a ser o **trio** `lotus-app`, `lotus-web` e
`lotus-clamav` sob o mesmo SHA corporativo, e o `deploy/bin/deploy.sh` já cobre
`pull → migrate → up → health → digests → CURRENT_SHA`. O que falta ao 12 é a **promoção remota
governada** e o **rollback auditável** — hoje só existe `CURRENT_SHA`, sem registro do anterior.

**Duas fontes externas ficaram fora, e as duas estão declaradas como limitação do brainstorming.**
O `GITHUB-CORP` (`Gatika-CL/lotus`) devolveu **404 medido nesta rodada**, não copiado do packet
velho — Environment, secrets e branch protection do corporativo seguem ilegíveis pelo conector, e o
planejamento tem de prever *readback* em vez de presumir proteção. Os **três documentos do Drive**
(`10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`,
`1L8vq7Pp1xFBSvzyISg5sw6SVVihzSR5l`) falharam com `user cancelled MCP tool call` nas sete
chamadas: o conector do Drive exige consentimento interativo que a invocação headless do Codex não
tem. **É limitação do arranjo, não da fonte** — Notion e GitHub responderam na mesma sessão —, e o
Drive é planejamento canônico (`CLAUDE.md` §3). A lacuna se fecha no brainstorming, com a consulta
feita pelo lado que tem o conector interativo; o packet, que é o que precede Drive/Notion/Figma, já
existe.

**As duas lacunas do packet fecharam no brainstorming, e nenhuma virou suposição.** Os três
documentos do Drive foram lidos pelo conector desta sessão: o `decisao-stack.md` canônico ainda
manda *"deploy reproduzível: script (git pull → rebuild → restart). Manual via SSH no início;
GitHub Actions quando incomodar. NÃO montar pipeline completo no dia 1. `[FASE 2]`"* — texto
**vencido**, e o ADR-14 ganha emenda datada dentro do bloco, sem que o original se apague. O
`GITHUB-CORP` fechou por medição direta: `Gatika-CL/lotus` é **privado em organização free** e
`Andred21/lotus` é **público**; **nenhum dos dois tem Environment configurado**, e plano free em
repositório privado não oferece Environment, protection rule nem environment secret — a mesma raiz
da **P-62**. É esse fato que decide onde mora o botão de promoção.

**O brainstorming travou quatro decisões e a spec está escrita.** Transporte por **SSM Session
Manager com OIDC** — a Actions assume role federada e chama `ssm send-command`, sem inbound novo no
SG e sem chave estática. Botão no **corporativo, sem Environment**, compensado por acesso de escrita,
input de confirmação, `concurrency` de grupo único sem cancelamento e log com ator e SHA — menos que
um Environment, e registrado como tal, extensão da **P-62**. Rollback com **dump pré-deploy mais
delta de migrations num ledger `releases.jsonl` append-only**, e **recusa** do `deploy.sh` quando o
banco está à frente da imagem alvo, apontando a chave exata do dump. Lado AWS como **script
versionado e idempotente com readback**, que o João roda e a sessão confere — não console, não IaC.

**Achado de lição 19 que o bloco tem de pagar:** `deploy/bin/deploy.sh` e
`.github/workflows/ci.yml` **não têm catraca nenhuma hoje**, embora a lição 19 já liste
`deploy/bin/*.sh` entre os pares guardados. Glob na lição não é asserção no arquivo, e o bloco
entrega os dois testes junto com o que mexe neles.

**O plano está escrito e a lane vai a `ready_for_execution`.**
`plans/2026-09-21-cicd-promocao-deploy-e-rollback.md`, **doze tasks**, `executor: claude`. As tasks
1 a 4 crescem o `deploy/bin/deploy.sh` em quatro camadas, nessa ordem (cadeado e `CURRENT_SHA`
atômico, gate de schema, chave do dump no `backup-db.sh`, dump e ledger); a 5 e a 6 escrevem o
workflow e o script de IAM; a 7 é doc. **As tasks 8, 9, 10 e 12 têm execução do João** — escrita na
conta AWS e no host de produção não passa pela sessão, que lê a saída, confere contra o esperado e
escreve a evidência em `audits/2026-09-21-cicd-promocao-deploy-e-rollback.md`.

**A task 11 mescla na `main` e espelha ANTES das provas do botão, e isso é imposição de
plataforma, não preferência:** `workflow_dispatch` só existe quando o arquivo está na branch
default, e a única via até `Gatika-CL/lotus` é o `scripts/espelhar-corporativo.sh`. Por isso todas as
provas que dão para fazer por SSH — ledger, cadeado, dump, rollback limpo e rollback recusado —
ficam nas tasks 9 e 10, antes da integração. Há precedente na mesma lane: o item 20 também mesclou
e espelhou no meio do bloco.

**A branch e o espelho.** `cicd/promocao-deploy-e-rollback` foi **recriada** de
`origin/main@cff022d4` — o tip que já traz o item 10 v2 mesclado (PR #105). A homônima de 2026-08-26
apontava para `10030c65` e estava **inteira dentro da `main`**, então mover o rótulo não descartou
commit nenhum. O espelho do topo já apontava para `lane-b` e foi escrito **nesta árvore**, fora do
main tree: é a **P-55**, pelo mesmo precedente de 2026-08-24 e de 2026-08-26 (`655b9796`), e a ficha
segue aberta aguardando decisão do João.

**Divergências de Git observadas na promoção, nenhuma da `lane-b` e nenhuma tratada aqui:** o `main`
local (`../lotus`) está 4 commits à frente e 21 atrás de `origin/main`, e o worktree `../fix-frontend`
está em `refactor/frontend-revisao-ui-f3` enquanto a `lane-c` registra
`refactor/frontend-arrumacao-de-testes` com o item 27 fechado. As duas ficam registradas para quem
for mexer nessas lanes.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-09-20 | `infra-producao-provisionamento-aws` (item 10, **v2** — replanejado do zero; a v1 e a R5 foram descartadas para `archive/`). Os sete DoD fecharam, o sétimo pelo **ramo ficha** que a Task 19 prevê. Fecha a **P-58**; abre a **P-77**, a **P-78**, a **P-79** e — no próprio gate de fechamento, por decisão do João de adiar — a **P-80** (custo) e a **P-81** (access key); **dispara a `P-05` sem pagar** (a produção subiu com as 30 migrations não consolidadas). Nascem `deploy/bin/verificar-backup.sh`, `deploy/nginx/tls.conf`, `docker-compose.prod-tls.yml`, `deploy/aws/user-data.sh` e o runbook `deploy/aws/README.md`; o ADR-09 ganha a revisão 2026-09 e a lição 19 é emendada pela terceira ocorrência | Item 10 da fila |
| 2026-09-04 | `dominio-decisoes-de-rbac-e-semantica` (fecha as quatro fichas de decisão `D-09`, `D-10`, `D-11` e `D-16`; nenhuma pendência nasce ou fecha, mas **dispara sem pagar** os gatilhos da `P-51` e da `P-53`; nascem `RoleOptionData`, `StudentClientOptionData`, `UmContatoPrincipal` e `DeleteClientAddressAction`) | Item 22 da fila |
| 2026-09-04 | `frontend-arrumacao-de-testes` (fecha a **P-58**; nenhuma pendência nasce; nascem `test.projects` no `vite.config.ts`, `src/shared/testing/providers.tsx` e a catraca `QUERY_CLIENT_A_MAO`) | Item 27 da fila |
| 2026-09-03 | `backend-envelope-de-erro-e-recusa-de-dominio` (paga a **P-71**, a **P-72** e a metade de comportamento da **P-60**; abre a **P-75** e a **P-76**; nascem `TipoDeRecusa` e `RecusaDeDominio` em `app/Shared/Exceptions/` e a rule `.claude/rules/backend-lang.md`) | Item 26 da fila |
| 2026-09-03 | `frontend-dividas-de-mecanismo` (fecha `P-68`, `P-69`, `P-70`, `P-30`, `P-42` e o débito `D-69`; abre a **P-74**) | Item 25 da fila |

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
