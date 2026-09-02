---
schema_version: 2
mode: multi-lane
focused_lane: lane-b
active_feature: null
active_work_item: infra-producao-provisionamento-aws
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-09-02-infra-producao-provisionamento-aws-design.md
active_plan: docs/superpowers/plans/2026-09-02-infra-producao-provisionamento-aws.md
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
    branch: —   # o item 21 fechou e mesclou em 2026-09-01 (PR #91, merge 6e6f4a64); a branch refactor/frontend-decisoes-de-ui-pendentes foi apagada
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-decisoes-de-ui-pendentes   # item 21, fechado em 2026-09-01
  lane-b:
    active_feature: null
    active_work_item: infra-producao-provisionamento-aws
    workflow_state: executing
    next_owner: claude
    next_action: continue_active_plan
    tree: ../lotus-infra
    branch: infra/producao-provisionamento-aws   # RESETADA para main@8efd85f2 em 2026-09-02 a pedido do Joao: o item 10 replaneja do zero
    active_spec: docs/superpowers/specs/2026-09-02-infra-producao-provisionamento-aws-design.md   # spec v2, do brainstorming de 2026-09-02
    active_plan: docs/superpowers/plans/2026-09-02-infra-producao-provisionamento-aws.md          # plano v2, 20 tasks (Fase A repo, Fase B AWS)
    context_packet: null   # decisao D9 da spec v2: nao regenera — os fatos externos ja estao medidos no state.md
    blocker: null
    resume_state: null
    arquivos_do_descarte:
      - archive/infra-producao-provisionamento-aws-v1   # 305b6ca4 — spec, plano, gates, R1-R4 e toda a medicao
      - archive/site-contact-form-v1                    # 6b643710 — a R5 (POST /api/public/contact), provada e descartada junto
    parked_work_items:
      - cicd-promocao-deploy-e-rollback      # item 12, blocked desde 2026-08-26 (nao ha host); packet em context-packets/2026-08-26-cicd-promocao-deploy-e-rollback.md
    last_completed_work_item: prontidao-pre-nuvem
  lane-c:
    active_feature: null
    active_work_item: null
    workflow_state: idle
    next_owner: joao
    next_action: select_backlog_item
    tree: ../fix-frontend
    branch: fix/frontend-triagem-audits-item-18   # aberta de main@37e0e2d4; fechada e mesclada em 2026-08-30 (PR #87, afe273cf)
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
    last_completed_work_item: frontend-triagem-dos-audits-do-item-18
last_completed_work_item: frontend-decisoes-de-ui-pendentes
state_basis_commit: 8efd85f2
updated_at: 2026-09-02T18:00:00-03:00
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

## Ocupação corrente — 2026-09-02

| Lane | Bloco | Frente | Árvore | Branch | Estado |
|---|---|---|---|---|---|
| `lane-a` | — | — | main tree | — (item 21 fechado e **mesclado** em 2026-09-01, PR #91, merge `6e6f4a64`; branch apagada) | `idle` |
| `lane-b` | `infra-producao-provisionamento-aws` (item 10; o 12 segue **estacionado**) | Infra | `../lotus-infra` | `infra/producao-provisionamento-aws` — **resetada** para `main@8efd85f2` em 2026-09-02; o descarte está em `archive/infra-producao-provisionamento-aws-v1` | `executing` |
| `lane-c` | — | — | `../fix-frontend` | `fix/frontend-triagem-audits-item-18` (item 19 fechado e **mesclado** em 2026-08-30, PR #87, `afe273cf`) | `idle` |


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

## O item 10 foi desfeito e volta ao planejamento — 2026-09-02

**Decisão do João:** descartar tudo que a `lane-b` produziu para o item 10 e **replanejar do zero,
com brainstorming de verdade**. Não foi correção de defeito — o que estava feito passava nos
próprios aceites. Foi mudança de premissa.

**O que foi descartado, e onde está.** Nada foi apagado; duas branches de arquivo guardam o estado
íntegro e citável por SHA:

- **`archive/infra-producao-provisionamento-aws-v1`** (`305b6ca4`) — 11 commits, 13 arquivos,
  +2057/−45: a spec-runbook (525 linhas), o plano (917), o arquivo de gates (319), a revisão
  2026-09 do ADR-09, o MySQL no `docker-compose.prod.yml` com a sonda herdando o serviço, o
  `deploy/bin/backup-db.sh`, os dois confs de nginx e o overlay 443.
- **`archive/site-contact-form-v1`** (`6b643710`) — a R5, `POST /api/public/contact`, com domínio
  `Site`, `SiteCors`, throttle, honeypot e sete testes. Estava **provada end-to-end** contra a API
  real e mesmo assim entrou no descarte, por decisão explícita: a rota nasceu de uma spec que não
  vale mais, e voltar a ela pelo replanejamento é mais barato que herdar desenho órfão.

A branch de trabalho `infra/producao-provisionamento-aws` foi **resetada para `main@8efd85f2`** e a
`feat/site-contact-form` foi apagada do main tree, que voltou para `main`.

**Os quatro motivos** — todos declarados pelo João, e é isso que o brainstorming tem de atacar:

1. **O GATE-2 derrubou a premissa da Fase 0.** A conta Gatika **já é conta-membro de outra
   organização**, e conta-membro não cria organização. O isolamento por AWS Organizations, que era
   a fundação do desenho, não é executável como estava escrito.
2. **A arquitetura volta à mesa** — RDS vs MySQL em container, EC2 vs outra coisa, tamanho, custo,
   e a RNF-DIS-02 (redundância), que segue `unresolved` e que uma EC2 única não satisfaz.
3. **O escopo era grande demais** — dez fases num bloco só: conta, rede, host, banco, DNS, TLS,
   e-mail, alarmes e o site institucional. Recortar em blocos que fechem sozinhos.
4. **A spec veio pronta de fora.** Entrou medida e emendada, mas sem brainstorming — as
   alternativas nunca estiveram na mesa.

**A medição do mundo sobrevive ao descarte, porque é fato e não desenho.** Vale para qualquer
arquitetura que o replanejamento escolher, e remedir custa tempo e risco de esquecer:

- **Conta AWS:** a Gatika é conta-membro de outra organização. A pergunta que decide o isolamento
  virou *de quem é a management account* — mede-se com `aws organizations describe-organization`
  (o CloudShell já traz o CLI; nesta máquina o AWS CLI **não está instalado**).
- **DNS de `lotusotec.cl`** (medido de fora, 2026-09-02): NS em `ns1–ns4.stackdns.com`; **MX no
  Google Workspace**; SPF `v=spf1 include:_spf.google.com include:spf.stackmail.com -all` —
  **`-all`, hard fail**, então quem enviar em nome do domínio sem estar na lista é **rejeitado**;
  **sem DMARC**; sem DKIM em `google._domainkey`; apex e `www` em `185.146.167.195`; `mail` →
  `ghs.googlehosted.com`; `autodiscover` → `autodiscover.stackmail.com`; `ftp` →
  `ftp.us.stackcp.com`; e **existe curinga `*.lotusotec.cl`**, que faz qualquer nome resolver para
  o host WordPress — logo, depois de uma migração de zona, "resolve" deixa de ser prova de que a
  migração ficou completa.
- **Imagens:** o job `image` roda no espelho corporativo, então o par
  `ghcr.io/gatika-cl/lotus-{app,web}:<SHA>` existe para o SHA do **espelho**, não o do fork —
  medido: manifesto existe para `d0d8db50` e não para `de511ad9`.
- **Backend em worktree não prova nada** (P-03): o compose monta o main tree. Vale para qualquer
  recorte que o novo plano faça.

**Estado depois do replanejamento (2026-09-02):** o brainstorming rodou pelos quatro motivos acima
e fechou nove decisões (D1–D9); a spec v2 (`b4a5f45d`) e o plano v2 de 20 tasks (`b928ff7b`) estão
nos ponteiros do frontmatter, `context_packet` segue `null` por decisão D9. A execução da Fase A
começou nesta data — o parágrafo anterior, que ainda dizia `ready_for_planning`, era narrativa do
descarte e não estado corrente.


## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-09-01 | `frontend-decisoes-de-ui-pendentes` (paga a **P-67** e as fichas `D-63`, `D-64`, `D-66`, `D-67`, `D-68`, `D-32`; abre a `D-69`, a `D-70` e o item 23) | Item 21 da fila |
| 2026-08-31 | `prontidao-pre-nuvem` (emenda a **P-62**: o pessoal está público e a decisão de visibilidade ficou com o João) | Item 20 da fila |
| 2026-08-30 | `hardening-i18n-e-erros-api` (paga a **P-61**, `D-07`, `D-18`, `D-36`, `D-38`, `D-58`; abre a **P-70**, a **P-71** e a **P-72**) | Item 7 da fila |
| 2026-08-30 | `frontend-triagem-dos-audits-do-item-18` (paga a **P-63**; abre a `D-63`..`D-68` e rehospeda a **P-67** na `D-66`) | Item 19 da fila |
| 2026-08-29 | `frontend-estilizacao-padronizacao-de-componentes` (paga a `D-62`; abre a **P-67** e a **P-68**) | Item 18 da fila |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
