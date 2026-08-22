---
schema_version: 2
mode: multi-lane
focused_lane: lane-a
active_feature: null
active_work_item: feedbacks-resolver-escopo
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md
active_plan: docs/superpowers/plans/2026-08-22-feedbacks-resolver-escopo.md
context_packet: docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md
blocker: null
lanes:
  lane-a:
    active_work_item: feedbacks-resolver-escopo
    workflow_state: ready_for_execution
    next_owner: claude
    next_action: execute_active_plan
    tree: main-tree
    branch: null  # feat/feedbacks-resolver-escopo, criada na execução
    active_spec: docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md
    active_plan: docs/superpowers/plans/2026-08-22-feedbacks-resolver-escopo.md
    context_packet: docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md
    blocker: null
    resume_state: null
  lane-b:
    active_work_item: infra-producao-runtime-e-aws
    workflow_state: context_required
    next_owner: codex
    next_action: generate_context_packet
    tree: ../lotus-infra
    branch: infra/producao-runtime-e-aws
    active_spec: null
    active_plan: null
    context_packet: null
    blocker: null
    resume_state: null
  lane-c:
    active_work_item: BD-15-docs-guardrails-e-sincronizacao
    workflow_state: ready_for_closure
    next_owner: claude
    next_action: close_active_work_item
    tree: ../lotus-bd15
    branch: docs/bd15-guardrails-e-sincronizacao
    active_spec: docs/superpowers/specs/2026-08-22-bd15-docs-guardrails-e-sincronizacao-design.md
    active_plan: docs/superpowers/plans/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md
    context_packet: docs/superpowers/context-packets/2026-08-22-bd15-docs-guardrails-e-sincronizacao.md
    blocker: null
    resume_state: null
last_completed_work_item: bd12-load-state-e-listas
state_basis_commit: c8480eee
updated_at: 2026-08-22T21:10:00-03:00
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
| `lane-a` | `feedbacks-resolver-escopo` (1) | Backend | main tree (gate P-03) | `feat/feedbacks-resolver-escopo`, na execução |
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

## Trabalho ativo — `lane-c` · `BD-15-docs-guardrails-e-sincronizacao`

### Seleção — 2026-08-22

Item 14 do `backlog.md`, **promovido explicitamente pelo João em 2026-08-22** com a árvore em
`idle`. O `/planejar-bloco` foi invocado duas vezes com o slug correto e **barrou nas duas**: em
`idle` o comando mostra a fila e pede seleção, nunca promove. A promoção veio de duas decisões
dele, tomadas com o custo de cada rota na mão:

- **Rota `context_required`**, que é o que a linha do backlog declara (`Contexto: sim`). A metade
  do bloco que mais pesa — `P-31` (sync ADR-16↔Drive), `P-18`/`P-22` (Notion) e a lista de
  sincronização obrigatória `8.4.0–8.4.7` / `8.5.1–8.5.9` / `9.1.4` — tem fonte **fora** do
  repositório. Planejar sem packet transformaria essa metade em limitação declarada.
- **Esta worktree** (`/home/jvbat/projetos/lotus-bd15`, branch `docs/bd15-guardrails-e-sincronizacao`,
  zero commit à frente da `main` em `c8480eee`). O bloco é docs/mecanismos; enquanto não tocar
  `backend/`, o gatilho da **P-03** não vence. Se a `D-17` virar arch test em PHP, a árvore se
  rediscute **antes** da task, não durante.

Escopo herdado da fila, sem edição: `P-20`, `P-21`, `P-23`, `P-31`, `P-32`, `P-39`, `P-43`,
`P-18`, `P-22`, `D-17`, mais a sincronização obrigatória do Notion. A ficha da `P-32` **veta**
desenhar seletor por classe sem reincidência medida ou decisão explícita do João — restrição que
entra no packet e no brainstorming como está escrita.

**Próxima ação:** Codex gera o Context Packet pela skill `lotus-context-packet`
(`.agents/skills/`), em sandbox read-only, sem alterar arquivo nem estado.

### Context Packet — 2026-08-22: `status: ready`, e o que ele mediu em vez de repetir

O Codex gerou o packet pela skill `lotus-context-packet` em sandbox read-only, sem tocar arquivo
nem estado. Contrato validado item a item: marcadores exatos, frontmatter completo com
`plan_path`/`spec_path` **`null`** (e não inventados), **7** key facts contra o teto de 8, nenhuma
fonte marcada `unavailable`, `RECOMMENDED_TRANSITION: ready_for_planning` presente, e nenhum
gatilho de obsolescência apontando para hash de proveniência ou para a própria transição
promotora. A proveniência foi **remedida localmente** e bate byte a byte: `HEAD`
`e93225fc8146a3734ac0627cce36045d682a7970`, `state.md` blob
`0f32ac293b20cbe98f2ea7fb8bd73564b552169e`, `progress.md` blob
`0457320abea178668c65112513c37fc45dcbb281`.

O packet **não** aceitou a afirmação do backlog de chegada — mediu cada uma:

- **Drive medido, não suposto:** o ADR-16 de lá (`decisao-stack.md`, file ID
  `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw`, `modifiedTime` 2026-07-31) segue **sem o ponto 5** e sem a
  revogação da exceção de shell. A **P-31** está confirmada externamente, não presumida.
- **A armadilha das duas bases do Notion foi verificada e usada como prova:** o ID que a ficha da
  **P-18** cita (`f88bc9603dfa8253b40981686f8ae023`) mora na base **obsoleta**
  (`collection://6adbc960-…`) e está `deleted`. A página equivalente na base canônica é
  `3a2bc9603dfa8067902cf3c62bffdb0d`, já `Concluída` — e ainda carrega a divergência interna que a
  ficha descreve: descrição diz Sprint 3, propriedade diz Sprint 2.
- **A sincronização obrigatória confere:** `8.4.0`–`8.4.7` (8 páginas) e `8.5.1`–`8.5.9` (9
  páginas) estão **todas** `Backlog` com as features entregues; `9.1.4`
  (`388bc9603dfa8119a5ecc157b2cc18d3`) está `A fazer`; a duplicação da **P-22** persiste com as
  duas H.1.3.1 em `Backlog`. Todos os IDs de página ficaram registrados no packet, então o
  planejamento endereça por ID e não por título.

Duas restrições entram no planejamento com a redação que já tinham, e não como sugestão: o **veto
da P-32** ao seletor por classe sem reincidência medida ou decisão explícita do João, e a **P-39**,
que não autoriza retroeditar o plano histórico do BD-6. As quatro perguntas abertas (P-20, P-23, e
o remédio de P-18 e P-22) são **decisões do João**, e o próprio packet declara que nenhuma delas
bloqueia o planejamento.

### Planejamento — 2026-08-22: sete decisões, e o que a medição de ferramenta separou

O brainstorming não aceitou de chegada nem o backlog nem as fichas — mediu cada premissa antes de
oferecer opção, e **três medições mudaram o desenho**:

- **A ferramenta separou Drive de Notion, e as fichas estavam metade certas.** O
  `update_file` do Drive aceita só `title` e `parentId` (*"currently only title and parent_id are
  supported"*), então a **P-31 segue não-fechável** e a ficha estava literalmente correta; já o
  `notion-update-page` escreve propriedade e conteúdo, o que **reabriu** a P-18 e o sync obrigatório,
  congelados desde que foram escritos como "fecha quando o João corrigir manualmente".
- **A forma óbvia da P-32 foi medida e reprovada:** 167 identificadores PascalCase entre crases,
  **28** sem declaração no repositório, **0** achado real — e os 28 se dividem exatamente nas três
  famílias que a ficha previa (vendor, placeholder de molde, palavra de prosa). A previsão virou
  número, e o João decidiu **não desenhar a guarda** e guardar a medição na ficha.
- **A catraca do D-17 liga verde:** 47 arestas declaradas, **0 órfãs**. Isso não é motivo para pular
  a prova — é o motivo de a sonda ser obrigatória, porque catraca que nasce verde não provou nada.

Sete decisões (D1–D7 da spec), duas delas exceções declaradas **na abertura**: escrita externa
autorizada no Notion, restrita ao não-destrutivo, e um arquivo de `backend/` nesta worktree — com o
gatilho literal da P-03 (dois blocos de backend em paralelo) medido como não vencido, nenhum
container de pé e o teste sendo arch test em sqlite `:memory:`.

Uma emenda nasceu durante a escrita do plano e está na §11-bis da spec: a linha do BD-6 que a P-39
manda anotar **não está** no `progress.md` — migrou para `progress-archive.md:74`. O remédio da P-27
é o mesmo; só o arquivo é outro.

Plano: **13 tasks**, executor `claude` no bloco inteiro — a Task 1 exige julgamento sobre a varredura
(uma Regra C escrita sobre linhas `use` passaria em todos os passos e ainda assim estaria errada), as
Tasks 8–11 escrevem fora do repositório, onde não existe `git revert`, e as Tasks 2, 3 e 6 são
redação de decisão.

### Execução — 2026-08-22: as 13 tasks, e as duas premissas do plano que a medição reprovou

**13 de 13 executadas**, `subagent-driven-development`, executor `claude` do início ao fim. O fence
de escopo fechou onde a spec dizia: `git diff main...HEAD --stat` devolve **um** arquivo em
`backend/` (`tests/Feature/Shared/DomainDependencyTest.php`) e **zero** em `frontend/` — o que torna
`pnpm test`/`build`/`lint` e `typescript:transform` **N/A por escopo medido**, não por suposição.

**A Regra C foi provada pela sonda, duas vezes.** Uma catraca que nasce verde não provou nada: com
`'Certification\Models\Certificate'` inserida em `ALLOWED['Catalog']`, a suíte reprova com a linha
`Catalog -> Certification\Models\Certificate`; removida, volta a verde. A sonda rodou na Task 1 e
de novo no HEAD final, no gate. Suíte inteira **873 testes / 3096 asserções / 5 skipped**, pelo
binário direto do `phpunit` com `-d memory_limit=512M` — o `artisan test` documentado morre no meio
por P-50, que é pendência aberta e não falha deste bloco. Pint `passed`.

**Duas premissas escritas do plano caíram na medição, e as duas foram escaladas em vez de seguidas:**

- **`der-fisico.md:74` não estava correta.** A spec a declarava intocável "porque já está certa"; a
  leitura de `backend/database/migrations/2026_08_05_100000_certificates.php` mostrou que ela omitia
  `redator_id`, `snapshot`, `revoked_at`, `revocation_reason`, `timestamps` e a coluna gerada
  `active_enrollment_id`, inventava um `qr_code_hash` inexistente — e, pior, vivia sob
  `## Tabelas PLANEJADAS`. **O João autorizou ampliar a Task 4**: `certificates` e
  `certificate_sequences` foram para uma subseção `### Certification` de `## Tabelas IMPLEMENTADAS`,
  reescritas a partir da migration, e o total foi corrigido para **28 tabelas — 21 de domínio
  (20 implementadas, `feedbacks` no papel) + 7 RBAC/transversal**, com `login_logs` e
  `invitation_tokens` entrando na enumeração. A ausência de ficha de colunas de `invitation_tokens`
  virou a **P-52**.
- **As coordenadas que a lição 18 ia ensinar estavam velhas.** O plano citava
  `CourseController.php:19` e `Catalog/routes.php:11`; medido contra HEAD, a declaração está na
  **linha 24** (hoje cobrindo `['index','show','archived']`) e o `apiResource` na **linha 18**. Uma
  lição que manda ler o controller não pode citar a linha errada do controller — corrigidas em
  commit próprio.

**Notion: 18 páginas escritas, 3 divergências medidas e deliberadamente não escritas.** Todo acesso
por **ID**, zero busca por título, `update_properties` apenas, e releitura por ID depois de cada
write — as 18 confirmam `Concluída` no gate. A **P-18** fechou pelo lado que a evidência apontou: o
ID da ficha era da base obsoleta e está `deleted`; na canônica
`3a2bc9603dfa8067902cf3c62bffdb0d` quem cedeu foi a **descrição**, porque a página irmã
`3a2bc9603dfa8028a1fbf8a3863690ed` já é a da Sprint 3. Ficaram registradas sem write, em
`audits/2026-08-22-bd15-notion-sync.md`: a duplicata da **P-22**, a troca de corpo entre `8.4.0` e
`8.4.7` (medida e **confirmada** — título de um com Descrição/Critério do outro, nos dois sentidos),
o EAP `H.1.3.2` duplicado e as 12 duplicações genéricas do workflow. Apagar e reescrever corpo são
destrutivos; a autorização deste bloco era só o não-destrutivo.

**O classificador de auto mode recusou o write da descrição da P-18** — mesma família de recusa que
já congelou a P-40 e o `tinker` em fechamentos anteriores. Contornada pela porta certa: o João
autorizou explicitamente antes da segunda tentativa, e nada foi escrito enquanto a decisão não veio.

**Pendências: 30 abertas viram 24.** Encerram com o remédio e o path dele na ficha: `P-18`, `P-20`,
`P-21`, `P-23`, `P-39`, `P-43`. Permanecem abertas com a medição que as mantém: `P-22`, `P-31`,
`P-32`. Nasceu **uma**, a `P-52`. A contagem final é 24 e não os 23 que o plano previa — a P-52
nasceu dentro deste bloco, depois de o plano ter sido escrito; o próprio plano mandava conferir em
vez de confiar na aritmética.

### Review — 2026-08-22: baixo risco, gate remedido, 4 achados de mecanismo

Classificação **baixo risco** (nenhuma lei §5 tocada; o único arquivo de código é arch test; executor
`claude`), então lente Claude apenas. **Nada do gate foi herdado:** suíte remedida em **873 / 3096 / 5
skipped**, sonda da Regra C reinserida e vista reprovar (`Catalog -> Operation\Models\Turma`) e
removida, Pint `passed`, `repo-docs-refs` verde, e **3 das 19 escritas do Notion relidas por ID**
(`8.4.7`, `9.1.4`, e a página da P-18, cuja descrição agora bate com a propriedade `Sprint`). ADR-20,
nota do ADR-12, ficha de `certificates` e coordenadas da lição 18 conferidas contra o código, não
contra o plano. **Zero órfão, zero achado de código de produção.**

Os 4 achados são todos de **mecanismo do próprio workflow**, e três deles o bloco herdou em vez de
criar. Estado foi para `blocked` até a decisão do João.

### Correções do review — 2026-08-22: os quatro achados aprovados

O João aprovou **os quatro**. Nenhum ficou deferido para backlog ou pendência.

**Q-1 — o `state.md` encolheu de 1499 para 305 linhas** (107863 → ~20 KB). As narrativas dos cinco
blocos fechados desceram **verbatim** para `historico/state-archive.md`, provado por `diff` contra
`HEAD:docs/superpowers/state.md`: **10 linhas de diferença, todas de cabeçalho `## `**, que deixou
de ser posicional (`Último`, `Penúltimo`) e virou `## Fechado em <data> — <bloco>` — posição
relativa não sobrevive ao próximo fechamento. No lugar ficou `## Itens fechados`, cinco linhas de
ponteiro. A catraca é o passo novo do `/fechar-sprint` §9: a poda entra no mesmo commit do
fechamento, e a sexta linha empurra a mais antiga. `CLAUDE.md` §3 e o cabeçalho do `progress.md`
passaram a citar o arquivo novo.

**Q-2 — a invariante foi reescrita por DONO, não por árvore.** *"`docs/superpowers/**` muda somente
pelo main tree"* era falso no momento em que foi escrito e continuaria falso: a lane escreve o
próprio bloco em `lanes:`, o próprio spec/plano/packet, as fichas que abre, a própria linha do
histórico e os entregáveis que o plano dela nomeia. O que **nenhuma** lane toca ficou explícito:
os campos singulares do topo, o bloco de outra lane e a promoção de item no `backlog.md`.

**Q-3 — os dois gates passaram a resolver a lane pela árvore**, antes de ler estado: `cwd` contra
`lanes.<id>.tree`, e é da lane que saem `workflow_state`, `active_work_item`, plano, spec e packet.
Trocar `focused_lane` para passar no gate ficou proibido por escrito. As transições das duas skills
escrevem dentro de `lanes:`, e só levam o espelho do topo junto quando a lane É a em foco — foi
por isso que o fechamento deste review escreveu em `lane-c` e deixou o topo (`lane-a`) intacto.

**Q-4 — a varredura virou uma só.** `referenciasPorDominio()` é a base única das Regras B e C, e a
decisão "o que é aresta conferível" (o campo `fqcn`, vazio para referência a namespace) mora lá
dentro, não repetida em cada regra. **Três sondas, uma por caminho reescrito**, todas vistas
reprovando e revertidas: Regra B (aresta usada e não declarada, com o path certo do arquivo na
mensagem), Regra C (aresta declarada sem consumidor) e Forma (`use App\Domains\Identity\Enums;`
inserido em `Course.php`, para provar a interpolação nova da mensagem).

Provas depois das quatro correções: suíte **873 / 3096 / 5 skipped** — o mesmo número de antes, o
refactor não perdeu teste —, `repo-docs-refs` 14 verde com os paths novos, Pint `passed`.

## Itens fechados — ponteiro, não narrativa

O que cada bloco **entregou** está em `historico/progress.md`, uma linha com plano, spec, packet e
commits. A narrativa integral — seleção, planejamento, execução, review, correções, fechamento e
merge — está em `historico/state-archive.md`, na ordem abaixo.

| Fechado | Bloco | Fila de origem |
|---|---|---|
| 2026-08-22 | `bd12-load-state-e-listas` | BD-12 dos blocos de dívida |
| 2026-08-20 | `bd18-useloadstate-promise-e-forma` | BD-18 dos blocos de dívida |
| 2026-08-20 | `bd14-contrato-de-entrada` | BD-14 do backlog |
| 2026-08-20 | `bd17-superficie-de-arquivados` | BD-17 dos blocos de dívida |
| 2026-08-19 | `arquivados-roots-restantes` | Próximos blocos, item 1 |

**Esta seção não cresce.** Bloco que fecha entra no topo da tabela e a narrativa dele desce
**inteira** para o `state-archive.md` no mesmo commit do fechamento (`/fechar-sprint` §9); passando
de cinco linhas, a mais antiga sai daqui — ela continua no arquivo, que é onde ela vive. Foi o
achado Q-1 do review de 2026-08-22: este arquivo é o primeiro que toda sessão lê (`CLAUDE.md` §3) e
tinha 1499 linhas, 81% delas narrativa de bloco que já acabou.
