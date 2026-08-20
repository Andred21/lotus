---
schema_version: 1
active_feature: contrato-de-entrada
active_work_item: bd14-contrato-de-entrada
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-20-bd14-contrato-de-entrada-design.md
active_plan: docs/superpowers/plans/2026-08-20-bd14-contrato-de-entrada.md
context_packet: null
blocker: null
last_completed_work_item: arquivados-roots-restantes
state_basis_commit: 0c8db94
updated_at: 2026-08-20T14:05:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

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

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Último item fechado — 2026-08-19 (`arquivados-roots-restantes`, Próximos blocos item 1)

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima terceira** vez: o argumento `arquivados-roots-restantes` era **slug inventado por
mim no turno anterior**, não slug promovido, e `active_work_item` estava `null`.

**Três decisões dele fecharam o gate:** o slug `arquivados-roots-restantes`; a rota **direta a
`ready_for_planning`, sem Context Packet novo**; e **main tree**, partindo de
`feat/arquivados-e-restauracao@6fd0ad8` e não da `main`.

**O gate pegou um erro meu de escopo, e ele é o registro mais importante desta seleção.** Ao oferecer
as opções eu descrevi o escopo como `Budget`/`Quote`, `Redator`, **`Student`** e `Turma`/`Enrollment`
— montado sobre os 8 roots do Context Packet de 2026-08-18. A linha 101 do backlog diz outra coisa:
**`Budget`, `Quote`, `User`, `Redator`, `Turma` e `Enrollment`**, com `Student` em **"Fora de
escopo"** por não ter `destroy` hoje. Eu **incluí `Student`** e **omiti `User`**. O João escolheu
seguir o backlog, e o escopo do bloco são os **seis roots** da linha 101. A medição do próprio turno
confirmou o motivo do backlog: `students` é `apiResource` com `index/store/show/update` apenas
(`Identity/routes.php:46`), então arquivar aluno seria superfície nova com regra a inventar — não
replicação.

**Por que a branch não nasce da `main`.** `App\Shared\Concerns\ArchivesChildren`,
`LoadsCascadedChildren`, `useArchivedPage`, `ArchiveSwitch` e o `archived` do `createCrudResource`
existem **só** na `feat/arquivados-e-restauracao`, que segue sem merge por decisão do João. Nascer da
`main` significaria reimplementar ou conflitar. A branch `feat/arquivados-roots-restantes` foi criada
de `6fd0ad8` ANTES deste commit, seguindo o precedente do bloco anterior.

**`state_basis_commit` passa de `3d02a46` a `6fd0ad8`, e isso não é divergência.** `3d02a46` era o
baseline escrito quando o bloco anterior entrou em `ready_for_review`; os dois commits seguintes
(`1e07786` correções do review, `3d7e95c` fechamento) e o `6fd0ad8` desta sessão vieram depois. Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar.

**Por que não há Context Packet novo.** O packet
`context-packets/2026-08-18-arquivados-e-restauracao.md` já foi gerado **sobre os 8 aggregate roots**,
não sobre os dois executados, e as fontes externas (Notion H.5.1–H.5.4 + Drive) foram esgotadas nele
— inclusive a ausência medida de documento funcional no Drive. O molde de decisão vive em
`specs/archive/2026-08-18-arquivados-e-restauracao-design.md` e a mecânica em código. Recuperação
externa não se repete sem fonte nova.

**`context_packet` aponta para o packet do bloco anterior, e isso é obedecer o invariante, não
reciclar por preguiça.** O invariante diz que, quando o trabalho depende de contexto externo, o
campo **não pode ser `null` em `ready_for_planning`**. O packet cobre os 8 roots, então é fonte
válida para estes seis; herdá-lo declarado é mais honesto que apagar a dependência escrevendo
`null`.

**Um commit fora de bloco entrou antes desta promoção.** `6fd0ad8` (`fix(cors)`) fecha o lado de
aplicação da **P-45**: `allowed_origins` tratava `FRONTEND_URL` como valor único e o `.env` de dev já
é lista (`5173,5174`). Não é deste bloco nem do anterior — era o WIP do João que atravessou os dois,
declarado na seleção anterior. Com ele, `php artisan test` dá **717 passed / 5 skipped** sem precisar
de `FRONTEND_URL` no comando. Pint também limpou a formatação pré-existente da linha `paths`.

### Medição da abertura — 2026-08-18, sobre `6fd0ad8`, não herdada

Sete medições, feitas antes do brainstorming e registradas para ele.

1. **Gates de arquivamento que já existem, por root.** `Budget` recusa se houver cotação **aprovada**
   (`DeleteBudgetAction:20`, 422 "Recuse-a antes"); `Quote` recusa `status === Approved`
   (`DeleteQuoteAction:19`); `Turma` recusa `status !== EmAndamento`
   (`Turma::assertAcademicallyWritable():143`, RN-15); `Enrollment` recusa pela turma
   (`RemoveEnrollmentAction:11`); `User` recusa o último superadmin ativo (`DeleteStaffUserAction` +
   `SuperadminGuard`) e o controller ainda faz `abort_unless($user->type === 'admin', 404)`
   (`UserController:60`). **`Redator` não tem gate nenhum** — `RedatorController:53-58` chama
   `$redator->delete()` cru, sem Action.
2. **Só dois dos seis roots cascateiam com a marca.** `Client` e `Course` usam `markAndDelete`
   (feitos). `Budget → quotes`, `Redator → documents + user` e `Student → user` cascateiam com
   `delete()` cru, **sem `archived_with_parent`**. `Turma` e `Enrollment` **não têm hook `deleting`
   nenhum**: arquivar turma hoje deixa matrículas, documentos e o pivot ativos.
3. **A coluna existe em 5 tabelas** — `client_addresses`, `client_contacts`, `users`,
   `course_modules`, `course_certificate_templates`. Faltariam ao menos `quotes` e `files`; `users`
   já tem e é reaproveitada por `Redator` e `Student`. **O bloco toca schema**, então o planejamento
   lê `docs/adrs.md` e `docs/der-fisico.md`.
4. **O gate de Operação torna a lista de Arquivados estruturalmente pequena.** `Concluida` é estado
   **terminal** (enum, D5) e `assertAcademicallyWritable` exige `EmAndamento`, então turma concluída
   e suas matrículas **nunca** chegam a Arquivados. Coerente com o peso legal; confirmar no
   brainstorming se é o comportamento desejado antes de construir a tela.
5. **`Certificate` é o piso legal e NÃO é soft-deletable.** `Certificate extends Model` sem
   `SoftDeletes`, com `enrollment()`, `course()` e `redator()` os três `belongsTo(...)->withTrashed()`.
   O certificado sobrevive ao arquivamento de tudo que o originou e lê os pais arquivados. Isso
   **valida** o modelo e impõe que arquivar `Redator` ou `Course` não quebre essa leitura.
6. **Redator arquivado some da turma em silêncio.** `turma_redator` é pivot cru (`id`, `turma_id`,
   `redator_id`, `timestamps`) — sem `deleted_at`. A FK é `restrictOnDelete` ("redator com turma não é
   apagado", lição #15), o que barra **hard** delete, não soft. `Turma::redatores()` é
   `belongsToMany` **sem `withTrashed`** (`Turma.php:82`), então a linha do pivot fica viva e a turma
   simplesmente para de listá-lo. Três saídas possíveis: gate, cascata do pivot, ou `withTrashed` na
   relação.
7. **Os dois restores automáticos seguem sem decisão.** `StudentResolver:71-79` restaura `User` e
   `Student` ao reencontrar o RUT na importação; `EnrollStudentAction:38` restaura a matrícula ao
   re-matricular. Com `*.restore` virando permissão por agregado, existem dois caminhos que
   restauram **sem permissão e sem intenção do usuário**. Pendência aberta desde o Context Packet.

**Débito com gatilho vencido, entra por construção:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` dizem *"Esta acción no se puede deshacer."* — deixa de ser verdade no
instante em que `Budget`/`Quote` ganharem restore. Ficou registrado como gatilho no bloco anterior.

**Débito ligado, não vencido:** a **D-37** (backfill de `archived_with_parent`, publicada como `D-34` antes do merge da `main`) tem gatilho no
primeiro deploy, não neste bloco. Cada tabela nova da medição 3 amplia o alcance dela — registrar,
não resolver.

**Risco de review projetado: ALTO.** O bloco **toca schema** (colunas novas), **toca RBAC**
(permissões `*.restore` por agregado), **toca `generated.ts`** e **toca dado com peso legal**
(`Turma`, `Enrollment` e os documentos do `Redator`). A classificação final é do `/revisar-sprint`,
não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: brainstorming das decisões abertas, depois plano.

### Brainstorming e spec — 2026-08-18: sete decisões, e a medição achou um 500 alcançável

**O bloco não era o que o backlog previa, e a medição é que mostrou.** A linha 101 diz *"replicar é
ligar os hooks, a Action, o endpoint e a tela, não reescrever a semântica"*. Isso descreve `Budget`,
`User` e `Redator` — e é falso para os outros três. Os seis roots se separam em **três classes**:
replicação limpa (lista de topo + `createCrudResource`: `Budget`, `User`, `Redator`), lista de topo
fora da fábrica (`Turma`, com `useTurmas` artesanal) e **sem lista de topo** (`Quote` e `Enrollment`,
que vivem dentro do detalhe do pai).

**O achado que justifica o bloco inteiro: restaurar uma turma pode dar 500.** `turmas.active_quote_id`
é coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END` com `UNIQUE`, e
`Quote::turma()` é `hasOne` **sem `withTrashed`**, então `CreateTurmaAction:25` deixa criar turma
nova sobre a cotação de uma arquivada — por desenho, dito em texto no comentário da migration.
Restaurar a primeira estoura `SQLSTATE[23000]`. É o **primeiro conflito de unicidade alcançável** do
tema: a D4 do molde ("conflito não é alcançável") vale para `Client`, `Course` e também `Quote` —
`CreateQuoteAction:22` deriva `seq_in_budget` com `withTrashed()`, medido —, e é falsa só para
`Turma`.

**O segundo achado tem peso legal e é silencioso.** `turma_redator` não tem `deleted_at` e
`Turma::redatores()` é `belongsToMany` sem `withTrashed` (`Turma.php:82`). Arquivar um redator deixa
a linha do pivot viva e o faz **desaparecer** de três sítios — a listagem
(`TurmaQueryBuilder::LISTING:26`), o painel de emissão (`EmissionPanelQuery:94`) e
`CertificateEligibility:118`, que passa a **recusar a emissão de certificado** de turma concluída que
ele ministrou. Nada no código avisa.

**As sete decisões do João:**

1. **D1 — gate de conflito na `RestoreTurmaAction` → 422.** Aceita escrever a primeira
   `ValidationException` nova desde a **D-07** e reabri-la, porque a alternativa é 500 em operação de
   usuário sobre dado com peso legal.
2. **D2 — `Turma` ganha a cascata que nunca teve** (`enrollments` + `files`). Pivot fora.
3. **D3 — `Redator` ganha gate** (turma em andamento → 422) **e `redatores()` passa a `withTrashed`**.
   Os dois são necessários: o gate cobre turma em andamento, o `withTrashed` cobre a concluída, que é
   onde a emissão acontece.
4. **D4 — os dois restores automáticos ficam automáticos**, como exceção declarada com teste. A
   permissão guarda a ação Restaurar da tela, não todo caminho que revive uma linha.
5. **D5 — `Quote` e `Enrollment` têm Arquivados dentro do detalhe do pai**, com endpoints escopados.
   Os dois têm `DELETE` próprio hoje, então sem superfície de restauração o registro ficaria
   inalcançável para sempre.
6. **D6 — um bloco, três fases por módulo** (Commercial → Identity → Operation), um DoD no fim.
7. **D7 — o RBAC espelha o guard do arquivar: cinco permissões novas, não seis.** `User` staff **não
   ganha permissão nova** — seu `destroy` é guardado por `identity.access.manage`, que é
   `SEGREGATED`, e um `identity.user.restore` normal deixaria restaurar mais frouxo que arquivar.
   `identity.user.restore` cobre `Redator`, porque o módulo já usa `identity.user.*` para os três
   tipos de ator.

**Quatro decisões derivadas, tomadas por mim e declaradas na spec:** três colunas novas (`quotes`,
`files`, `enrollments`; `users` reaproveitada); as cascatas passam a marcar e **três Actions ganham
transação que não tinham** (`DeleteQuoteAction`, `DeleteTurmaAction`, e a `ArchiveRedatorAction` que
nasce) porque enumera-e-apaga sem transação é check-then-act; a lista de arquivados de `User` filtra
`type === 'admin'` espelhando o `abort_unless` do `destroy`, senão os usuários de cliente, redator e
aluno arquivados pelas cascatas vazam na tela de staff; e a **dívida de copy do molde é paga** —
`budget.confirmDeleteBody` e `quote.confirmDeleteBody` param de dizer "no se puede deshacer", cujo
gatilho era exatamente este bloco.

**A auto-revisão da spec achou três defeitos e os corrigiu inline.** Um glob (`useBudgetQuotes*`) no
lugar de path exato; a sigla `D10` colidindo entre esta spec e o molde; e uma **lacuna real** — o
binding do restore aninhado. `->scopeBindings()` resolve `{enrollment}` por `$turma->enrollments()`,
que é escopada por `deleted_at IS NULL`, então matrícula arquivada daria **404 antes de chegar à
Action**. A spec passou a exigir `onlyTrashed()` explícito no binding.

**O frontend não migra nada, e isso foi medido:** `useArchivedPage` aceita `ArchivableResource`
**estrutural** (`useArchivedList` + `useRestore`), não a fábrica. `Turma` satisfaz o contrato à mão
no `useTurmas.ts` artesanal, e os aninhados fecham o id do pai no próprio hook.

**Risco reavaliado: segue ALTO.** Schema (3 colunas), RBAC (5 permissões), `generated.ts` e dado com
peso legal — agora com um item a mais que a promoção não previa: o bloco **toca o caminho de emissão
de certificado**.

**Estado: `planning`.** Próxima ação: escrever o plano.

### Plano — 2026-08-18: 15 tasks, executor Claude, e a escrita achou oito coisas que a spec não podia saber

**`docs/superpowers/plans/2026-08-18-arquivados-roots-restantes.md`**, 15 tasks em três fases
(Commercial 1–6, Identity 7–10, Operation 11–14, fechamento 15). Cada task tem paths exatos, o código
inteiro de cada passo, o comando de verificação com a saída esperada e o commit — nada de "similar à
Task N".

**Escrever o plano contra o código exigiu oito decisões derivadas (P1–P8), todas declaradas no
próprio plano.** As três que mudam trabalho:

- **P7 — três telas expõem a rota de arquivar sem ter botão nenhum.** `DELETE /api/redatores/{redator}`,
  `DELETE /api/users/{user}` e `DELETE /api/turmas/{turma}` existem no backend, mas `RedatoresTable`,
  `Admin/UsersTable` e `TurmasTable` **não têm** ação de arquivar, e `api/useTurmas.ts` não tem
  mutação de DELETE. Uma visão de Arquivados sozinha nasceria impossível de exercitar pela interface —
  o DoD da lei §8 não teria como ser cumprido. As Tasks 10 e 14 trazem **as duas metades**, no molde
  exato do `ClientRowActions`. **É escopo que a spec não pediu**; se o João preferir o escopo estrito,
  as duas tasks perdem o botão de arquivar e aquelas fases passam a ser provadas por `curl`.
- **P4 — nascem dois QueryBuilders.** `Budget` monta `with([...])` solto no controller e
  `Identity/QueryBuilders/` está **vazio**. A lição Q-8 (a lista de Arquivados mostra o registro como
  ele estava no instante do arquivamento) exige `asOfArchiving`, que é método de trait e mora em
  builder. `BudgetQueryBuilder` e `RedatorQueryBuilder` nascem; `QuoteQueryBuilder` e
  `TurmaQueryBuilder` ganham `withArchivedListingData()`; `EnrollmentQueryBuilder` não ganha nada
  (matrícula é folha).
- **P6 — a turma arquivada mostraria `0 alumnos`.** `TurmaData::fromModel` lê
  `enrolled_count: $turma->enrollments_count` **sem fallback**, e `withCount('enrollments')` conta só
  as ativas — depois da cascata D2, toda turma arquivada apareceria vazia. O `withArchivedListingData`
  reescreve a contagem com o mesmo predicado do trait. É o Q-8 aplicado a um `withCount`.

As outras cinco: **P1** (o path `useBudgetQuotes.ts` da spec §4 não existe — o arquivo é
`useQuotes.ts`), **P2** (as duas mensagens novas saem em **es-CL**, por precedente de
`Turma::assertAcademicallyWritable()`, e são duas linhas se o João decidir a D-07 no outro sentido),
**P3** (`RestoreEnrollmentAction` aplica a RN-15, simétrica com `RemoveEnrollmentAction:12`), **P5**
(`Redator::turmas()` nasce, inversa de `Turma::redatores()`, para o gate D3) e **P8** (`lockRow` entra
em `Redator` e `Turma`, onde a cascata nasce inteira neste bloco, e **não** entra em `Budget`/`Quote`,
onde o caminho de arquivar já existia com transação e sem lock — acrescentar mutex só no restore
criaria assimetria pior que a que resolve).

**Nenhuma chave de locale nova.** O bloco `archive.*` dos três arquivos cobre confirmar, toasts,
colunas e ações. A única mudança de copy é a **D11**: os dois `confirmDeleteBody` de `budget` e
`quote`, que diziam *"Esta acción no se puede deshacer."* e deixam de ser verdade na Task 3.

**`generated.ts` tem commit próprio, no fim.** As Tasks 5, 10 e 14 rodam `typescript:transform` para o
`tsc` enxergar os DTOs novos, mas não o commitam: três commits deixariam o arquivo em três estados
intermediários e o manifesto do transformer fora de sincronia em dois deles. Task 15, um commit, seis
tipos.

**Handoff: `executor: claude`, risco projetado ALTO.** O bloco toca quatro leis do §5 (tipos gerados,
RBAC, fronteira de features, DoD provado) e tem três pontos que exigem julgamento fora do plano: a
Task 7 muda `Turma::redatores()`, lida por Operation e Certification, e manda **ler a asserção** de
qualquer teste que vire vermelho; a P7 é escopo declarado que o João pode cortar; e a P2 reabre a
D-07.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-roots-restantes`, por
instrução posterior do João. Ordem obrigatória: a Task 1 (colunas + permissões) precede tudo, e dentro
de cada fase o backend precede o frontend.

### Execução — 2026-08-19

Técnica `subagent-driven-development` a partir da Task 2 — a restrição de AgentTool caiu no meio do
bloco e o João pediu a troca; a Task 1 saiu inline, sob `executing-plans`. Main tree pela P-03.
Ledger task a task em `.superpowers/sdd/progress.md`, com implementador e revisor próprios por task.

**A Task 1 achou um gap do plano, e ele é de guardrail.** `PermissionI18nParityTest` exige paridade
exata entre `PermissionCatalog::descriptions()` e as chaves `perm.*` das três locales — permissão
nova sem tradução reprova a suíte. O plano registrou "nenhuma chave de locale nova" pensando no bloco
`archive.*`; `perm.*` é outro namespace e as cinco permissões novas o obrigam. As cinco chaves
entraram no mesmo commit da Task 1, ao lado de cada `*_delete` correspondente. Sem isso a Task 15
descobriria o vermelho no fim, com cinco fases de distância da causa.


### DoD end-to-end — 2026-08-19 (Task 15): as três fases encadeadas, provadas no navegador

Chromium contra a API real e a MySQL de desenvolvimento. O frontend do main tree subiu na **5174** —
a 5173 é o `pnpm dev` do worktree `fix-frontend` do João, e provar a tela nela teria provado o
código de outro branch. O `.env` já previa a porta.

**Fase 1 — Comercial.** O primeiro alvo (`Scap 1`) recusou com **422** e uma frase em PORTUGUÊS:
*"Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes."* É gate pré-existente e
correto (`DeleteBudgetAction:21`), mas a frase está hard-coded na Action e fora do idioma da tela —
achado registrado abaixo. Refeito em `Scap 8`, com cotação e anexo criados pelo próprio app:
arquivar levou cotação e anexo com `archived_with_parent = true`; Arquivados mostrou **`Quotes = 1`**
com a cotação já soft-deletada (a contagem as-of-archiving); restaurar devolveu os três totais
(**42 / 0 / 0 UF**), a cotação e o `anexo-dod.pdf`, com a marca limpa.

**Fase 2 — Identity, e o caso com peso legal (D3).** Nenhum redator do banco tinha só turma
concluída, então Ana Reyes saiu da turma 6 (em andamento, que ficou com Juan Morales) — ação do
próprio app, desfeita no fim. Com só a turma 3 (concluída), arquivá-la passou o gate; a cascata
levou `user#4` e o REUF. **Em `/certificados`, o diálogo de emissão listou `Redator: Ana Reyes` —
arquivada — e a emissão respondeu `201`**, gerando `LOT-2026-1005` (`redator_id = 3`, status
`emitido`, com UUID de validação). É o `Turma::redatores()->withTrashed()` da Task 7 provado onde
importa: sem ele o certificado não sairia. Restaurar devolveu redator, usuário e REUF com a marca
limpa, e Ana voltou à turma 6.

**Fase 3 — Operação.** Turma 2 (`Scap 4 - Cot 1`, 8 alunos, 3 documentos) arquivada pelo botão da
linha (P7): cascata de 8 matrículas e 3 documentos, todas com marca. Arquivados mostrou
**`Students = 8`** com as oito já soft-deletadas. Restore devolveu **200 — não 201** — e trouxe as
onze peças com marca zerada; o detalhe mostrou os 8 alunos e o switch local da D5. Arquivar e
restaurar UMA matrícula fechou o ciclo: a lista de arquivadas veio escopada pela turma, com data e
autor, e o restore (`POST /api/turmas/2/alunos/13/restore` → **200**) invalidou as duas listas.

**D10 na tela.** Com `user#5` (`type = redator`) arquivado, `/administracion` → Arquivados mostrou
**"No archived records"**. Usuário de redator não vaza para a lista de staff.

**O gate D1 na MySQL real.** A suíte roda em sqlite, então a premissa de banco foi conferida no
motor de verdade: `turmas.active_quote_id` existe como coluna gerada
`(case when (deleted_at is null) then quote_id end)` com o índice `turmas_active_quote_id_unique`
(`Non_unique = 0`). É o que torna o gate da `RestoreTurmaAction` um 422 em vez de um 500.

**O que ficou no banco de desenvolvimento.** Uma cotação (`Scap 8 - Cot 1`, 42 UF, pendente) e um
anexo em `Scap 8`, e o certificado `LOT-2026-1005` — artefatos que o próprio roteiro do DoD manda
criar. O anexo de teste que subiu em `Scap 1` foi removido. Todo o resto voltou ao estado anterior:
Ana Reyes na turma 6, Carlos Fuentes ativo, turma 2 e suas onze peças vivas.

### Achados fora do escopo do bloco, para a triagem do review

- **`DeleteBudgetAction:21` responde em português numa interface es-CL**, com a frase hard-coded na
  Action em vez de locale. Pré-existente; é a mesma D-07 que a spec deste bloco reabriu para as duas
  frases novas (que saíram em es-CL).
- **Requisição não autenticada sem `Accept: application/json` responde 500** (`Route [login] not
  defined`) em vez de 401. No `laravel.log` desde 2026-08-16, não é regressão deste branch.
- **Aviso do React `Each child in a list should have a unique "key" prop` no `TableBody`** do painel
  de emissão de certificados. Fora dos arquivos deste bloco.

### Encerramento da execução — 2026-08-19

Quinze tasks provadas, em **28 commits** sobre `6fd0ad8`. Backend **795 passed / 5 skipped**;
frontend `lint`, `build` e **391 testes** limpos. `backend/config/cors.php` não foi tocado por
nenhum commit do bloco — o único commit que o altera é `6fd0ad8`, do João, que é a base.

Os tipos gerados entraram num commit só, no fim (`fdc043e`): 30 inserções, zero remoções, com o
manifesto junto.

Dois desvios do plano, ambos registrados no ledger com a evidência:

1. **O Step 6 da Task 14, ao pé da letra, reprova o `pnpm lint`.** As colunas do rastreio mais a de
   ações levaram `TurmasTable.tsx` a 185 linhas contra a régua de 150 (catraca do D8 do B2). O
   implementador parou em vez de partir o arquivo sozinho; parti eu, em `c2e6c37` — cinco corpos de
   célula para `TurmaCells.tsx`, tabela em 143 linhas, comportamento intacto.
2. **O plano afirmou duas vezes que o `lockRow` fecha a janela contra quem escreve filho, e o código
   não faz isso** — no redator (Task 7) e na turma (Task 11). Os comentários dizem o que o código
   faz, e a P-47 passou a cobrir os dois roots. **O plano não é fonte sobre o comportamento do
   código.**


### Review — 2026-08-19: risco ALTO, duas lentes, seis achados e zero violação de lei

**Classificação ALTO e a segunda lente foi acionada.** Schema (3 colunas), RBAC (5 permissões),
`generated.ts` e o caminho de emissão de certificado — quatro dos gatilhos da skill num bloco só.
Codex rodou read-only sobre `6fd0ad8..HEAD` contra plano, spec e leis §5; os seis achados dele foram
verificados por mim no código antes de qualquer um entrar no relatório.

**Órfãos: zero**, nos dois lados. **Leis §5: nenhuma violação** — sem Repository, sem regra em
controller, cascata instância a instância, `generated.ts` regenerado com manifesto no mesmo commit,
`ValidationException` nas duas frases novas, zero `primereact` direto e zero import cruzado em
`features/`, financeiro não gateia nada. Suítes conferidas na hora: backend **795 passed / 5
skipped**, frontend **391 testes**.

**Seis achados, nenhum 🔴:**

1. **Q-1 🟡 P — `RestoreQuoteAction:34-47` restaura cotação sem exigir orçamento ativo.** A rota é
   plana e a Action não olha o pai, então cotação de orçamento arquivado volta sozinha: some da tela
   (o binding do pai dá 404) mas segue aprovável por API, e cotação aprovada origina turma. É o
   raciocínio da própria **D10** — aplicado a `User` e não a `Quote`.
2. **Q-2 🟡 P — `QuotesList.tsx:44-59`.** `nameLost` e o `InlineLoadState` com Reintentar existem só
   no ramo ativo; o ramo `archived` volta a pintar `—` em silêncio quando o GET de cursos falha,
   justamente na tela que existe para reconhecer a cotação antes de restaurar. É o defeito do BD-6
   reentrando pela porta nova.
3. **Q-3 🟡 M — o kit de arquivados está copiado por root em três camadas:** 6 `*RowActions.tsx` (397
   linhas), 6 hooks `use*Archived`, e o par `toArchive` + `ConfirmDialog` em cinco Pages.
   **Reincidente (2ª sprint)** — proposta de regra para `.claude/rules/frontend-fsliced.md`
   apresentada ao João junto do relatório.
4. **Q-4 🟢 P — o teste 9 da spec §5 não foi escrito, e o código faz o contrário do que ele
   prometia:** `useQuotes.ts:21` invalida `budgetsApi.keys.all`, não a chave do pai.
5. **Q-5 🟢 P — `RestoreTurmaAction:40-55` é check-then-act:** trava a turma que volta e pergunta
   sobre a cotação, que ninguém trava. Mesma classe da **P-47**, ator diferente (criador de irmã, não
   escritor de filho) — a ficha atual não alcança.
6. **Q-6 🟢 — o gate D3 não vale na volta.** Arquivar turma, arquivar redator, restaurar turma
   devolve turma em andamento com redator arquivado. Fecha com gate no restore ou com declaração na
   spec, como a exceção da D4.

**Três achados do Codex foram descartados, com razão registrada:** a audit `restored` duplicada sob
concorrência é simetria deliberada e comentada (decisão consciente não é achado); o `—` do cliente em
`ArchivedBudgetData` é pré-existente e aparece igual na visão ativa, com o erro já escalando; e o
redator no restore de turma entrou rebaixado a 🟢 porque a emissão segue íntegra pelas três peças da
D3. **Zero divergência de julgamento entre as duas lentes.**

**Estado: `blocked`, `resume_state: reviewing`.** Próxima ação: o João aprova o que entra. Somente
achado aprovado vira código.


### Correções do review — 2026-08-19: os seis achados aprovados, em seis commits

O João aprovou **Q-1 a Q-6**. Nenhum foi deferido para o backlog.

**Q-1 — o restore da cotação passou a exigir orçamento ativo.** `RestoreQuoteAction` lê
`$quote->budget->trashed()` e recusa com **422** em es-CL. O teste que provava a limpeza da marca
virou dois: o 422 do gate e o caminho que ele obriga a usar (restaurar o pai devolve a cotação com
`archived_with_parent` em `false`) — sob o gate, cotação marcada implica orçamento arquivado, então
o antigo cenário deixou de ser alcançável.

**Q-5 e Q-6 saíram no mesmo commit, porque tocam a mesma Action.** `Quote::lockRow()` nasceu e os
DOIS caminhos que decidem sobre a cotação a travam: `CreateTurmaAction` — que também moveu as duas
checagens para dentro da transação — e `RestoreTurmaAction`. É o **primeiro eixo com tomador dos dois
lados** desde que a P-47 foi aberta. O segundo gate da turma recusa restaurar turma **em andamento**
com redator arquivado; turma concluída fica de fora, porque é nela que o certificado é emitido e a
emissão já lê redator arquivado pelo `withTrashed` da D3.

**Q-2 — o aviso de nome perdido passou a valer nos dois modos** do `QuotesList`, com o cálculo sobre
a lista VISÍVEL e o `InlineLoadState` extraído para um nó reaproveitado — para não haver um terceiro
sítio onde esquecer.

**Q-4 — o critério 9 da spec §5 existe e o código passou a cumpri-lo.** `useRestoreQuote` recebe o
`budgetId` e invalida o detalhe do pai (que alcança a lista de arquivadas por prefixo) mais a lista
de orçamentos, cujos totais mudam. As outras mutações seguem em `keys.all`: nascem dentro do detalhe
do pai, onde não há outro orçamento montado. O teste vive em `quoteKeys.invalidatedByRestore` e
reprova contra o código antigo.

**Q-3 — o kit de arquivados virou um só, e a regra foi escrita.** Nascem `useArchiveToasts` (interno,
fora do barrel), `useArchiveAction`, `ArchiveRowActions` e `ArchiveConfirmDialog`; `useArchivedPage`
absorveu os toasts do restore e continua propagando os callbacks de quem chama. Os oito hooks de
página caíram de **370 para 162 linhas**, os seis `*RowActions` viraram adaptadores que só chamam
`can()` e passam **booleanos** — `shared/ui` não importa `shared/hooks` —, e os cinco blocos de
`ConfirmDialog` viraram cinco chamadas de cinco linhas. Saldo do commit: **603 linhas a menos, 403 a
mais**. O padrão reincidente virou o item **"Kit de arquivados"** em `.claude/rules/frontend-fsliced.md`.

**Verificação depois das correções:** backend **797 passed / 5 skipped** (era 795: +3 testes novos,
−1 que deixou de ser alcançável); frontend **394 testes em 67 arquivos**, `lint` e `build` limpos.
Zero `primereact` direto e zero import cruzado em `features/`. Nenhuma peça nova órfã. `generated.ts`
não foi tocado — nenhum DTO mudou.

**O que NÃO foi feito, e é do fechamento:** a prova no navegador dos dois 422 novos (cotação sob
orçamento arquivado; turma com redator arquivado) e das três telas que o Q-2/Q-3 tocaram. As suítes
provam os endpoints e o `pnpm build` prova os tipos; o DoD da lei §8 pede a tela, e esta sessão não
teve navegador. **Entra no `/fechar-sprint` como item obrigatório, não como opcional.**



### Fechamento — 2026-08-19: os dois 422 novos provados no navegador, e a `main` andou por baixo

**O item obrigatório que o review deixou para cá foi cumprido, no Chromium contra a API real e a
MySQL de desenvolvimento.** O frontend do main tree subiu na **5174** de novo — a 5173 é o `pnpm dev`
do worktree do João —, sessão de admin, interface em **es-CL**.

**O 422 do Q-6 é alcançável pela interface, e o roteiro é o da própria ficha.** Turma 2
(`Scap 4 - Cot 1`, em andamento, 8 alunos, redator Pedro Soto) arquivada pelo botão da linha — a
cascata marcou as **8 matrículas** (`archived_with_parent = 1`, medido no banco). Com a turma dele
arquivada, `/personas` deixou arquivar **Pedro Soto** (o gate da D3 só enxerga turma viva, por
desenho). Em `/operacion` → Arquivados, a linha veio como estava no instante do arquivamento —
**8 alunos** (P6) e o redator **arquivado ainda visível** (`withTrashed` da D3) — e **Restaurar
devolveu `POST /api/turmas/2/restore` → 422** com a frase da Action em es-CL: *"Un redactor de esta
clase está archivado: restáuralo antes de restaurar la clase."* Restaurado o redator (200), a mesma
turma voltou (200) com as 8 matrículas e a marca zerada.

**O 422 do Q-1 NÃO é alcançável pela interface, e isso é a razão de o gate existir — foi provado nos
dois passos.** Arquivado o orçamento `Scap 8`, a cascata marcou a cotação (`archived_with_parent =
1`); abrir `/comercial/presupuestos/8` devolveu **`GET /api/budgets/8` → 404** (*"No query results
for model … Budget 8"*), porque o binding do pai é padrão — a lista de arquivadas da cotação vive
dentro do detalhe e some junto. A rota que sobra é a **plana**, e ela foi exercida do contexto da
própria página (mesma sessão, mesmo `Origin`, mesmo CSRF): `POST /api/quotes/11/restore` → **422**,
envelope RFC 7807 com
*"El presupuesto de esta cotización está archivado: restáuralo primero."* Restaurar o orçamento pela
tela (200) devolveu a cotação com a marca limpa.

**Q-2 e Q-4 também foram provados na tela, e não por leitura.** Com `http://localhost:8080/api/courses*`
roteado para 500, a aba **Arquivados** do detalhe passou a mostrar *"No se pudo procesar la respuesta
del servidor."* + **Reintentar** ao lado da cotação com `—` no lugar do nome — o ramo que antes
pintava o traço em silêncio. Removida a rota, **Reintentar** trouxe *"Trabajos en líneas energizadas
220kV"* de volta. E o restore da cotação atualizou o **detalhe do pai sem reload**: `0 UF / 0
cotizaciones` viraram `42 UF / 1` no mesmo instante — a invalidação da chave do pai que o critério 9
da spec pedia.

**Q-3 exercitado nas telas, não só nos testes:** os diálogos de arquivar de turma, redator, cotação e
orçamento saíram todos do `ArchiveConfirmDialog` único, com o toast *"Registro archivado."* do
`useArchiveAction`; as listas de Arquivados de `/operacion`, `/personas`, `/administracion`,
`/cursos` e `/comercial` renderizaram pelo `useArchivedPage`. **Zero erro de console** em toda a
sessão. A **D11** apareceu onde devia: o diálogo da cotação diz *"Podrás restaurarla desde
Archivados."*, e o do orçamento avisa que *"Sus cotizaciones se archivarán junto con él."*

**Zero resíduo.** Tudo que o roteiro arquivou foi restaurado: turma 2 e suas 8 matrículas, Pedro
Soto (`redatores.id = 2`), o orçamento 8 e a cotação 11 com `archived_with_parent = 0`. O banco de
dev terminou o gate como começou.

**Resto do gate.** Backend **797 passed / 5 skipped** (2942 asserções); frontend `pnpm lint` exit 0,
`pnpm build` verde e **67 arquivos / 394 testes**; `pint --test` **`passed`** nos **54 arquivos PHP**
do bloco (nunca sem argumento); `typescript:transform` rodado de novo **sem drift** — `git diff` em
`shared/types/` vazio, então o `generated.ts` do commit `fdc043e` está em sincronia e não foi editado
à mão. Código morto: varredura nos **41 arquivos criados pelo bloco** (fora testes) não achou nenhum
sem consumidor; os `.gitkeep` de `features/*/stores|api|hooks` seguem alheios e não foram tocados.
Leis do §5: zero `primereact` em `features/`, zero import cruzado entre features, zero
`abort(4xx)` novo (o único do repositório é o `abort(404)` público pré-existente), nenhum Repository,
nenhum trigger de banco.

**Pendências.** A **P-45** cumpriu a sprint de rastro e saiu de `encerradas.md`. A **P-47** já tinha
sido reescrita pelas correções do review e cobre os dois eixos. Três fichas mexidas por medição
deste gate: a **P-35** (o gatilho venceu **pela metade** — o bloco tocou `Quote`, `DeleteQuoteAction`
e `RestoreQuoteAction`, mas **não** `CreateQuoteAction`, então a simetria do `$fillable` não foi
absorvida), a **P-44** (as telas de Arquivados deram um **segundo palco** às sondas: `E2E Gate
Redator 1/2` em `/personas`, `GATE T7` em `/cursos`, dois clientes de sonda em `/comercial` — nada
disso é deste bloco e nada foi apagado) e a **P-48**, que nasce aqui: o `title` do envelope RFC 7807
é português nos seis ramos enquanto os `detail` novos são es-CL. **Não é bug vivo** — `problemMessage`
não lê `title` — e traduzir é a decisão de idioma que a D-07 espera.

### A divergência que o fechamento encontrou e NÃO resolve: a `main` fechou outro bloco em paralelo

`origin/main` está **56 commits à frente** da base deste branch (`6fd0ad8`) e contém o
`feat/identity-ativacao-acesso-redator` inteiro, fechado pelo João em **2026-08-19 16:05**
(`967cc618`, merge `f2d74da7`). O `state.md` da `main` diz `workflow_state: idle` com
`last_completed_work_item: identity-ativacao-acesso-redator`; o deste branch dizia
`ready_for_closure` para `arquivados-roots-restantes`. **Dois `active_work_item` viveram ao mesmo
tempo, em linhas diferentes** — o invariante de um só valeu dentro de cada branch, não entre elas.

**O fechamento não escolheu por heurística e não importou nada da `main`:** o estado deste branch,
o plano, a spec, os 36 commits e o `progress.md` concordam entre si sobre a etapa do bloco, então o
gate rodou sobre o que existe aqui. O que fica para a decisão do João, no merge:

1. **`backlog.md` conflita nos dois sentidos.** A `main` ainda traz o item 1 na redação **anterior**
   aos dois blocos de arquivamento ("tornar o lifecycle de archive/restore explícito") — ela nunca
   recebeu nem o `arquivados-e-restauracao` nem este —, e já removeu o item de **ativação de acesso
   do redator**, que neste branch continua listado (renumerado para 3 por este fechamento, porque a
   regra manda remover **somente** o item concluído).
2. **`pendencias/` conflita.** Na `main` a **P-45** segue **aberta**; aqui ela foi encerrada dentro do
   `arquivados-e-restauracao` e o rastro saiu agora. A **P-48** não colide: o maior ID da `main`
   também é o P-47.
3. **`progress.md` tem dez linhas dos dois lados, com conjuntos diferentes** — a `main` tem a linha
   do bloco de identidade e não tem as dos dois blocos de arquivamento.
4. **`state.md` vai conflitar inteiro**, e a janela de cinco fechamentos difere.

Nada disso é regressão deste bloco: nasce de a `feat/arquivados-e-restauracao` seguir sem merge por
decisão do João, com este branch nascendo dela. **Reconciliar é decisão dele, não do fechamento.**

### Merge da `main` — 2026-08-19: a divergência acima foi resolvida por instrução do João

O João mandou trazer a `main` para este branch antes do PR. `git merge origin/main` (base
`b758068b`) trouxe os 56 commits do `identity-ativacao-acesso-redator` e abriu **10 conflitos** —
6 de doc, 3 de componente e 1 de manifesto. Suítes depois do merge: **828 passed / 5 skipped**
(3006 asserções) no backend, **77 arquivos / 435 testes**, `lint` 0 e `build` verde no frontend.

**Código — três conflitos, três composições, nenhum "escolhe um lado":**

1. **`QuotesList.tsx`** — a `main` tinha o `InlineLoadState` inline com `t(courses.errorHint)`; este
   branch tinha o mesmo nó **extraído** em `avisoDeNome`, porque o Q-2 o reusa nos dois modos. Ficou a
   extração daqui **com o `errorHint` de lá**: o `useLoadState` da `main` escolhe a dica por status
   (403/404/genérico), e o nosso literal `'common.loadErrorHint'` era mais burro.
2. **`RedatoresTable.tsx`** — a `main` pôs o botão de **reenviar convite** na célula de ações; este
   branch trocou a célula inteira pelo `RedatorRowActions` do kit. A célula agora tem os dois, e o
   convite **só aparece na lista ativa**: o `User` do redator desce com a cascata, então reenviar
   acesso a um redator arquivado não é ação que exista. Coluna de `8rem` para `10rem`.
3. **`PeoplePage.tsx`** — a `main` desceu o dado para `RedatoresTab`/`StudentsTab` (D-04: com o hook
   acima das abas, o `renderActiveOnly` não alcançava e a tela buscava as duas listas). Ficou a
   estrutura de lá, e **a fiação de arquivados deste branch desceu junto** para a `RedatoresTab` —
   `useRedatoresArchived`, o `toArchive`, as props de modo e o `ArchiveConfirmDialog`. A casca voltou
   a não ter hook de dado nenhum.

**`generated.ts` e o manifesto foram regenerados, não resolvidos à mão** — `typescript:transform`
sobre o backend já mesclado, que é a única fonte válida (lei §5.3). O `RedatorData` da `main` ganhou
`is_active`, e o fixture do `RedatorRowActions.test.tsx` passou a trazê-lo: o `tsc -b` reprovou
primeiro, o teste foi corrigido depois.

**Três colisões de ID, resolvidas pelo precedente da P-35 (quem renumera é quem ainda não publicou
na `main`):**

- **`D-34` → `D-37`** — a `main` publicou um `D-34` (gate RBAC do Dashboard atravessando o seam como
  `null`) e um `D-35`; o backfill de `archived_with_parent` deste branch ficou com o próximo livre, e
  as três citações em `state.md`/`progress.md` acompanharam.
- **`P-47` → `P-49`** — a `main` publicou uma `P-47` (os 7 redatores do seed sem a role `redator`); a
  ficha do `lockRow` meio mutex é a renumerada.
- **`P-48` foi retirada** — era duplicata da **D-36** da `main`, que já registrava o envelope RFC 7807
  não localizado desde o BD-13. A medição do nosso fechamento (o 422 com `title` em PT e `detail` em
  es-CL no MESMO envelope) foi **enxertada na D-36**, que é a ficha dona do assunto.

**Doc — o que ficou de cada lado:**

- **`backlog.md`:** o item de arquivamento sumiu (entregue nos dois blocos desta linha) e o de
  **ativação de acesso do redator** também (entregue na `main`) — sobraram Roles/permissões e
  Hardening. O texto do B2 passou a ser o da `main`: o bloqueio do valor da view do Redator **caiu**.
- **`pendencias/`:** a **P-45** continua **encerrada**, e agora com prova de código em vez de
  histórico — depois do merge o `explode` existe nos dois sítios que leem `FRONTEND_URL`
  (`tests/TestCase.php:25` e `config/cors.php:22`). As duas fichas da `P-44` (sondas nas telas de
  Arquivados, daqui; rastro do gate do identity, de lá) ficaram as duas.
- **`progress.md`:** as quatro entregas novas entraram em ordem de data e as duas mais antigas
  desceram para o `progress-archive.md`, que também perdeu **3 linhas duplicadas** — os dois lados
  tinham arquivado as mesmas entregas por conta própria.
- **`state.md`:** a janela voltou a cinco fechamentos, intercalando os dois lados
  (`arquivados-roots-restantes` → `identity-ativacao-acesso-redator` → `arquivados-e-restauracao` →
  `bd13-listagens-e-abas` → `bd16-perfil-e-kit-compartilhado`). Saíram da janela, para o git e para o
  `progress-archive.md`: `dashboard-frontend-analitico-e-redator`, o trabalho fora de bloco de
  2026-08-17 e `meu-perfil-frontend`.

**O merge achou uma coisa que nenhum dos dois lados tinha:** juntas, as duas suítes passam de
**828 testes** e estouram o `memory_limit` de **128M** do container — o `docker compose exec -T app
php artisan test` do `CLAUDE.md` §6 morre com `Allowed memory size … exhausted` no
`ManualTurmaTest`. Não é defeito de teste (o `--filter` passa em 2,35s) nem do merge: o pico é
**129 MB**, um megabyte além do default. Pelo binário direto com `-d memory_limit=1G` a suíte fecha
verde. Virou a **P-50**, travada em decisão do João, porque `docker/php/uploads.ini` cai em `conf.d`
e vale para o PHP-FPM de produção também.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.

## Penúltimo item fechado — 2026-08-19 (`identity-ativacao-acesso-redator`, item 4 de "Próximos blocos")

### Seleção — 2026-08-18

**Item 4 de "Próximos blocos" (`backlog.md`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre: o
argumento era a **linha do backlog** ("Identity · ativação de acesso do redator"), com bullet e
markdown, não slug promovido.

**Três decisões dele fecharam o gate:** o slug `identity-ativacao-acesso-redator`; a rota
**`context_required`**, porque "como o redator recebe a credencial" é decisão de produto e a fonte é
externa ao repositório; e a **worktree `fix-frontend`** como área de trabalho, contra a regra do
comando — a exceção está declarada abaixo, não descoberta na execução.

**A branch nasceu ANTES deste commit**, seguindo o precedente do B1 e do B2:
`feat/identity-ativacao-acesso-redator`, criada de `main@2c7b249`. Este arquivo já é escrito na
branch, não na `main`. Árvore limpa na promoção.

### Duas regras cedem por decisão explícita do João — declaradas na abertura

1. **P-03 · bloco de backend rodando em worktree linkada.** A regra do `/planejar-bloco` é "toque
   backend assume main tree por causa da P-03", e a main tree é `/home/jvbat/projetos/lotus`
   (primeira linha de `git worktree list`), não esta árvore. **Não há compose por worktree:** o
   MySQL e o container `app` são um só, então migration, seed e teste de integração deste bloco
   disputam o mesmo banco com a outra árvore. A mitigação não está desenhada — entra como custo do
   planejamento, e o gatilho da P-03 vence aqui em vez de ser adiado de novo.

2. **A base não contém `arquivados-e-restauracao`.** Medido na promoção: `/home/jvbat/projetos/lotus`
   está em `feat/arquivados-e-restauracao@3d7e95c` ("docs(state): fecha o bloco
   arquivados-e-restauracao"), com `state.md` próprio em `idle` e
   `last_completed_work_item: arquivados-e-restauracao` — e a `main` **não tem esse merge**
   (`main@2c7b249` é o PR #59, do BD-13). Os dois `state.md` concordam na **etapa** (`idle` nos
   dois) e divergem na **história**: o `backlog.md` desta árvore ainda lista "Arquivados e
   restauração de soft-delete" como Próximos blocos #1, e o estado daqui não sabe do fechamento.
   **Conflito de merge é provável e está previsto** — aquele bloco mexe no lifecycle de arquivamento
   dos agregados e este mexe em `User`/Identity. Integrar primeiro foi oferecido e recusado; a
   reconciliação fica para o fechamento.

### Quatro medições da abertura, feitas sobre `2c7b249` e não herdadas do backlog

1. **`password_reset_tokens` existe e ninguém a usa.** A tabela nasce em
   `database/migrations/0001_01_01_000000_create_users_table.php` e `config/auth.php:98` a aponta;
   não há uso do broker `Password::` no `app/` nem rota de reset em
   `app/Domains/Identity/routes.php`, que expõe apenas `/login`, `/logout`, `/me` e `profile/*`.
   **A infra está pronta e o fluxo é o que falta** — o bloco decide se a usa ou não.

2. **Não existe transporte de e-mail.** `MAIL_MAILER=log` no `.env.example` e nenhum
   `app/Notifications`. Se a decisão de produto for convite por e-mail, o custo não é "escrever a
   Notification": é escolher e configurar transporte para dev e para produção, e isso é infra nova
   num bloco de identidade.

3. **Ativar o login não basta: o redator nasce sem role.** `syncRoles` só existe em
   `CreateStaffUserAction.php:45` e `UpdateStaffUserAction.php:62` — `CreateRedatorAction` e
   `UserProvisioner` não atribuem nada, embora `RolePermissionSeeder.php:38` já defina a role
   `redator` com quatro permissões (`operation.turma.view`, `operation.turma.submit_docs`,
   `feedback.feedback.view`, `feedback.feedback.manage`). **Um redator ativado hoje autenticaria sem
   permissão nenhuma**, e a view do dashboard dele abriria assim mesmo, porque o gate é por `type`
   (`DashboardController.php:37`) e não por role. É a metade do defeito que o backlog não registrava.

4. **Nenhuma escrita de `is_active = true` alcança um redator.** `UserProvisioner.php:40` grava
   `false` para todo ator (RN-01), e o campo só é escrito depois em `CreateStaffUserAction:42` e
   `UpdateStaffUserAction:54`, que são staff. `AuthController.php:52` recusa o inativo. Não há
   endpoint, tela ou comando que vire o bit para redator — a promoção confirma o que o fechamento do
   `dashboard-backend-agregacoes` mediu em 2026-08-15.

**Risco de review projetado: ALTO pelo gate binário.** O bloco toca autenticação (lei §5.4, Sanctum
cookie/CSRF), a RN-01 (lei §5.5) e RBAC, e provavelmente cria caminho de credencial. A classificação
final é do `/revisar-sprint`, não desta promoção.

**O que a promoção NÃO decide, e é entrada do brainstorming:** o mecanismo de entrega da credencial
(convite por e-mail × senha definida no cadastro × link de ativação assinado), se `is_active` vira
ação administrativa explícita, e se a role `redator` passa a ser atribuída no cadastro. **O packet
vem antes** — nenhuma dessas respostas se supõe a partir do código.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/identity-ativacao-acesso-redator` a partir de `main@2c7b249`.

### Context Packet — 2026-08-18: a fonte canônica decide o canal e não decide o mecanismo

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `03a0b72`) e validado contra o
contrato item a item: marcadores exatos, frontmatter completo com `plan_path`/`spec_path` em
**`null`** (registrados, não omitidos), **8 key facts** — o teto —, fonte indisponível registrada
como tal e `RECOMMENDED_TRANSITION` presente. Salvo em
`context-packets/2026-08-18-identity-ativacao-acesso-redator.md`. **Uma re-invocação não se
justifica:** o contrato não foi violado, o packet respondeu o que pôde e nomeou o que falta.

**O que o Drive decide, e o backlog não sabia:** a credencial de admin e de redator **vai por
e-mail do sistema** (RF-USR-09 em `requisitos-negocio.md`), não há auto-registro, e a role
correspondente ao tipo deve ser associada **automaticamente no cadastro** (RF-ROL-05) — o que
transforma a medição 3 da abertura de "achado de desenho" em **divergência com a fonte canônica**:
o código não atribui role nenhuma ao redator.

**O que nenhuma fonte decide, e é por isso que o estado vai a `blocked`:** o Drive fixa o canal e
não o conteúdo — senha gerada, senha escolhida pelo admin, convite para definir senha ou link
assinado de ativação são todos compatíveis com o que está escrito. `modulo-identidade-acesso.md`
prevê recuperação de senha e verificação de e-mail, **e prever recuperação não autoriza usá-la como
convite**. A EAP do Notion não tem task de ativação, convite, primeiro acesso ou verificação: as
adjacentes são login (2.2.2), administração de staff (2.6.2), CRUD de redator (4.1.4/4.2.2), troca
autenticada da própria senha (8.5.7) e rate limit (9.1.1).

**Figma ficou `unavailable` e isso está registrado, não maquiado:** o runtime do Codex não tem
ferramenta de descoberta de arquivo, e nenhuma fonte consultada forneceu `fileKey`/`nodeId`. Se
existir tela de primeiro acesso no protótipo, ela não foi vista — e virou staleness trigger.

**Duas perguntas bloqueiam o brainstorming**, e as duas são de produto, não de código:

1. **O que o e-mail entrega** — senha gerada, convite para definir senha, link assinado de
   ativação/redefinição, ou mecanismo já acordado com a Lotus.
2. **Em que evento `is_active` passa a `true`** — no cadastro, no envio do convite, na conclusão do
   link, ou por ação administrativa explícita.

Expiração, reenvio, revogação e e-mail não recebido dependem da primeira e ficam registrados como
terceira pergunta, não bloqueante.

**Estado: `blocked`, com `resume_state: context_required`.** Respondidas as duas, o packet é
atualizado (não regerado do zero) e o estado retorna a `ready_for_planning`. **Não implemento, não
escolho por ele, e não trato "recuperação de senha" como convite por conveniência.**

### Bloqueio resolvido — 2026-08-18: as duas decisões de produto saíram do João

O packet voltou `blocked` porque nem Drive nem Notion decidiam o mecanismo. **O João decidiu os
dois pontos, e a decisão é dele — não está escrita no Drive**, então virou fonte `[JOAO-DEC]` no
packet e staleness trigger no sentido contrário: se a Lotus registrar algo que contradiga, o packet
envelhece.

1. **Um mecanismo, dois fluxos: link por e-mail.** O mesmo caminho serve **primeiro acesso**
   (disparado no cadastro do redator) e **recuperação de senha** (self-service). Isso põe em uso a
   `password_reset_tokens` que a medição 1 da abertura achou pronta e órfã, e satisfaz o canal que o
   RF-USR-09 exige sem inventar um segundo padrão de credencial.
2. **`is_active` nasce `true` para o redator, no cadastro, e o admin pode revogar.** Cliente e aluno
   continuam `false` por padrão — a RN-01 fica intacta onde ela vale. A consequência prática é que
   o gate de acesso do redator passa a ser *saber a senha*, não *estar ativo*: `UserProvisioner`
   grava `false` para todo ator hoje (`:40`), então o default deixa de ser único e passa a depender
   do `type`.

**O que a decisão NÃO fecha, e é o que o brainstorming resolve:** expiração/reenvio do link de
primeiro acesso (a política de 60 min do broker foi desenhada para recuperação), por qual superfície
o admin revoga, se o bloco entrega backend e frontend juntos — "esqueci minha senha" e "definir
senha" são telas **públicas** que não existem — e como o DoD prova o e-mail com `MAIL_MAILER=log`.

**Estado: `ready_for_planning`.** Packet atualizado no lugar (`status: ready`), não regerado.

### Brainstorming e spec — 2026-08-18: seis decisões, e uma delas nasceu de medição, não de pergunta

Cinco perguntas fecharam o desenho, e uma sexta decisão entrou **porque a medição a exigiu**: sem
reenvio de convite não há caminho para os redatores já cadastrados, que nasceram `is_active=false`
com senha aleatória — o switch liga a conta e ninguém sabe a senha, e eles não sabem que existem
para pedir recuperação.

**As escolhas:** só redator agora (staff segue com senha digitada, e isso vira débito contra o
RF-USR-09); bloco único ponta a ponta, fugindo do corte por camada do Dashboard e do Meu Perfil,
porque o DoD é "o redator autentica" e isso não se prova sem as telas públicas; dois brokers sobre
`password_reset_tokens` (7 dias para convite, 60 min para recuperação), com link morto caindo na
tela de recuperação em vez de virar chamado; `is_active=true` no cadastro com switch de revogação
no formulário do redator, encerrando todas as sessões; e Mailpit no compose, para o DoD clicar o
link real em vez de ler o `laravel.log`.

**Uma medição nova durante o brainstorming mudou o alcance da pergunta, e foi respondida:** staff
hoje recebe senha digitada pelo admin no formulário (`CreateStaffUserAction.php:41`), enquanto o
RF-USR-09 fala de admin **e** redator. O mecanismo novo tem um segundo consumidor óbvio; o João o
deixou fora, com o custo declarado.

Spec em `specs/2026-08-18-identity-ativacao-acesso-redator-design.md`.

### Plano — 2026-08-18: escrever o plano derrubou o mecanismo da D5

14 tasks, executor **claude**. O critério do `/executar-bloco` não deixa margem: o bloco toca lei do
§5 em três pontos — §5.3 (`generated.ts` regenerado), §5.4 (rotas públicas novas, purga de sessões,
`sendPasswordResetNotification`) e §5.5 (o default de `is_active` deixa de ser único) — e decide
contrato de API em duas tasks. Nada disso é mecânico com paths fechados, então não vai ao Codex.

**A D5 aprovada não sobreviveu à escrita do plano, e a spec foi emendada (§9).** "Dois brokers sobre
a mesma tabela" não funciona: o `expire` é aplicado na validação, pelo broker que valida, então com
uma tabela só o endpoint de reset não distingue token de convite (7 dias) de token de recuperação
(60 min) — e validar pelo broker errado daria 7 dias à recuperação. Pior, `password_reset_tokens`
tem uma linha por e-mail: um "esqueci minha senha" apagaria o convite pendente do mesmo redator.
**Correção:** tabela `invitation_tokens` própria e dois endpoints (`/api/invitation/accept` e
`/api/password/reset`), com a tela pública única decidindo pelo `?flow=`. A decisão de produto do
João fica intacta; muda a mecânica que a sustenta.

**Segunda correção, menor, também medida:** a spec falava em "switch" de acesso, e não existe
`AppSwitch` em `shared/ui` — feature não importa PrimeReact direto (§5.6). O controle copia o molde
já existente do staff (`StaffUserDialog.tsx:118-130`): `FormField` + `AppDropdown` Activo/Inactivo.

Plano em `plans/2026-08-18-identity-ativacao-acesso-redator.md`.

### Execução — 2026-08-19: 14 tasks, e o DoD do gate provado no navegador

As 14 tasks do plano estão implementadas e commitadas, uma por commit, de `50e76cd` a `112b145`
(mais `644e372` e `18adad6`, os dois artefatos do transformer). Ledger com a prova task a task em
`.superpowers/sdd/progress.md`.

**Catracas (Task 14, Step 1):** suíte backend `5 skipped, 704 passed (2586 assertions)`; `pint --test`
verde nos arquivos do bloco; `pnpm lint` limpo, `pnpm build` ok, `pnpm test` `67 files / 401 tests`;
`typescript:transform` seguido de `git diff --exit-code` em `generated.ts` sem saída.

**A P-03 não travou o gate, e a stack do João não foi derrubada.** Override efêmero de portas fora do
repositório subiu a stack deste worktree em nginx **8081**, MySQL **3308** e Mailpit **8025**, com o
Vite do worktree em **5174** — a 5173 é o dev server da main tree. Depois do gate, só
`fix-frontend-app-1` ficou de pé, como a sessão encontrou o ambiente.

**Steps 2–6, no navegador contra a API real:** primeiro acesso ponta a ponta (cadastro → e-mail no
Mailpit com `?flow=invite` e "vence en 7 días" → senha definida → login → Dashboard na view do
redator); revogação (`is_active=0`, `sessions=0`, a aba logada cai para o login no reload e a nova
tentativa é recusada com "This account is not active."); recuperação com resposta idêntica para
e-mail que existe e que não existe, com entrega só no primeiro; reenvio de convite para redator
pré-bloco, com o toast e o primeiro acesso completo. RN-01 medida no fim: `cliente`/`aluno` ativos
= `0`.

**Dois achados do gate, ambos registrados no ledger e nenhum deles defeito do código entregue:**
reenviar convite **não** ativa — para redator pré-bloco o admin precisa marcar Access state = Activo
*e* reenviar (o desenho está certo: conceder acesso é o controle explícito, não efeito colateral do
reenvio); e os 7 redatores do seed seguem **sem a role `redator`**, que só é atribuída no cadastro
novo — não impede login nem Dashboard (a view sai de `user.type`), mas qualquer gate `permission:`
os barraria. É dado de seed, não código do bloco.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para `identity-ativacao-acesso-redator`.
O review **não** foi iniciado por este comando.

### Emenda — 2026-08-19: a recuperação de senha volta para dentro da tela de login

Pedido do João com o bloco em `ready_for_review`: *"quero deixar a recuperação de senha na mesma
tela de login mudando apenas os campos (inputs) quando clicado"*. **Não é bloco novo.** A tela
`/recuperar-clave` é entrega deste bloco (`9726eab`, `112b145`), então o pedido muda a forma de uma
superfície já entregue e o estado volta para `planning`, com o review adiado — não iniciado e não
cancelado.

**O que a emenda troca:** `ForgotPasswordPage` deixa de ser página. `/login` e `/recuperar-clave`
viram rotas irmãs do mesmo layout, as duas renderizando `LoginPage`; o modo sai do `pathname` e a
troca é um `<Link>`. O e-mail digitado sobe para um painel comum e sobrevive ao clique — é o ganho
que justifica a mudança, não a estética.

**A premissa foi medida antes de virar decisão.** Em `react-router@7.18.0`, `_renderMatches` monta
cada match dentro de `RenderedRoute` **sem `key`**: duas rotas irmãs com o mesmo `element`
reconciliam em vez de remontar, e o estado do painel sobrevive à troca de URL. Sem isso o desenho
inteiro cairia — o e-mail morreria na navegação, que é exatamente o defeito que a emenda fecha.

**Dois efeitos declarados, não descobertos:** visitante anônimo em `/recuperar-clave` passa a
disparar `GET /api/me` (a rota entra no `SessionBootstrap`), e usuário autenticado que abrir a URL é
redirecionado para `/`, porque herda o `LoginRoute`.

**Ponteiros:** `active_spec` passa a apontar a spec da emenda; `active_plan` volta a `null` até o
plano existir. O par de 2026-08-18 continua válido como spec e plano do bloco — a emenda substitui
só o desenho da superfície `/recuperar-clave`.

**Plano — 2026-08-19:** `plans/2026-08-19-login-recuperacao-inline.md`, 6 tasks. A ordem existe para
que **toda task deixe a árvore compilando**: o `ForgotPasswordPage` vira ponte de 13 linhas na Task 3
e só é apagado na Task 5, quando a rota muda de dono. Task 6 é o gate — catracas, prova de navegador
e fechamento do estado.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco identity-ativacao-acesso-redator`.
O `/revisar-sprint` permanece na fila, para depois da emenda executada.

### Execução da emenda — 2026-08-19: início, técnica `subagent-driven-development`

Abertura da execução do `plans/2026-08-19-login-recuperacao-inline.md` (6 tasks, executor
**claude** — o plano não declara `## Handoff de execução`, então o ciclo é o Superpowers normal).
**Técnica: `subagent-driven-development`, por instrução do João** — implementer por task, review de
task (spec + qualidade) depois de cada uma, review amplo no fim. O ledger local
(`.superpowers/sdd/progress.md`) ganha a seção da emenda; o do bloco de 2026-08-18 segue no mesmo
arquivo, acima.

**Área de trabalho: a mesma worktree `fix-frontend`**, branch `feat/identity-ativacao-acesso-redator`
a partir de `7c4704e`. O gate main tree/worktree não dispara: a emenda é **frontend puro** (spec §2),
nenhum arquivo de `backend/` é tocado, então não há Pint, migration nem `typescript:transform`.

Este commit abre a execução junto com a **Task 1** (`useAuthPanel`), que é a primeira fronteira
durável.

**Estado: `executing`.** Próxima ação: seguir o plano task a task.

### Emenda executada — 2026-08-19: as 6 tasks fechadas e o gate provado no navegador

As 6 tasks do `plans/2026-08-19-login-recuperacao-inline.md` estão commitadas, uma por commit:
`37e4c61` (`useAuthPanel`), `b7c6d98` (`password.forgotSubtitle` nos 3 dicionários), `186f07f`
(`ForgotForm` controlado por props), `c04c27a` (`AuthPanel`), `df8f5e0` (rotas irmãs e morte do
`ForgotPasswordPage`) e este commit (gate). Ledger com a prova task a task e os achados de review em
`.superpowers/sdd/progress.md`.

**Catracas (Task 6, Step 1):** `pnpm lint` exit 0 sem saída, `pnpm build` verde, `pnpm test`
**69 arquivos / 408 testes** — frontend puro, sem Pint, migration ou `typescript:transform`.

**A prova no navegador, contra a API real, com a stack do João intacta.** Override efêmero de portas
fora do repositório (nginx **8081**, MySQL **3308**, MinIO 9002/9003, Mailpit 8025) e Vite do worktree
em **5174**. Medido: em `/login`, e-mail digitado, clique em "Forgot your password?" leva a
`/recuperar-clave` **com o e-mail preservado no campo**, foco no `<h1>` e
`performance.getEntriesByType('navigation')` ainda com **uma** entrada — a premissa da emenda (rotas
irmãs reconciliam, não remontam) confirmada na tela e não só na leitura do `react-router`. O envio
entrega no Mailpit para e-mail existente, devolve **a mesma** mensagem genérica para e-mail que não
existe e **não** entrega — a anti-enumeração sobrevive à mudança de superfície. Voltar (browser back)
devolve o campo de senha; deep link direto em `/recuperar-clave` abre em recuperação **sem roubar o
foco** (`document.activeElement` = `BODY`); link de definição expirado cai em "This link no longer
works" e "Request a new link" aterrissa em `/recuperar-clave`; autenticado, `/recuperar-clave`
redireciona para `/` — os dois efeitos declarados na abertura da emenda, medidos.

**Dois desvios do plano, decididos pelo João durante a execução, não pelo executor.**

1. **`eslint-disable react-hooks/refs` escopado no `useAuthPanel`.** O código do próprio plano reprova
   na régua, e o molde da casa para "ajustar estado no render" (`useEntityForm.ts`) foi **medido e
   quebra a feature**: o setState descarta o primeiro render e `switched` chega `false`, matando o
   movimento de foco. O disable tem precedente (`AppDialog.tsx:24-36`) e comentário com a medição.
2. **O caminho de erro da recuperação entrou na Task 3.** O review de task apontou que
   `ForgotForm`/`useForgotPassword` não davam retorno nenhum de falha; medido em
   `git show b7c6d98:…/ForgotPasswordPage.tsx`, o buraco é **pré-existente** (veio em `9726eab`), não
   regressão da emenda. Consertado agora com o molde do `LoginForm` (`FormErrorBanner` +
   `aria-invalid`/`aria-describedby`) e teste do ramo de falha. **A spec foi emendada** (§5, §6 e a
   nova §6.1): `generalError` e `fieldErrors` são falha de transporte e não desmentem a resposta
   genérica.

**Uma lacuna do plano ficou registrada:** ele afirmava que `FRONTEND_URL` não precisaria mudar para a
prova de navegador, e precisou — `config/cors.php:22` deriva a origem permitida dela, e o Vite do
worktree corre na 5174. `backend/.env` e `frontend/.env.local` foram alterados para o gate e
**restaurados** ao fim; ao término só `fix-frontend-app-1` ficou de pé, como a sessão encontrou o
ambiente.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para
`identity-ativacao-acesso-redator`, cobrindo o bloco de 2026-08-18 **e** esta emenda. O review **não**
foi iniciado por este comando.

### Revisão de sprint e correções — 2026-08-19: 6 achados, os 6 aprovados e corrigidos

O `/revisar-sprint` cobriu o bloco de 2026-08-18 **e** a emenda, e devolveu **6 achados**, todos
aprovados pelo João e corrigidos em quatro commits, cada um com regressão provada contra o código
antigo. **O relatório da revisão não virou arquivo próprio** — o rastro dela é o resumo do
`review_findings_approved` no commit `929b1e6` e os quatro commits abaixo:

1. **Q-1 · reenvio de convite não dava acesso, só senha** (`1483fd1`) — a role `redator` só era
   atribuída no `CreateRedatorAction`, então o redator **anterior ao bloco** autenticava com
   `roles: []` e `permissions: []`, e o gate de cada seção é permissão, não `type`. O `syncRoles`
   (idempotente) subiu para o `SendRedatorAccessInvitationAction`, que é a fonte única dos dois
   caminhos.
2. **Q-2 · as rotas públicas de senha enumeravam usuário** (`e54ce42`) — `PasswordBroker::validateReset`
   resolve o usuário **antes** de checar o token, então `INVALID_USER` e `INVALID_TOKEN` com mensagens
   distintas faziam de qualquer token inventado um oráculo de "este e-mail tem conta"; os dois passam
   a subir a **mesma** mensagem.
3. **Q-3 · o convite de senha alcançava cliente e aluno** (`e54ce42`) — `sendResetLink` ganhou
   `'is_active' => true` (vira `where` no `EloquentUserProvider`): pela RN-01 esses atores não
   autenticam, e a rota anônima chegava a mandar "defina sua senha" para contato comercial de cliente.
   No mesmo commit, o `try/catch` + `report()` fecha o outro oráculo, o da falha: com SMTP fora do ar,
   e-mail existente estourava 500 e inexistente devolvia 200.
4. **Q-4 · falha que não nomeia campo ficava muda** (`389ac4f`) — 429, 419 e 500 não trazem `errors`,
   e o `SetPasswordPage` parava de girar sem dizer nada. `useSetPassword` passa a derivar
   `generalError` do `detail`, no mesmo molde do `useForgotPassword`, e a tela mostra o
   `FormErrorBanner`.
5. **Q-5 · recuperar a senha não derrubava as sessões vivas** (`e54ce42`) — `auth:sanctum` não
   reconsulta senha nem `is_active` a cada request, então quem já estava dentro continuava dentro
   depois do reset. O `PurgeOtherSessionsAction` entrou **na mesma transação** da troca de senha.
6. **Q-6 · o TTL dos dois brokers era afirmação de config, não comportamento** (`8a11889`) — o
   `InvitationBrokerTest` passou a envelhecer o token na tabela e medir os quatro cantos: convite de
   6 dias vale, convite vencido é recusado, recuperação de 59 minutos vale, recuperação de 1 hora é
   recusada. Com o `expire` trocado entre os brokers, o teste cai.

Catracas do passe de correção: `pnpm lint` limpo, `pnpm build` verde, `pnpm test` 409/409, backend
**710 passed / 5 skipped**.

### Fechamento — 2026-08-19: o acesso do redator provado ponta a ponta contra a API real

**Item 0 — critério de aceite do bloco.** Stack deste worktree nas portas padrão (nginx 8080, MySQL
3307, Mailpit 8025) — a do main tree estava desligada, então não houve override de portas. Tudo via
`curl` com `Origin: http://localhost:5173` **e** `Accept: application/json`, mais Chromium via
`@playwright/cli` para as duas provas de tela. Medido, nesta ordem:

1. **Reenvio de convite atribui a role e entrega a credencial (Q-1).** `juan.morales@lotus.cl`
   (redator anterior ao bloco) saiu de `roles=[]` para `roles=[redator]` no `POST
   /api/redatores/1/invitation` (204), e o e-mail chegou ao Mailpit com
   `/definir-clave/<token>?email=…&flow=invite` e "Este enlace vence en 7 días".
2. **Primeiro acesso completo.** `POST /api/invitation/accept` (204) definiu a senha; o `POST
   /api/login` seguinte devolveu `type: redator`, `roles: ["redator"]` e as **4** permissões da role
   (`operation.turma.view`, `operation.turma.submit_docs`, `feedback.feedback.view`,
   `feedback.feedback.manage`), e o `GET /api/me` confirmou a sessão.
3. **Anti-enumeração nas duas rotas (Q-2, Q-3).** `POST /api/password/forgot` devolveu **a mesma**
   mensagem genérica (200) para o e-mail que existe, para `no-existe-jamas@lotus.cl` e para o
   **cliente** `contacto@transelec.demo.cl`, com entrega no Mailpit **só** no primeiro. `POST
   /api/password/reset` com token falso devolveu resposta **idêntica byte a byte** (422,
   `errors.token`) para e-mail existente e inexistente.
4. **Recuperar derruba quem está dentro (Q-5).** Com a sessão do Juan viva (`sessions` = 1), o reset
   consumiu o token e devolveu 204; `sessions` foi a **0** e o cookie antigo passou a receber **401**
   no `GET /api/me`, no envelope RFC 7807.
5. **Revogação é controle explícito do admin.** `PUT /api/redatores/1` com `is_active: false` (200)
   levou `sessions` a 0, o cookie vivo a 401 e o login novo a **422 "Esta cuenta no está activa."**
6. **A emenda, no navegador.** Em `/login`, e-mail digitado, clique em "Forgot your password?": a URL
   virou `/recuperar-clave` com o e-mail **no campo**, `performance.getEntriesByType('navigation')`
   ainda com **uma** entrada (irmãs reconciliam, não remontam) e foco no `<h1>`.
7. **O caminho de erro mudo, na tela (Q-4).** Com a quota do `throttle:6,1` gasta por `curl`, o
   submit do `/definir-clave/<token falso>` recebeu **429** e a tela mostrou o alerta
   **"Too Many Attempts."** — antes do `389ac4f` não mostraria nada.
8. **RN-01 medida no fim:** `cliente` ativos = **0**, `aluno` ativos = **0**.

**Catracas:** backend `710 passed / 5 skipped (2601 assertions)`; `pnpm lint` exit 0 sem saída;
`pnpm build` verde; `pnpm test` **69 arquivos / 409 testes**; `pint --test` **passed** nos 29 arquivos
PHP do bloco; `typescript:transform` seguido de `git diff --exit-code` em `generated.ts` **sem saída**
(o arquivo veio do transformer em `644e372`, nunca de edição à mão).

**Leis do CLAUDE.md §5:** nenhuma contrariada. Sem Repository sobre Eloquent (o bloco é Actions);
zero trigger de banco na migration nova; `generated.ts` gerado; auth só por cookie de sessão Sanctum
com CSRF, e os erros subindo pelo handler global (o único `abort(` do domínio Identity está **dentro
de um comentário** que manda nunca usá-lo); RN-01 medida; nenhuma feature importando PrimeReact
direto nem outra feature; financeiro intocado.

**Ambiente devolvido — com um excesso declarado.** A sonda `gate.task14@lotus.cl` (user 58 / redator
8, sem curso, documento ou turma), criada pelo gate da Task 14 **deste** bloco, foi removida
(`users` 58 → 57, `redatores` 8 → 7), junto dos dois `password_reset_tokens` deixados pelos gates.
O Juan voltou ao estado pré-gate: ativo, sem role, com senha aleatória inutilizável. **O excesso:** ao
limpar as sessões do gate, a tabela `sessions` foi apagada inteira (13 linhas), não só as 2 que este
fechamento criou — o efeito é que qualquer sessão de dev anterior precisa logar de novo. Mailpit
esvaziado; os containers deste worktree ficaram parados, como a sessão encontrou a máquina.

**Pendências:** nasce a **P-47** (os 7 redatores do seed não têm a role `redator`; só cadastro novo e
reenvio de convite a atribuem — dado de seed, não código do bloco). **P-03** e **P-45** ganharam
medição nova e seguem abertas: a P-03 porque o compose por worktree continua não existindo — o que
existe é override manual de portas, e o gatilho formal (dois blocos de backend em paralelo) não
venceu, houve um só; a P-45 porque a suíte saiu **verde** só por o `.env` ter voltado a
`FRONTEND_URL` de valor único, com `TestCase.php:18` e `config/cors.php:22` intocados. Nenhuma
pendência fechou; as encerradas seguem vazias. Total: **30 abertas**.

**Estado: `idle`.** O backlog **não** promove nada sozinho: o próximo item é escolha explícita do
João.

## Antepenúltimo item fechado — 2026-08-18 (`arquivados-e-restauracao`, Próximos blocos item 1)

### Seleção — 2026-08-18

**Primeiro item de "Próximos blocos" (`backlog.md:101`), promovido explicitamente pelo João** com o
estado em `idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de
sempre — **décima segunda** vez (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`,
`celula-de-identidade`, `dashboard-backend-agregacoes`, `meu-perfil-backend-self-service`,
`dashboard-frontend-central-controle`, `dashboard-frontend-analitico-e-redator`): o argumento era
**linha do backlog** ("**Arquivados e restauração de soft-delete** adicionando o rastreio dos dados e
objetos soft-deletados e 'restaurados'"), não slug promovido.

**Três decisões dele fecharam o gate:** o slug `arquivados-e-restauracao`; a rota
**`context_required`**, porque o detalhe canônico é Notion H.5.1–H.5.4 e não vive no repositório; e
**main tree** como área de trabalho.

**A área de trabalho mudou durante a própria seleção, e o motivo fica registrado.** A escolha inicial
foi a worktree `fix-frontend`, onde a sessão rodava. A **P-03 proíbe worktree para bloco de backend**
em texto literal — *"o stack monta o main tree e o teste rodaria contra o código errado"* — e este
bloco toca backend. A medição da hora: stack `lotus` up montando `/projetos/lotus/backend`, portas
`8080`, `3307` e `9000-9001` ocupadas por ela; `docker compose` a partir de `fix-frontend` seria
projeto separado e colidiria nas mesmas portas, então provar backend de lá exigiria derrubar o stack
do main tree. Apresentado o conflito, **o João trocou para main tree**. O gatilho formal da P-03
(mais de um `active_work_item` de backend) **não venceu** — não há outro item ativo.

**A branch nasceu ANTES deste commit**, seguindo o precedente: `feat/arquivados-e-restauracao`,
criada de `main@b758068`. Este arquivo já é escrito na branch, não na `main`.

**`state_basis_commit` passa de `0a1918b` a `b758068`, e isso não é divergência.** Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse derivar. `b758068` é o merge
do fechamento do BD-16 na `main`, e `main == origin/main` na hora da promoção, árvore limpa exceto
`backend/config/cors.php`.

**Fonte externa declarada:** o backlog aponta Notion **H.5.1–H.5.4** como detalhe do bloco, com o
objetivo *"tornar o lifecycle de archive/restore explícito e seguro por agregado"*, a ordem
*semântica → Actions → endpoints → UI* e **`forceDelete` e exclusão permanente fora de escopo**. Não
há arquivo de escopo funcional no Drive citado para este bloco; se o packet não achar um, a fonte é
o Notion e a lacuna vira limitação declarada, não suposição.

**Seis medições da abertura, feitas sobre `b758068` e não herdadas:**

1. **15 models usam `SoftDeletes` hoje.** `Shared/Files/File`; `Commercial/{Budget, Client, Quote,
   ClientAddress, ClientContact}`; `Operation/{Enrollment, Turma}`; `Catalog/{Course, CourseModule,
   CourseCertificateTemplate}`; `Identity/{User, Student, Redator, StudentClientLog}`. **A superfície
   candidata do bloco é essa lista**, e decidir *quais* agregados ganham archive/restore é decisão de
   escopo — não se supõe que sejam os 15.
2. **A maioria dos agregados nem tem rota `DELETE`.** As 15 rotas `DELETE` existentes cobrem
   `turmas/{turma}`, `templates/{template}` e sub-recursos (addresses, contacts, photos, files,
   `turmas/{turma}/alunos/{enrollment}`, `turmas/{turma}/redatores/{redator}`,
   `redatores/{redator}/documents/{document}`). **`Client`, `Course`, `Budget`, `Quote`, `User`,
   `Redator` e `Student` não têm `destroy` exposto** — então "arquivar" nesses casos é **superfície
   nova**, não renomeação de rota existente.
3. **`restore()` já existe, mas implícito e sem intenção do usuário.** Só dois sítios:
   `Identity/Services/StudentResolver.php:72,78` (revive `User` e `Student` ao reencontrar o RUT) e
   `Operation/Actions/EnrollStudentAction.php:38` (revive matrícula soft-deletada ao re-matricular).
   **Tornar o restore explícito precisa decidir o que acontece com esses dois caminhos** — se
   continuam automáticos, se passam a exigir ação, ou se ficam como estão.
4. **`withTrashed()` é onipresente na leitura, e por desenho.** 20+ sítios, com comentário de motivo
   nos principais: relações de histórico (`Enrollment::turma()`, `Quote::budget()`), unicidade
   (`UserProvisioner`, `CreateQuoteAction`) e projeção do Dashboard (`AnalyticsQuery`, 6 sítios).
   **Isso é a favor do bloco:** o dado arquivado já é legível; o que falta é o lifecycle explícito.
5. **A auditoria já cobre o evento — `config/audit.php:59-63` audita `deleted` e `restored`.** Então
   o rastreio pedido no argumento do João **não parte do zero**: a trilha existe em `audits`; o que
   não existe é *superfície de consulta* dela. Se "rastreio" significa expor a trilha na UI, isso é
   decisão de escopo para o brainstorming, não implementação nova de auditoria — e a **lei 2** segue
   valendo (auditoria só na aplicação, nunca em trigger de banco).
6. **Zero UI de arquivado ou restauração no frontend.** `grep -riE "arquivad|restaur"` em
   `frontend/src` retorna **nenhuma ocorrência**; os únicos hits de `inativ` são
   `shared/api/axios.ts`, `useLoginForm.ts` e um teste de filtro. **Toda a camada de UI do bloco é
   superfície nova.**

**Autorização é lacuna medida, não detalhe de implementação.** Os cinco diretórios
`app/Domains/*/Policies/` **estão vazios** — não há Policy nenhuma no projeto, e nenhuma permissão
`*.delete` / `*.restore` no `RolePermissionSeeder`. "Seguro por agregado", que é o objetivo do bloco
no backlog, **exige decidir o mecanismo de autorização** — permissão do spatie por agregado, Policy
nova, ou ambos. Isso toca ADR-07 e é assunto do brainstorming, não do packet.

**Interseção anotada no próprio backlog (`backlog.md:430`):** o manual em PDF/DOCX pré-preenchido é
apontado como interseção com "Arquivados e restauração". Verificar no planejamento se ela vence
agora ou segue no bloco de origem.

**Risco de review projetado: MÉDIO-ALTO pelo gate binário** — o bloco **toca schema em potencial**
(se algum agregado precisar de coluna própria de arquivamento além de `deleted_at`), **toca
autorização** (superfície inexistente hoje) e **toca dado com peso legal** (certificados, documentos
de redator e matrículas estão entre os agregados soft-deletáveis). A classificação final é do
`/revisar-sprint`, não desta promoção; toca schema → o planejamento lê `docs/adrs.md` e
`docs/der-fisico.md`.

**`backend/config/cors.php` está modificado no working tree e não é deste bloco** (WIP do João, o
outro lado da P-45). Fica fora de todo `git add`; os commits usam paths exatos.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/arquivados-e-restauracao` a partir de `main@b758068`.

### Context Packet — 2026-08-18: gerado, contrato válido, veredito `blocked`

**O Codex rodou read-only e o packet passou na validação de contrato:** markers exatos, frontmatter
completo, 8 key facts (teto é 8), fontes endereçadas por ID e `RECOMMENDED_TRANSITION` presente.
Nenhuma re-invocação foi necessária. Packet salvo em
`context-packets/2026-08-18-arquivados-e-restauracao.md`.

**Seis artefatos externos, um a mais que o teto de cinco, e a exceção está justificada no packet:**
as quatro páginas Notion do bloco (H.5.1–H.5.4), a pasta canônica do Drive
(`1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3`) e a **H.3.1**, consultada porque a H.5.3 a declara dependência
e autorização é fato bloqueante. A H.3.1 cobre ownership e 403/404 — **não define papéis.**

**O que as fontes DECIDEM, e isso é ganho real do packet:**

1. **A superfície é de 8 aggregate roots em 6 grupos, não os 15 models soft-deletáveis:** `Client`,
   `Redator`, `Student`, `Course`, `Budget`/`Quote` e `Turma`/`Enrollment`. Os demais models
   soft-deletáveis são filhos ou infra até a matriz decidir o contrário. **Isso corrige a medição 1
   da seleção**, que tratava os 15 como candidatos.
2. **"Arquivado" NÃO é estado novo.** É o nome de usuário do soft-delete restaurável que já existe —
   `deleted_at` não ganha companhia. **Consequência de schema: o bloco pode não tocar migration
   nenhuma**, o que derruba metade do risco projetado na seleção.
3. **Endpoints por domínio, com `onlyTrashed`/restore por root e módulo.** Proibido endpoint global
   genérico que apague a diferença entre agregados.
4. **A UI mínima é uma visão de Arquivados** com alternância, restauração, feedback e invalidação da
   lista ativa. **Badge na listagem ativa não é exigido pela fonte** — se entrar, entra por decisão,
   não por requisito.
5. **Linguagem de exclusão irreversível sai da UI.** Confirmação de soft-delete não pode afirmar que
   é permanente, e exclusão permanente não aparece em tela.

**O que as fontes EXIGEM mas NÃO registram — e é por isso que o veredito é `blocked`.** A H.5.1 pede
uma matriz por agregado e não a contém; a H.5.3 diz "autorização equivalente ao módulo" e a
dependência que deveria detalhar isso só fala de ownership. **Cinco fatos de negócio faltam, e a
regra do skill é explícita: falta de decisão sobre regra de negócio bloqueia; falta de fonte não.**
Estão enumerados no `blocker` do frontmatter e nas Open questions do packet.

**A pasta do Drive estava disponível e foi consultada — não há documento funcional deste bloco
lá.** Isso não é fonte indisponível, é ausência medida: as buscas direcionadas só acharam material
genérico de arquitetura e entidades. Por isso o packet é `blocked` e não `partial`.

**A interseção da `backlog.md:430` (manual PDF/DOCX pré-preenchido) segue sem decisão externa** —
nenhuma das quatro páginas nem o Drive a mencionam. Vira pergunta ao João, não suposição.

**Estado: `blocked`, `resume_state: ready_for_planning`.** A recuperação externa está feita e não se
repete; o que falta são cinco decisões do João. Respondidas, o bloco volta a `ready_for_planning` e
o brainstorming começa com elas como entrada.

### Brainstorming e spec — 2026-08-18: o bloqueio caiu, e a medição derrubou duas afirmações minhas

**O João destravou mandando o brainstorming absorver as cinco perguntas**, em vez de respondê-las
soltas. Estado vai de `blocked` direto a `planning` — a fronteira durável é esta spec, e ela entra
no mesmo commit.

**Duas correções à medição da própria seleção, ambas minhas e ambas medidas:**

1. **"A maioria dos agregados nem tem rota `DELETE`" estava errado.** O grep de `Route::delete` não
   enxerga `apiResource`. `route:list --method=DELETE` devolve 21 rotas, e **sete dos oito roots já
   têm `destroy`** — só `Student` não tem. A superfície nova do bloco é menor do que a promoção
   projetou.
2. **A cascata de arquivamento já existe, e é boa.** Hooks `deleting` instância a instância em
   `Client`, `Budget`, `Course`, `Redator`, `Student` e `Role`; `DeleteClientAction` com transação e
   `lockForWrite`; gates de negócio escritos (`DeleteTurmaAction` recusa turma concluída, RN-15;
   `DeleteBudgetAction` recusa orçamento com cotação aprovada). O código **já chama a operação de
   "Arquiva"**. O bloco não é archive/restore: é **o lado do restore**, que não existe.

**As cinco decisões do João, todas tomadas:**

1. **Escopo: `Client` + `Course`**, fatia vertical. Cobrem toda a dificuldade — `Client` com três
   relações heterogêneas e filhos com rota própria, `Course` com cascata simples e zero gate.
2. **Cascata de restore por coluna marcadora** (`archived_with_parent` em 5 tabelas). Casar pai e
   filho por `deleted_at` foi **medido e descartado**: a coluna é `timestamp` de precisão 0 nas sete
   tabelas, e segundo inteiro não é identidade.
3. **Permissão `*.restore` nova por agregado**, admin e superadmin, fora de `SEGREGATED`; a lista de
   arquivados abre com a `*.view` do módulo.
4. **Rastreio = data + autor na lista**, lido da última audit `deleted`. É o **primeiro caminho de
   leitura de `audits` do projeto** — a tabela era write-only, com 16 models `Auditable`.
5. **Alternância na própria tabela**, não aba: `CommercialPage` tem abas e `CatalogPage` não.

**A quinta pergunta do packet caiu sem decisão nova.** A interseção do manual PDF/DOCX é com a
**FUT-1** e trata de documento de **turma**; com o escopo em `Client` + `Course` ela sai por
construção.

**Um achado do brainstorming ampliou o bloco, e o motivo é DoD, não escopo criativo:** `useRemove`
de `createCrudResource.ts:46` tem **zero consumidores** e nem `ClientsTable` nem `CoursesTable` têm
botão de excluir. Os endpoints `DELETE /clients/{client}` e `/courses/{course}` existem e são
**inalcançáveis pela UI**. Sem o botão de arquivar, a visão de Arquivados listaria registros que
ninguém produz pelo app e o DoD só seria demonstrável semeando o banco. **Arquivar entrou** (D9).

**Um débito NÃO foi corrigido, de propósito:** `budget.confirmDeleteBody` e
`quote.confirmDeleteBody` seguem dizendo *"Esta acción no se puede deshacer."* Para orçamento e
cotação isso é **verdade hoje** — o restore deles não existe. Trocar a frase antes do restore
substituiria um texto certo por um errado. Gatilho no bloco que trouxer `Budget`/`Quote`.

**O bloco não escreve `ValidationException` nova** — registro ativo no restore dá 404, não 422. Isso
o mantém fora da **D-07**, o débito de idioma canônico travado em decisão.

**Risco reavaliado: de MÉDIO-ALTO para MÉDIO.** A D1 derruba a metade de schema que a promoção
temia — `arquivado` é o `deleted_at` existente, sem estado novo. Sobra que o bloco **toca `users`**
(coluna marcadora), abre o primeiro caminho de leitura de `audits` e tira `useRemove` de zero
consumidores. Classificação final é do `/revisar-sprint`.

### Plano — 2026-08-18: 11 tasks, executor Claude, e o plano corrigiu um mecanismo da própria spec

**11 tasks, executor `claude`.** Seis de backend, quatro de frontend e uma de DoD. Cada uma fecha com
teste próprio; nenhuma depende de julgamento fora do plano, mas o conjunto toca lei demais para ir
ao Codex — ver o Handoff no fim do plano.

**O plano derrubou um mecanismo que a spec tinha escrito errado.** A spec (D2/D3) manda hook
**`restoring`**; o plano usa **`restored`**. Com `restoring`, os filhos voltariam a ativos enquanto o
**pai ainda está arquivado**. O par correto é `deleting` (antes) / `restored` (depois): os filhos
saem antes do pai e voltam depois dele. Nada mais da spec mudou.

**Uma medição obrigou um passo que a spec não previa: `Client::lockForWrite()` RECUSA cliente
arquivado.** Ele lança `ValidationException` quando `trashed()` — comportamento certo para escrita,
e exatamente o estado de quem vai ser restaurado. A Task 2 extrai `Client::lockRow()` (trava sem
julgar) e reescreve `lockForWrite` sobre ela, preservando a guarda. **É mutex com história de review
(Q-2, Q-5) e não quebra teste em sqlite** — `SQLiteGrammar::compileLock()` devolve string vazia —,
então errar ali só apareceria em produção. Está declarado no Handoff.

**Como a marca é gravada, e por que não polui a trilha.** `SoftDeletes::runSoftDelete()` só persiste
`deleted_at`/`updated_at`, então um atributo sujo **não chega ao banco pelo `delete()`**. O plano usa
`saveQuietly()` antes do `delete()`: grava a marca sem emitir evento, e por isso não cria um
`updated` por filho na trilha. O evento que importa — `deleted` — continua auditado normalmente
(ADR-08).

**`MAX(id)` e não `MAX(created_at)` no `ArchiveTrailQuery`:** `audits.created_at` é `timestamp` de
segundo inteiro, e dois `deleted` no mesmo segundo empatariam. O id é monotônico. É a mesma classe de
erro que a D2 evita na cascata.

**Três correções da auto-revisão do plano contra a spec, aplicadas inline:** um `actions={...}`
placeholder na Task 9 (substituído pelo bloco real da `CommercialPage`), a assinatura do
`ArchiveSwitch` escrita com três props na linha `Produces` quando são duas, e uma condicional
inútil na Task 6 — `Course::query()->withListingData()` existe e é o que o `index` já usa. Uma
quarta: `RestoreCourseAction` devolvia o curso sem `loadListingData()`, o que faria `CourseData`
montar sem a carga da projeção.

**Um item da spec estava sem task e ganhou uma.** O §5 pede que o restore invalide as **duas**
listas; o teste do `useArchivedPage` usa fake estrutural e não exercita isso. Entrou
`createCrudResource.test.ts`, que prova pelo **prefixo das chaves** que
`invalidateQueries({ queryKey: keys.all })` alcança tanto `[resource, 'list']` quanto
`[resource, 'archived']` — sem TanStack no teste, mantendo o padrão do repositório.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco arquivados-e-restauracao`.

### Execução — 2026-08-18: início, técnica `executing-plans`

**Main tree**, conforme a decisão do João na seleção e a P-03. Técnica `executing-plans` e não
`subagent-driven-development`: a sessão está sob restrição de AgentTool, e o precedente dos dois
últimos blocos é o mesmo.

**O fixture da Task 1 do plano não batia com o schema e foi corrigido na escrita do teste.** O plano
escreve `modules()->create(['name' => …, 'order' => 1])` — a coluna é `sort_order` — e
`certificateTemplates()->create(['version' => 2, 'body' => …])`, mas `version` está **fora do
`$fillable`** por decisão registrada (D10 do bloco de templates) e `body` não é coluna. O teste usa
`sort_order` e o helper `Tests\Support\CreatesCertificateTemplates::makeTemplate()`, que existe
exatamente para esse caso. Nenhum comportamento sob teste mudou.

**Task 1 verde e a suíte inteira medida nos dois sentidos.** `ArchiveCascadeMarkTest` passa com 3
testes / 8 asserções. `php artisan test` dá **12 failed / 675 passed / 5 skipped**; com
`FRONTEND_URL=http://localhost:5173`, **687 passed / 5 skipped / zero falha**. As 12 são a **P-45**
pelo terceiro fechamento seguido — `Session store not set on request.` no `.env` multi-origin —, não
regressão desta task.

### DoD end-to-end — 2026-08-18 (Task 11): provado no navegador, com dois defeitos de ambiente achados no caminho

**Ferramentas antes do navegador.** Backend `710 passed / 5 skipped` (2616 asserções) com
`FRONTEND_URL=http://localhost:5173`; sem a variável a P-45 continua devolvendo as mesmas 12 falhas
de sessão, que não são deste bloco. Frontend `376 passed` em 62 arquivos, `pnpm lint` e `pnpm build`
exit 0. O `typescript-transformer-manifest.json` estava sujo desde a Task 6 (o hash do `generated.ts`
mudou e o manifesto não entrou naquele commit) — corrigido em commit próprio antes da prova.

**O que só o navegador achou: o banco de dev não tinha nem a migration nem as permissões.** A suíte
roda em sqlite `:memory:` e migra do zero a cada execução, então verde na suíte não diz nada sobre o
MySQL de desenvolvimento. Ao arquivar o cliente pela tela, o `DELETE /api/clients/13` voltou **500**
com `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'archived_with_parent' in 'field list'`;
depois de `php artisan migrate`, o arquivamento passou, mas a lista de Arquivados abriu **sem botão
Restaurar para o superadmin** — `commercial.client.restore` e `catalog.course.restore` existiam no
`PermissionCatalog` e não no banco, porque o `RolePermissionSeeder` nunca foi re-executado.
`db:seed --class=RolePermissionSeeder` resolveu. Nenhum dos dois é defeito de código do bloco; ambos
são exatamente a classe de falha que a lei §8 existe para pegar — build verde não é DoD.

**Roteiro do cliente (Steps 3 e 7), provado ponta a ponta em `E2E Gate Client D` (id 13).** Arquivar
um contato "pela ficha" tem uma mecânica que o plano não previa: o `UpdateClientAction` faz *replace*
dos nested, então remover o contato no dialog e salvar soft-deleta a coleção inteira e recria os
sobreviventes (contatos 33 e 34 arquivados, contato 39 recriado vivo). O efeito exigido pelo roteiro
— filho arquivado ANTES da cascata, portanto com `archived_with_parent = false` — foi obtido do mesmo
jeito, e é justamente o que a spec D2 distingue. Sequência medida: `DELETE /api/clients/13` **204**;
o cliente sai da lista ativa ("No results"); em **Arquivados** ele aparece com `ARCHIVED ON 8/18/2026`
e `ARCHIVED BY Andreoli` — primeira leitura de `audits` chegando à tela; `POST /api/clients/13/restore`
**200**; e o estado do banco volta idêntico ao de antes: endereço 25 e contato 39 vivos, contatos
31–34 e endereços 19–21 (pré-arquivados) **continuam arquivados**, marca `archived_with_parent` de
volta em `false` em todos. A ficha reaberta mostra o endereço e só o contato vivo — "Joao Andreoli",
arquivado antes da cascata, **não voltou**.

**Step 4 (403), provado nas duas camadas.** Usuário temporário `dod.viewonly@lotus.cl` sem role e com
`commercial.client.view` avulsa: `/comercial` abre, o switch alterna, `GET /api/clients/archived`
volta **200** com as quatro linhas e **nenhum botão Restaurar renderiza**. O mesmo usuário em
`POST /api/clients/1/restore` recebe **403** RFC 7807 (`"detail": "User does not have the right
permissions."`). O usuário foi apagado com `forceDelete()` ao fim da prova; o banco de dev não ficou
com resíduo.

**Gêmeo do Catálogo, provado com verificação imediata no banco.** `DELETE /api/courses/3` **204**
marca `archived_with_parent = 1` e arquiva os módulos 6–8; `POST /api/courses/3/restore` **200**
devolve os três e zera a marca. A primeira tentativa (curso 1) foi descartada porque a auditoria
mostrou um `restored` do curso 1 e um `deleted` do curso 8 **entre os meus comandos** — outra sessão
mexendo no mesmo banco de dev. Nada a corrigir no código; o curso 8 (`GATE T7`) permanece arquivado
por mão alheia e foi deixado como está.

**Observação registrada, não corrigida:** na lista de Arquivados as colunas COMMUNE e CONTACTS
aparecem como `—` e `0`, porque o listing lê endereço e contatos ativos e a cascata acabou de
arquivá-los. É consequência coerente do desenho (a listagem não olha `onlyTrashed`), mas empobrece a
linha justamente onde ela precisa identificar o registro. Fica como achado para o review decidir.

**Ambiente durante a prova:** o Docker Desktop caiu no meio da sessão (daemon fora, stack inteira
parada) e o Vite junto; ambos foram religados e a prova refeita do início. Nenhum dado do bloco
dependeu do que rodou antes da queda.

### Review — 2026-08-18: `/revisar-sprint`, risco ALTO, duas lentes, 7 achados (2 🔴)

Risco ALTO pelo gabarito: o bloco tocou migration, `users`, `generated.ts` e RBAC. Então além da
revisão Claude rodou a segunda lente do **Codex** (`read-only`, mesmo intervalo `main...HEAD`).

**Achados aprovados pelo João — todos os sete — e corrigidos:**

**Q-1 🔴 — a cascata levava embora o `User` que já estava arquivado.** `addresses()` e `contacts()`
escondem o filho arquivado pelo escopo global, mas `Client::user()` é `belongsTo(...)->withTrashed()`
— então o `User` arquivado de propósito ANTES do pai entrava na cascata, ganhava
`archived_with_parent = true`, tinha o `deleted_at` reescrito pelo `delete()` e **voltava junto no
restore**. É exatamente o modo de falha que a spec D2 existe para impedir, na única relação que
escapava dela. Convergiu com a segunda lente do Codex. Provado por teste antes de corrigir
(`user arquivado antes do cliente nao volta na cascata`) e por mutação depois.

**Q-4 🟡 — os helpers da cascata estavam duplicados**, idênticos, em `Client` e `Course`, com mais
seis roots previstos para replicá-los. As duas correções viraram uma só: nasceu
`App\Shared\Concerns\ArchivesChildren`, e a guarda do Q-1 (`if ($child->trashed()) return;`) mora
lá dentro, num lugar só — com os helpers copiados, o defeito teria de ser corrigido em oito arquivos.

**Q-2 🔴 — arquivar e restaurar não davam retorno nenhum.** Nem sucesso nem erro: as chaves
`archive.archivedToast` e `archive.restoredToast` estavam nos três locales com zero consumidor
(i18n órfão), e um 403 de quem não tem `*.restore` não mudava nada na tela. `useArchivedPage` passou
a aceitar `RestoreOptions`, os hooks de feature ganharam `useToast` nos dois sentidos, e o `busy`
desce até os botões da linha (clique duplo disparava dois POSTs). `problemMessage` subiu de
`useTurmaDocsSection` para `shared/api/` — o segundo consumidor nasceria como cópia, e feature não
importa de feature (lei §6). Convergiu com o Codex.

**Q-3 🟡 — o achatamento adivinhava o agregado** com `Object.values(resto)[0]`, contrato refém da
contagem e da ordem das chaves do DTO, com o cast calando o `tsc`. Agora o seletor é explícito
(`(row) => row.client`). O teste novo prova o caso que quebrava em silêncio: DTO com um campo a mais.

**Q-5 🟡 — `CourseController::destroy` cascateava sem transação**, assimétrico ao `Client` e à
própria `RestoreCourseAction`. Código pré-existente, mas foi este bloco que lhe deu o primeiro
consumidor de UI (D9) e tornou a janela alcançável. Nasceu `ArchiveCourseAction`; o teste prova o
ROLLBACK — falha no meio da cascata não pode deixar template arquivado sob curso ativo.

**Q-6 🟢 — `POST /api/clients/abc/restore` dava 500**, não 404: `int $client` estoura `TypeError`
antes de qualquer consulta. `->whereNumber()` nas duas rotas de restore.

**Q-7 🟢 — a migration não tem backfill e não há como ter.** Documentado no docblock e registrado
como **D-37** no `backlog.md`, com gatilho no primeiro deploy. Casar por `deleted_at` é o que a spec
D2 recusou; marcar todo filho arquivado ressuscitaria o que alguém arquivou de propósito.

**Prova por mutação, nos dois lados:** desfeitas a guarda do trait, a transação da Action e o
`whereNumber`, os três testes novos de backend reprovam (`3 failed`); desfeitos o seletor explícito
e o repasse de `RestoreOptions`, os dois testes novos de frontend reprovam, um de cada vez.

**Divergência entre as lentes, mostrada e não resolvida em silêncio:** o Codex apontou
`RestoreCourseAction` sem lock e `useArchivedPage` apagando a lista em cima de cache quando o refetch
falha. Os dois foram **rejeitados** — o primeiro é decisão registrada na spec D3 e no docblock da
Action; o segundo é literalmente o código de `useCrudPage.ts:48`, padrão vigente do projeto. O João
não contestou a rejeição.

**Um defeito de ambiente achado no gate, e ele não é do bloco:** a suíte completa devolveu
**12 failed** em `AuthTest`/`LoginLogTest`/`ProfilePasswordTest`, todas com
`RuntimeException: Session store not set on request`. Medido em árvore limpa (`git stash -u`, sem
uma linha do review): **falha igual em HEAD**. A causa é o `.env` local — `FRONTEND_URL` virou
`http://localhost:5173,http://localhost:5174` (dois dev servers), e `TestCase::setUp` mandava a
string inteira como `Referer`, produzindo host inválido e request não-stateful. Provado nos dois
sentidos: com uma URL só, `12 passed`. Corrigido no `TestCase`, que agora usa a **primeira** origem
da lista — a mesma leitura que `config/cors.php` passou a fazer com `explode(',')`.

**Q-8 — herdado da nota do DoD, aprovado pelo João e corrigido.** Na lista de Arquivados as colunas
COMMUNE e CONTACTS mostravam `—` e `0`: `withListingData()` lê endereço e contato ATIVOS e a cascata
acabou de arquivá-los, então o eager load vinha vazio pelo global scope de `SoftDeletes`. A linha
negava o registro justamente onde o operador precisa reconhecê-lo antes de restaurar.

A correção tem home própria — `App\Shared\Concerns\LoadsCascadedChildren`, o gêmeo de LEITURA do
`ArchivesChildren`, pela mesma razão do Q-4: os outros seis aggregate roots replicam o padrão, e o
filtro copiado teria de ser corrigido em oito arquivos. `asOfArchiving()` carrega a coleção como ela
estava no instante do arquivamento — filho ATIVO **ou** com `archived_with_parent = true` —, e
`ClientQueryBuilder`/`CourseQueryBuilder` ganharam `withArchivedListingData()`, que os dois
controllers usam só na rota `archived`. O `LISTING` da tela ativa não mudou.

O filho arquivado de propósito ANTES do pai continua fora, e isso é regra, não detalhe: ele não volta
no restore (spec D2), então mostrá-lo aqui prometeria uma restauração que não acontece. O curso
entrou junto porque o payload do arquivado tinha o mesmo defeito em `templates`/`modules`, ainda que
a tabela dele não exiba as colunas — deixar só o cliente corrigido é o assimétrico que o Q-4 pune.

Quatro testes novos, dois por entidade (mostra o que a cascata levou / não mostra o que veio antes),
provados por **duas** mutações: trocar `withArchivedListingData()` de volta por `withListingData()`
reprova os 4; tirar o filtro da marca e deixar só `withTrashed()` reprova exatamente os 2 do
contorno (`2 failed, 14 passed`).

**Gate após as correções:** backend **717 passed / 5 skipped** (2636 asserções) · `pnpm test`
**378 passed** · `pnpm lint` 0 · `pnpm build` exit 0 · `typescript:transform` re-rodado **sem drift**
· Pint `passed` em todos os `.php` do bloco. A única reprovação de Pint é `config/cors.php`, que é
alteração local do João ainda não commitada. O Q-8 não mexeu em DTO nem em frontend: o contrato da
resposta é o mesmo `ClientData`/`CourseData`, só deixou de vir vazio.

**Review encerrada sem achado pendente.** Falta a prova no navegador do toast e do `busy` do Q-2 e
da comuna/contatos do Q-8 — isso é do `/fechar-sprint`, não do review.

### Fechamento — 2026-08-18: o critério de aceite provado contra a API real e em Chromium, e a P-45 encerrada

**O item 0 do gate não aceita suíte verde no lugar da prova**, então o bloco foi exercido duas
vezes fora do teste: contra a API em `:8080` (MySQL real, não o sqlite `:memory:` da suíte) e no
navegador.

**Contra a API real, o roteiro inteiro da spec D2 num cliente novo:** dois contatos e um endereço,
`DELETE /api/contacts/{id}` num deles, `DELETE /api/clients/{id}`, e a lista de arquivados devolveu
`COMMUNE: Providencia` e `CONTACTS: 1 ['Vivo']` — o contato arquivado antes do pai **fora da
lista**, que é a metade que a Q-8 existe para não estragar. Depois do restore, `['Vivo']` e um
endereço de volta, e o contato de antes ainda arquivado. `POST /api/clients/abc/restore` deu **404**
(Q-6). O gêmeo do curso passou pelo mesmo caminho, com a coleção replace-total no lugar do delete
nested: `MODULES: ['Modulo Vivo']` na lista e no pós-restore.

**No navegador, o que só a tela responde.** Arquivar a Transelec pela lista ativa e alternar para
Arquivados mostrou `Providencia` e `3` — as duas colunas que o review encontrou vazias —, com data e
`Andreoli` em "Arquivado por". A Enel repetiu com `Santiago` e `1`. O toast apareceu nos dois
sentidos, com o texto do i18n: **`Record archived.`** e **`Record restored.`**; e os botões de
Restaurar foram lidos `disabled` com a mutação em voo, que é o `busy` da Q-2 — medido por polling
dentro da página, não por inspeção depois do fato. O ramo de ERRO do toast (403 de quem não tem
`commercial.client.restore`) segue provado só pelo teste de unidade do `useArchivedPage`; montar o
papel reduzido no banco de dev sairia mais caro que o risco que cobre.

**Zero resíduo no banco de dev.** Os registros de sonda (3 clientes `E2E Q8 Ltda`, 2 cursos
`E2E Q8 Curso`, filhos e usuários) foram removidos com `forceDelete` no mesmo gate, conferidos em 0.
As duas linhas antigas `E2E Gate Client A/B` — sondas de gates anteriores, da **P-44** — foram
restauradas sem querer durante a condução do navegador e **rearquivadas** no mesmo passo, de volta
ao estado em que estavam.

**Gate:** backend **717 passed / 5 skipped** (2636 asserções) · `pnpm test` **62 arquivos / 378
testes** · `pnpm lint` 0 · `pnpm build` exit 0 · Pint `passed` em todos os `.php` do bloco ·
`typescript:transform` sem drift em `generated.ts`. A única reprovação de Pint da árvore continua
sendo `backend/config/cors.php`, alteração local do João.

**A P-45 fecha aqui, pelo gatilho literal.** A ficha previa "o commit que ligar multi-origin **ou** o
próximo `/fechar-sprint` que encontrar a suíte vermelha por este motivo" — o segundo ramo venceu
pela terceira vez, e desta vez o bloco é de backend, então não havia por que não abrir o arquivo.
`TestCase.php` passou a tratar `FRONTEND_URL` como a lista que ela é. A **P-36** e a **P-37**
cumpriram a sprint de rastro e saíram das encerradas.

**Fica registrada a D-37** no `backlog.md` (nasceu como `D-34` e foi renumerada no merge da `main`, que já publicara um D-34): `archived_with_parent` nasceu sem backfill e não há como
recuperá-lo — qualquer agregado arquivado antes de 2026-08-18 restaura o pai sem os filhos. O item 1
de "Próximos blocos" foi reescrito para o que sobra: replicar o padrão nos seis roots restantes,
com o molde apontando para a spec arquivada.
## Quarto item fechado — 2026-08-18 (`bd13-listagens-e-abas`, BD-13 do backlog)

**Promoção explícita do João**, com o estado em `idle` e `active_work_item` `null`. O gate do
`/planejar-bloco` não chegou a rodar: a seleção veio de uma revisão de arquitetura
(`improve-codebase-architecture`) que cruzou o código de `b758068` contra o `backlog.md` item a item.
O commit anterior a este grava o resultado dessa revisão no backlog; **este** grava a promoção.

**Escopo: o BD-13 inteiro, mais a D-31 pelo gatilho dela.** O bloco cobre D-02, D-04, D-05 e D-06;
a **D-31** entra porque o gatilho literal dela é *"entra em qualquer bloco que toque os dicionários
por outro motivo"*, e a D-02 toca os três locales. Não é alargamento de escopo — é gatilho vencido.

**Rota `ready_for_planning`, sem Context Packet, por ausência MEDIDA de fonte externa.** Grep por
`drive.google`, `notion.so`, `figma.com`, `docs.google` e `http` nas 100 linhas de escopo (o bloco no
`backlog.md` mais as fichas de D-02, D-04, D-05, D-06 e D-31) devolve **zero**. Mesmo precedente de
BD-4, BD-5, BD-6 e BD-16 — e o oposto das Sprints 5 e 6, cujo escopo era canônico do Drive.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd13-listagens-e-abas` a partir de
`main@b758068`, que é `origin/main` na hora da promoção. Escolha do João. A árvore da worktree estava
em `b758068` detached e limpa; `backend/config/cors.php` (WIP dele, o outro lado da P-45) fica no main
tree e fora de todo `git add`.

### A invariante de um `active_work_item` está quebrada, e é a QUARTA exceção declarada

O `arquivados-e-restauracao` foi promovido a `context_required` em `34aa0be`, na branch
`feat/arquivados-e-restauracao`, e segue ativo com `next_owner: codex`. Este bloco corre em paralelo
**por decisão explícita do João**, tomada depois de o custo ser mostrado, não descoberto no gate.
Precedentes: BD-4 × BD-9, BD-5 × `login-fora-do-adr16` e `celula-de-identidade` × BD-6.

**A P-03 não dispara, e isso é medição do gatilho, não conveniência.** A ficha exige *"mais de um
`active_work_item` de backend"*; este é frontend puro e o outro é backend, então a condição não se
satisfaz. O custo conhecido do arranjo continua valendo: a worktree não sobe stack própria e depende
do main tree como servidor do `:8080` — que estará servindo a branch do `arquivados`. Para este bloco
isso é barato, porque nenhum item dele precisa de API viva; o que precisa de navegador é a D-04
(contagem de GET) e ela se mede no devtools contra qualquer backend.

**O risco de merge deste arranjo está medido e é o que o PR #57 já cobrou.** Duas branches escrevendo
`state.md` produzem frontmatter auto-mesclado que ninguém escreveu, e ele fica verde, sem marcador de
conflito. Quem mergear qualquer uma das duas **lê o frontmatter antes do `git push`** — a lição está
escrita na seção do B2 e vale literal aqui.

### Quatro medições da abertura, feitas sobre `b758068` e não herdadas do backlog

1. **O escopo da D-04 é METADE do registrado, e isso muda o DoD do bloco.** `AppTabView` não passa
   `renderActiveOnly={false}`, então vale o default `true` do PrimeReact e só o conteúdo da aba ativa
   monta — `CertificatesPage.tsx:19,24` põe `EmissionPanel` e `HistorialTable` dentro de `ModuleTab` e
   faz **1** GET. Quem faz 2 é a `PeoplePage.tsx:16-17`, que chama `useRedatoresPage()` e
   `useStudentsPage()` **no corpo da página**, acima das abas, onde o `renderActiveOnly` não alcança.
   O defeito é de sítio de chamada, não de mecanismo de aba. **O DoD do backlog ("1 GET por aba
   aberta, não 2 por montagem") tem uma página a provar, não duas.**
2. **A D-05 tem uma decisão dentro, não só um fix.** `AppErrorState.tsx:47` renderiza o `detail` cru
   e `useLoadState.ts:25` é quem o entrega (`query.error?.detail`). Mostrar `detail` de servidor ×
   trocar por dica genérica do i18n é escolha de contrato de erro, e ela **não** depende da decisão de
   idioma canônico que trava a D-07/D-18 — o que se decide aqui é se a tela repete o servidor, não em
   que língua o servidor fala.
3. **A D-06 é uma linha e mente sobre registro de peso legal.** `HistorialTable.tsx:60` passa
   `description={c.snapshot.aluno.rut ?? '—'}` e `title={c.snapshot.aluno.name}` **sem fallback**: o
   certificado corrompido aparece na lista com a célula de aluno vazia, e a lista é o único lugar onde
   o registro aparece antes do clique.
4. **A D-02 segue viva nas três locales, nas mesmas linhas do registro:** `:91` (`usuario(s)`), `:449`
   (`curso(s)`) e `:471` (`módulo(s)`), com o rodapé do `AppDataTable` alimentado por chave sem plural
   do i18next. O repositório **não** usa plural do i18next em lugar nenhum hoje — `role.count` é forma
   única —, então a chave de plural é padrão novo no projeto, não adoção de padrão existente.

**Risco de review projetado: BAIXO pelo gate binário** — frontend puro, não toca schema, não regenera
`generated.ts`, não toca Sanctum, auditoria, RBAC nem documento legal. **Divergência por alcance já
declarada:** o bloco introduz plural do i18next, que é forma nova nos três dicionários, e mexe em
`AppErrorState`/`useLoadState`, que são `shared/` com muitos consumidores. A classificação final é do
`/revisar-sprint`, não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco bd13-listagens-e-abas`
(brainstorming → spec → plano). Este commit **não** inicia o planejamento.

### Execução — 2026-08-18: início, técnica `executing-plans`

O `/planejar-bloco` fechou spec e plano (9 tasks, `executor: claude`) e o estado entrou em
`ready_for_execution` em `947194f`. Este commit abre a execução junto com a **Task 1** (D-31), que é
a primeira fronteira durável: as duas chaves órfãs saem dos três locales e o comentário do
`ProfileDocumentSlot.test.tsx` registra por que a asserção negativa sobrevive à remoção.

**Técnica: `executing-plans`, não `subagent-driven-development`** — a sessão corre sem delegação a
subagente por instrução do João; o ciclo task a task, com verificação por task, é o mesmo.

**Uma medição corrigiu o plano na primeira linha executada.** O grep do Step 1 da Task 1
(`grep -rn "documents\.noValidity"`) devolve **zero**, não a linha esperada: o único consumidor cita
a chave dentro de um regex (`/profile\.documents\.noValidity/`), com os pontos escapados no fonte.
Regrepado sem os pontos, a linha aparece — `ProfileDocumentSlot.test.tsx:118`, asserção negativa,
exatamente como a spec registrou. As chaves seguem órfãs; o passo do plano é que media com o padrão
errado.

**Estado: `executing`.** Próxima ação: Task 2 (D-02, plural do i18next em 17 chaves).

### Execução — 2026-08-18: as 9 tasks fechadas, estado em `ready_for_review`

As 9 tasks do plano estão nos commits `27bbd6d` (D-31), `35539aa` (D-02), `bb7b639` (D-06),
`c6fd4cb` + `069265a` + `70280ea` (D-05, 3 tasks), `34c0c3d` + `925e3ad` (D-04, 2 tasks) e este
commit (gate). O `d6912e5` no meio é conserto de `max-lines`: os comentários das tasks 1 e 3
empurraram dois arquivos para 152 linhas.

**Fronteira do bloco provada:** `git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts`
devolve vazio — frontend puro, P-03 não dispara. **Três catracas:** `pnpm test` 65 arquivos / 394
testes verdes, `pnpm lint` exit 0, `pnpm build` verde.

**Duas coisas saem daqui para o review, não fechadas por esta sessão.**

1. **Desenho novo no Dashboard, sem confirmação humana registrada.** A spec §6.2 contou os 3 sítios
   de `staleError` entre "as telas que já escrevem `?? hint`" — não escrevem: ali o `staleError` é
   mensagem **e** gatilho, e aplicar a D-05 apagava o aviso junto com o texto (3 testes de
   `useDashboard` ficaram vermelhos e provaram). Separado em `staleErrored: boolean` + `staleError`,
   com `DashboardPage.avisoStale()` caindo em `common.loadErrorHint`. **Consequência:** a mensagem de
   janela invertida (422, "La fecha de término no puede ser anterior a la de inicio.") deixa de
   aparecer na tela — o aviso continua, o texto do servidor não. Decisão do João no review.

2. **Step 3 da Task 9 não rodou.** A contagem de GET no devtools de `/pessoas` precisa de navegador,
   que esta sessão não tem. O `PeoplePage.test.tsx` espiona `api.get` (limite do axios, caminho real
   do componente) e mede a mesma coisa — 1/0 na montagem, 1 na 2ª aba, 0 na volta — mas a
   confirmação no navegador é passo do João.

Débito que sai do bloco: **D-36** no `backlog.md` (o envelope RFC 7807 não é localizado; o `D-32` do
plano já estava tomado pela ordem de foco de `/perfil`).

**Estado: `ready_for_review`.** Próxima ação: `request_code_review`. **A revisão não foi iniciada
aqui.**

### Revisão de sprint — 2026-08-18: risco BAIXO, uma lente, 3 achados, zero violação de lei

**Classificação: BAIXO risco.** Frontend puro (`git diff b758068..HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio), sem schema, `generated.ts`, Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`. Uma lente — sem revisão independente do Codex.

**Catracas re-rodadas nesta revisão:** `pnpm test` 65 arquivos / 394 testes verdes, `pnpm lint` exit 0, `pnpm build` verde.

**Órfãos:** zero componente, hook ou página sem consumidor. `RedatoresTab`/`StudentsTab` entram pela `PeoplePage`; os 12 sítios de `screenDetail` importam de `@shared/lib`. Uma chave de i18n órfã achada — o Q-2 abaixo.

**Gabarito:** nenhuma das 8 leis do §5 contrariada; nenhuma lição do `docs/README.md` repetida; ADRs e `frontend-fsliced.md` respeitados (nenhum import de `primereact` em feature, nenhum cruzamento entre features).

#### [Q-1] Dica de conexão para falha que não é de conexão — `frontend/src/shared/lib/screenDetail.ts` + 21 sítios · 🟡 · M

`screenDetail` cala TODO `detail` de servidor, e o fallback único dos chamadores é `common.loadErrorHint` = "Revisa tu conexión e inténtalo de nuevo." O envelope do backend não distingue só língua: distingue CAUSA. Depois da D-05, 403 (`Acesso negado`), 404 (`Recurso não encontrado`) e 422 (janela invertida do dashboard) chegam à tela como "revise sua conexão" — instrução errada, e o usuário não tem como agir. O caso do dashboard já subiu declarado na execução; o alcance é maior que ele: vale para os 12 sítios de `AppErrorState` e os 9 de `errorDetail`.

A spec §6.4 afirma "nenhuma mensagem de 422 some da tela" — o `useDashboard.test.tsx` do bloco prova o contrário (`staleError` vira `null` no 422 de janela invertida).

**Sênior faria:** dica por `status` no mesmo lugar da política — `403` → chave de sem permissão, `404` → não encontrado, `422` → dados inválidos, resto → `loadErrorHint`. Sai i18n do front (localizado hoje), não texto do servidor, então a D3 continua de pé.

**Fere:** catálogo universal (erro que não orienta) + a própria afirmação da spec §6.4. Não é lei do §5.

#### [Q-2] `certificate.certCount` é órfã, e a D-31 a pluralizou em vez de apagá-la — `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json:860-861` · 🟢 · P

A D-31 apagou as duas chaves órfãs de `/perfil`. `certificate.certCount` não tem consumidor nenhum em `.tsx`/`.ts` fora de `locales/` — e o bloco a transformou em `certCount_one`/`certCount_other` nos 3 dicionários e a inscreveu na lista de 17 do `plural.test.ts`. Resultado: uma chave morta agora tem teste que a segura viva.

**Sênior faria:** apagar as 6 linhas e tirar a chave do `CHAVES` do `plural.test.ts` (16 chaves), ou registrar no backlog o consumidor previsto.

#### [Q-3] Import duplicado do mesmo módulo — `frontend/src/features/identity/components/Student/StudentDetailSections.tsx:20` · 🟢 · P

O arquivo já importa de `@shared/lib` (`formatMonthYear` e companhia); a task acrescentou `import { screenDetail } from '@shared/lib'` como segunda declaração, em vez de entrar no grupo existente. O eslint atual não pega. Mesmo padrão, menor, em `TurmaDetailPage.tsx`, `BudgetDetailPage.tsx`, `TurmaDocuments.tsx`, `PendingQuotesPanel.tsx`, `RedatorDesignation.tsx` e `ReissueDialog.tsx` — ali o import é novo e não duplica, só ficou fora do bloco de imports de `@shared`.

**Sênior faria:** juntar ao import existente; se o padrão reincidir, `no-duplicate-imports` no eslint fecha a classe inteira.

#### O que NÃO é achado

`staleTime: 30_000` repetido nos dois hooks (dois sítios, comentado nos dois); a marca `localDetail` depender de o próximo autor lembrar de pô-la nos envelopes que o front sintetiza (os 3 de hoje estão marcados); o `detail` cru do `CertificateViewDialog` (D8, com teste que o prova); e a não localização do envelope no backend (**D-36** já no `backlog.md`).

**Pendente do João, herdado da execução:** Step 3 da Task 9 — contagem de GET no devtools de `/pessoas`. O `PeoplePage.test.tsx` mede o mesmo no limite do axios, mas o DoD do bloco pede o navegador.

**Estado: `blocked`.** `next_action: approve_review_findings`; `resume_state: reviewing`. Só achado aprovado vira código.

### Correções — 2026-08-18: os 3 achados aprovados pelo João, todos aplicados

`Q-1 a Q-3 entra` — os três, um commit cada, com as catracas re-rodadas ao fim: `pnpm test` 65 arquivos / **398** testes verdes (4 novos), `pnpm lint` exit 0, `pnpm build` verde.

**Q-1 (`cfdd626`) — a dica passa a vir do status.** `loadErrorHint(problema)` mora ao lado do `screenDetail` em `shared/lib` e devolve **chave** i18n, não texto: a tradução continua sendo de quem imprime, e a política não importa i18n dentro de `shared/lib`. `403` → `common.forbiddenHint`, `404` → `common.notFoundHint`, `422` → `common.invalidDataHint`, resto → `common.loadErrorHint` (rede caída e 500 seguem sendo dica de conexão, que ali é a certa). `401` fica de fora por medição: o interceptor do axios redireciona antes de virar estado de carga. Os três produtores expõem a chave (`errorHint` no `useLoadState`/`useResourceState`, `staleHint` no `useDashboard`), os 21 sítios trocam o literal, e `StudentClientField` ganhou a prop porque recebe estado por prop, não por hook.

**Uma imprecisão de teste apareceu no caminho, e foi corrigida junto:** o caso de janela invertida do `useDashboard.test.tsx` chamava `problem(...)` **sem status**, então rodava com o default `500` — não com o 422 que o cenário descreve. Com o status certo, o teste agora afirma `staleHint === 'common.invalidDataHint'`, e é ele que prova o achado.

**Q-2 (`6a39f9a`) — `certificate.certCount` apagada dos 3 dicionários** e retirada da lista do `plural.test.ts` (16 chaves). A D-31 tinha apagado as órfãs de `/perfil`; esta escapou por ter sido pluralizada pela D-02 no mesmo bloco.

**Q-3 (`a160e07`) — o import de `@shared/lib` volta a ser um só** em `StudentDetailSections.tsx`. **A regra de eslint sugerida NÃO entrou, e a medição é o motivo:** `no-duplicate-imports` do core não distingue `import type` de `import` de valor, e a casa separa os dois de propósito — **55 pares legítimos** em `src/` virariam erro. Duplicação valor+valor existia em **um** arquivo, o que o commit conserta. Custo da regra maior que a classe que ela fecharia.

**Estado: `ready_for_closure`.** Revisão sem achado pendente. Segue aberto, herdado da execução e para o fechamento: **Step 3 da Task 9** — contagem de GET no devtools de `/pessoas`, que precisa de navegador. O fechamento **não** foi executado aqui.

### Fechamento — 2026-08-18: o critério de aceite provado no navegador, contra a API real

**Item 0 — critério de aceite do bloco, não higiene genérica.** O passo que faltava desde a execução
(Step 3 da Task 9) **rodou**: Chromium via `@playwright/cli` (a lib global, dirigida por script), Vite
desta worktree em `:5173` e a API real em `:8080`, logado como `admin@lotus.cl`. Em `/personas`
(a rota é `/personas`, não `/pessoas` — o plano escreveu o nome em português):

1. **montagem:** `GET /api/redatores` **uma vez**, `/api/students` **zero** (o `GET /api/me` é a sessão);
2. **clique na aba de alunos:** `GET /api/students` **uma vez**;
3. **volta à primeira aba dentro dos 30s:** **nenhuma** request.

É o DoD do BD-13 ("1 GET por aba aberta, não 2 por montagem") medido no navegador, e não mais só no
limite do axios do `PeoplePage.test.tsx`.

**A D-05 e o Q-1 também foram exercitados contra a API real, na tela:** `/operacion/turmas/999999`
devolve 404 com `detail` cru do framework (`No query results for model [App\Domains\Operation…`), e o
que chega ao `AppErrorState` é **"No se pudieron cargar los datos" + "No encontramos este registro."** —
o `detail` do servidor calado pela política, e a dica vinda do **status**, que é exatamente o que o
Q-1 consertou. A paridade das 3 locales (a outra metade do DoD) é o `plural.test.ts`, verde.

**Catracas.** Frontend: `pnpm test` **65 arquivos / 398 testes** verdes, `pnpm lint` exit 0,
`pnpm build` verde. Backend: **713 passed / 5 skipped** — mas o registro honesto é que essa suíte é a
do **main tree**, que está na `feat/arquivados-e-restauracao`; o bloco tem `git diff main...HEAD --
backend/ frontend/src/shared/types/generated.ts` **vazio**, então Pint e `typescript:transform` são
**N/A por escopo medido**, e não há suíte de backend deste bloco para rodar. Código morto: nenhum
`.gitkeep`, placeholder ou import órfão criado aqui; as 3 chaves novas (`forbiddenHint`,
`notFoundHint`, `invalidDataHint`) têm consumidor nas 3 locales e no `screenDetail.ts`.

**Leis §5:** nenhuma contrariada — o bloco não tocou schema, `generated.ts`, Sanctum, auditoria, RBAC
nem financeiro, e nenhuma feature passou a importar `primereact` ou outra feature.

**Pendências.** Nenhuma nasceu e nenhuma fechou neste bloco; seguem **29 abertas**. A **P-36** e a
**P-37** cumpriram a sprint de rastro e saíram das `encerradas.md`. Dois gatilhos foram conferidos e
**não** disparam aqui: a **P-16** (o Figma quer `Alumnos` como primeira aba) continua esperando a
Lotus — a casca de abas nova manteve `Redactores` na frente, sem agravar nada; e a **P-45** teve a
correção **medida viva no main tree** (`TestCase.php` já pega a primeira origem da lista e a suíte
passa inteira), mas em outra branch — ela fecha no bloco de backend que levar esse commit à `main`,
não neste fechamento.

**Uma divergência documental fica declarada, sem virar pendência:** a §6.4 da spec afirma "nenhuma
mensagem de 422 some da tela", e some — o texto do servidor é calado pela D-05, e o que resta é a
dica de dados inválidos do Q-1. A spec é snapshot datado e foi arquivada como está; o desvio está
registrado no review e nas correções acima, que é onde quem for ler o comportamento vai procurar.

**Arquivados:** `plans/archive/2026-08-18-bd13-listagens-e-abas.md` e
`specs/archive/2026-08-18-bd13-listagens-e-abas-design.md` (a spec não é compartilhada — só o plano a
referenciava, e a referência foi atualizada). Do `backlog.md` saíram o **BD-13** e as linhas dos
débitos pagos (**D-02**, **D-04**, **D-05**, **D-06**, **D-31**); o **D-36**, nascido aqui, fica.
A entrega entrou no `historico/progress.md`, e o Login de 2026-08-13 foi para o
`progress-archive.md` para manter as dez.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.

## Quinto item fechado — 2026-08-18 (`bd16-perfil-e-kit-compartilhado`, BD-16 dos blocos de dívida)

**Promoção explícita do João**, a partir da auditoria
`audits/2026-08-17-perfil-ui-review-e-design.md`. O estado saiu de `idle` para `ready_for_planning`
no mesmo commit que grava a auditoria e o BD-16 — a fronteira durável é essa, e não a leitura do
relatório.

**Como o item nasceu.** Duas lentes sobre `/perfil`, na mesma sessão: o `/lotus-ui-review` (1 achado
**C**, 8 **B**, 18 capturas em `.artifacts/ui-review/2026-08-17-1241-perfil/`) e o `frontend-design`
(7 achados estéticos). Nenhum código foi tocado por nenhuma das duas — o passo 16 da skill proíbe, e
a auditoria é registro, não correção.

**Escopo escolhido: A + B + C, com a D-28 dentro.** As três frentes estão no BD-16 do
`backlog.md`; a D-28 (dar marca visual ao corte de mutabilidade da spec D1) entrou por decisão
explícita do João na mesma seleção, e **precede a D-27** — reordenar sem marca visual só troca qual
metade fica por último.

**Por que `ready_for_planning` e não `context_required`.** As Sprints 5 e 6 exigiam Context Packet
porque o escopo delas era canônico do Drive. Este bloco não tem fonte externa: cada item é medição
local, feita no navegador ou por `grep` no repositório, e a auditoria já é o pacote de contexto.
Nenhuma consulta a Drive, Notion ou Figma é necessária para planejá-lo.

**O bloco absorve o BD-10 e reabre duas pendências travadas.** P-36 e P-37 estavam adiadas desde
2026-08-13 pelo mesmo motivo — `FormSection` e `FormField` sob reescrita ativa do BD-5 —, e o
impedimento venceu. O gatilho literal da P-36 (*"bloco que tocar `FormSection` ou `CoursesTable` por
outro motivo"*) foi disparado pelo DS-01 da auditoria.

**Três coisas que o planejamento precisa tratar e que não são detalhe:**

1. **O alcance sai de `/perfil`.** `FormSection` tem 11 consumidores, `AppPassword` 5 sítios,
   `AppFileRow` serve comercial/turma/redator, `AppTag` aparece fora da tela. O plano declara os
   sítios e o DoD prova que nenhum regrediu — a lei 6 manda a correção para `shared/ui`, então o
   alcance é consequência, não escolha.
2. **A P-36 traz uma decisão junto, não só um fix.** O seletor da catraca `COR_HARDCODED` precisa
   distinguir cor crua de `var(--…)` em `style={{ }}`, e é isso que sempre adiou a guarda.
3. **Dois achados ficaram FORA por decisão pendente:** DS-05 (`scale-200` no avatar — a previsão de
   recorte é aritmética e precisa de medição no navegador antes de virar task) e DS-07 (mural de
   credenciais como assinatura da tela — inverte a ordem da spec D1, é bloco próprio).

**Colisão de ID encontrada e não corrigida.** Existem dois `D-18` no `backlog.md`: a data do
`AppFileRow` (que este bloco cobre) e o `description` em espanhol fixo do Dashboard, em "Travados em
decisão". Renumerar é decisão do João — está anotado nas duas linhas.

### Planejamento — fechado em 2026-08-17

**Spec:** `specs/archive/2026-08-17-bd16-perfil-e-kit-compartilhado-design.md`. Oito decisões escolhidas pelo
João (D1–D8) e sete derivadas (D9–D15).
**Plano:** `plans/archive/2026-08-17-bd16-perfil-e-kit-compartilhado.md` — 16 tasks. As 8 primeiras entregam
o kit compartilhado (`shared/ui`), as 7 seguintes aplicam em `/perfil`, a 16ª é o gate do bloco.
Executor `claude`, worktree `fix-frontend`, branch `feat/bd16-perfil-e-kit-compartilhado` a partir de
`main@135e468`. P-03 não dispara: o bloco é frontend puro.

**Duas tasks abrem ponto de decisão por medição, não por escolha do executor:**

- **Task 8** ramifica: `onToggleMaskKeyDown` do Prime (`password.cjs.js:588-593`) **já trata**
  `event.code === 'Space'`. Se o teste da Task 8 passar sem código novo, o defeito não reproduz em
  jsdom e a task vira registro medido, não correção. Um handler no wrapper chamaria `toggleMask()`
  duas vezes e devolveria o campo ao estado inicial — o defeito pioraria ficando invisível.
- **Task 15** para e pergunta se a faixa recortar o avatar (ver o risco abaixo).

**Duas divergências medidas contra o que estava escrito, e o que venceu:**

1. **`FormSection` tem 16 consumidores, não 11.** A ficha da P-36 mediu 11 em 2026-08-13; os cinco
   arquivos de `Profile/` nasceram depois, e o DoD do BD-16 no `backlog.md` herdou o número velho.
   **Vence a medição de hoje.** A correção do registro sai no fechamento, junto do encerramento das
   duas pendências — auditoria reporta, não corrige no meio do bloco.
2. **O `aria-pressed` que a D-24 pede foi RECUSADO com motivo.** `AppPassword.tsx:50-57` registra a
   decisão de 2026-08-13 (UI-04): o olho é botão, não `switch`, porque o **nome** dele alterna a cada
   clique — e o `aria-checked` do Prime foi removido justamente por mentir sobre o estado. Pendurar
   `aria-pressed` num botão cujo nome já carrega o estado o anuncia duas vezes. A D-24 fecha pela
   metade do teclado (Espaço); a metade do `aria-pressed` não entra. Está na D6 da spec.

**Um risco que pode reabrir a DS-05 durante a execução.** A faixa horizontal da D8 esbarra no
`transform scale-200` do `AppPhotoField`, e a DS-05 está fora do bloco. Se a faixa recortar no
navegador, a decisão volta ao João: ou a DS-05 entra, ou a faixa fica só na parte de baixo do
cartão. Medir antes de escrever o layout.

### Execução — 2026-08-17: início, técnica `executing-plans`

`/executar-bloco bd16-perfil-e-kit-compartilhado` validou as âncoras (spec e plano no disco,
`context_packet: null` legítimo porque o bloco não tem fonte externa, handoff `executor: claude`,
`active_plan` cobrindo o work item) e transicionou `ready_for_execution` → `executing` no commit da
Task 1. Técnica: `executing-plans` — o ambiente restringe o Agent tool a pedido explícito, e as 16
tasks têm dependência sequencial declarada (a Task 2 só apaga `BRAND_COLOR` depois que a Task 1 o
zera; a Task 7 consome o contexto da Task 6; as Tasks 14 e 15 consomem a variante da Task 5).

**A branch nasce de `254d691`, não de `135e468` como o plano escreveu.** Não é divergência de estado:
os dois commits a mais na `main` são a própria spec (`94b533d`) e o próprio plano (`254d691`), que
não existiam quando o plano fixou a base. Nascer de `135e468` produziria uma branch que não carrega o
plano que executa. `state_basis_commit` acompanha, pelo mesmo critério das promoções anteriores.

**Worktree `fix-frontend` já era linked worktree** (`GIT_DIR` ≠ `GIT_COMMON`, sem submódulo), então
`using-git-worktrees` parou no passo 0 — nenhuma worktree nova foi criada, só a branch
`feat/bd16-perfil-e-kit-compartilhado`. Baseline medida antes de tocar arquivo: **45 arquivos /
250 testes**, verde.

### Tasks 1–15 — 2026-08-17: 15 commits, um por task, na ordem do plano

`8ffdefa` (tinta de marca sai do título de seção e do ícone de curso) · `efd5bfe` (régua de valor
para cor em `style`, `BRAND_COLOR` morre) · `e51e1cc` (tag de tom sai do preenchido saturado) ·
`7a1705a` (linha de arquivo quebra por contêiner e fala o idioma da interface) · `cfe0e19`
(`AppCard` ganha `sunken`) · `0672019` (a label do `FormField` vira **irmã** do controle) ·
`2ad35d7` (os cinco wrappers se associam ao rótulo sozinhos) · `d460528` (**Task 8 virou registro
medido, não correção** — o olho da senha já responde às duas teclas; a D-24 não reproduz, exatamente
o ramo que o planejamento previu) · `ebc6596` (disparador de upload vira botão nomeado) · `c1f7a79`
(o preview foca o próprio contêiner) · `836197f` (ação destrutiva da foto sai da tinta de marca) ·
`d038e67` (slot documental: validade sobe, ações alinham, upload se nomeia) · `09a22e2` (o subtítulo
ramifica pelo mesmo predicado do corpo) · `e6c1f4b` (coluna de leitura recua, o corte ganha marca
visual) · `b77ce75` (abaixo de `xl`, self-service primeiro).

**A Task 15 não precisou reabrir a DS-05.** O risco escrito no planejamento (a faixa horizontal
recortar o `scale-200` do `AppPhotoField`) foi medido no navegador e não se materializou.

### Task 16 — 2026-08-17: o gate achou 10 defeitos que o build não vê

**Step 1 — gate executável:** `pnpm build` verde, `pnpm lint` 0, suíte **53 arquivos / 312 testes**
contra a baseline de 45/250.

**Step 2 — a P-36 medida nos dois temas, e a catraca provada nos dois sentidos.** Título de seção
(régua 4,5:1, era 2,77:1): **11,4:1** no escuro sobre card e **10,35:1** no claro; o `h1`/`Identidad`
sobre o fundo mede 14,17:1 e 9,45:1. Ícone de curso em `/cursos` (régua 3:1, era 2,53:1): **6,21:1**
no escuro, **7,58:1** no claro. A medição **compõe o alfa da tinta sobre o fundo opaco mais próximo**
— ignorá-lo inflava as razões (`rgba(255,255,255,.6)` sobre ardósia mede 6,2:1, não 14,6:1). Catraca:
`style={{ color: '#25A5E4' }}` reintroduzido em `FormSection.tsx` faz o `pnpm lint` reprovar
**nomeando arquivo, linha e regra**; sonda revertida com a árvore limpa.

**Step 3 — a P-37 medida no navegador, não conferida no DOM.** Nos cinco wrappers, o nome acessível
é **só o rótulo**; sob um 422 real o `aria-invalid="true"` e o `aria-describedby` pousam no **input**
(não na casca), inclusive no `AppDatePicker`, onde prop desconhecida cai no `<span>` raiz e o
caminho é o `pt.input.root`; clicar no texto do rótulo põe o foco no controle. Onde o rótulo
**deliberadamente** não tem `htmlFor` é o modo leitura, para "Carga horaria (del curso, solo
lectura)" não apontar para o vazio.

**Step 4 — alcance fora de `/perfil`, visto e não deduzido**, nos seis grupos da tabela do plano.
`FormSection` mede **16 consumidores** com o seletor, não 11 (a correção do registro é do Step 7).

**Step 5 — as medições da auditoria refeitas**, nos dois papéis, nos **três locales**, nos dois temas
e em 390/1024/1440:

| Item | Auditoria | Medido agora |
|---|---|---|
| D-19 | `clientWidth` 227 vs `scrollWidth` 311 | 242 = 242 nos três slots em 390px, nome inteiro em 178px, zero truncamento |
| D-20 | 2,28:1 e 2,77:1 | ver Step 2 — nenhum sítio abaixo da régua |
| D-21 | validade como última linha `text-xs` | validade na linha do status, tinta de corpo (`d038e67`) |
| D-22 | `Ver` em x=1132 e x=1275 | mesma coordenada nos slots: 1290 / 874 / 248 por viewport |
| D-24 | Espaço não alterna | não reproduz — registro medido da Task 8 (`d460528`) |
| D-25 | Escape inerte com foco no iframe | Escape fecha antes do primeiro clique no visor (`a38aec5`) |
| D-27 | y=829 de 1476px (Admin) | `Datos personales` em **y=265** (1440) e **y=277** (390), nos dois papéis e nos três locales |

**Os três locales não mudam layout nenhum**, e isso é medição, não suposição: mesma contagem de
slots, zero vazamento, zero truncamento e as mesmas coordenadas de ação em es-CL, pt-BR e en. A maior
chave `profile.*` cresce 11% do es-CL para o pt-BR/en (89 → 99 caracteres) e é parágrafo de ajuda,
não rótulo.

**O gate rendeu 10 correções, uma por commit** (`6a5df00`…`a38aec5`) — cada uma um defeito que o
build, o lint e a suíte não veem: o grupo de ações vazando 9px do slot em 390px; o erro do campo
pousando na casca do `AppDatePicker`; a tag de modalidade fora do mapa de tom; valor imutável em
`disabled` em vez de `readOnly`; o disparador só-ícone anunciando "Choose"; o botão de fechar diálogo
falando inglês; a lista vazia de dropdown em inglês; o nome de arquivo sem base para quebrar; a
coluna de ação deixando de ser coluna depois da quebra; e a D-25, que **sobreviveu à primeira
correção** — `focusOnShow` do Prime foca o primeiro FOCÁVEL, que no PDF é o próprio `<iframe>`, e o
visor nativo ainda toma o foco ~200ms depois de abrir, sem clique (sonda de 100 em 100ms). A
devolução é única por abertura; depois do primeiro clique dentro do visor a tecla é do navegador e o
`X` é a saída garantida — limite declarado no docblock, não maquiado.

**Step 6 é do João:** `/lotus-ui-review` tem `disable-model-invocation: true`. **Step 7 (registro,
encerramento da P-36/P-37, contagem do `FormSection`, débito das chaves i18n órfãs e transição de
estado) fica retido até depois dele** — a ordem é do plano, e escrever a linha de entrega antes da
revisão registraria um resultado que ela ainda pode mudar.

**O que o gate achou e NÃO virou correção, para decisão do João:** o paginador do `DataTable` ainda
se anuncia em inglês (a raiz é o `locale('es')` global do Prime, que o projeto nunca chamou — hoje
cada wrapper pina o rótulo traduzido, e trocar isso é decisão de arquitetura); o `AppDatePicker` fixa
`locale="es"` no código; o `<a>` que embrulha o `<button aria-label="Descargar">` aninha dois
interativos; o olho do `AppPassword` **perde o foco para o `<body>`** quando alternado por teclado
(o Prime troca o nó do ícone; um handler no `pt` provavelmente substituiria o handler dele, e a Task
8 registrou por que não duplicá-lo); o dropdown de filtro do Historial de certificados não tem nome
acessível (`textbox: Todos`); e o backend devolve mensagem em espanhol com **nome de atributo em
inglês** ("El campo end date debe ser una fecha posterior o igual a start date."), além de "debe ser
una cadena de caracteres" para campo obrigatório vazio.

### Task 16 Step 6 — 2026-08-18: a revisão de UI achou 0 defeitos e 7 melhorias

`/lotus-ui-review perfil`, invocado pelo João. Papel **Redator** (`juan.morales@lotus.cl`, o único
redator ativo do seed), locale **es-CL**, tema claro e escuro em 1440x900 e tema claro em 1024x768 e
390x844. Jornada read-only: nenhuma mutação, nenhuma mudança de código como consequência da revisão —
o passo 16 da skill proíbe, e o passo 17 fecha só a sessão que ela abriu. Relatório e 14 capturas em
`.artifacts/ui-review/2026-08-17-2108-perfil/` (a pasta está no `.gitignore`, por desenho).

**Resultado: 0 achados C, 7 B e 1 bloco A agrupado** (8 observações de conformidade). Os B, com a
medição de cada um: ordem de foco divergindo da visual abaixo de `xl`; `Eliminar foto` a 3,44:1 no
tema claro; nome acessível do upload sem o rótulo visível; olho da senha com alvo de 16x16; download
consumindo duas paradas de Tab, a primeira sem nome; ação do slot vazio em x=297 contra 348 dos
outros três em 390px; e o vão de 548px entre `Cursos habilitados` e o valor em 1024px.

**O que a revisão confirmou funcionando**, e é o que fecha o gate: a jornada conclui nas três
viewports; a D-25 se sustenta (Escape fecha a prévia e devolve o foco ao `Ver` que a abriu); não há
overflow horizontal em 390px; o texto está em es-CL na superfície inteira; console com **0 erros e 0
warnings**; rede com `/api/me` 200 e `/api/profile` 200, sem repetição inesperada.

**Um falso defeito foi descartado com prova, não com suposição.** A prévia de CV e Título falha, mas
o arquivo-semente dos dois slots é uma fixture **truncada de 69 bytes** — só o header `%PDF-1.4`, sem
xref. O REUF, com PDF válido de 596 B, renderiza. É dado de seed, não comportamento da tela, e
entrou no relatório como limitação, não como achado.

### Task 16 Step 7 — 2026-08-18: as 7 melhorias viradas em código, uma por commit

Autorizado pelo João (*"vamos aplicar as correções para seguir para o state ready_for_review"*). Cada
uma medida no navegador antes e depois, um commit por achado:

| Achado | Antes | Depois | Commit |
|---|---|---|---|
| UI-02 · tinta `danger` de texto no claro | 3,44:1 | **5,83:1** (e 6,37:1 no escuro) | `4006ead` |
| UI-03 · nome acessível do upload | `Subir documento` vs `Enviar Post-Grado` | `Subir documento` vs `Subir Post-Grado` | `ef46d37` |
| UI-04 · alvo do olho da senha | 16x16 | **28x28**, glifo no mesmo pixel | `557565e` |
| UI-05 · baixar arquivo | 6 paradas de Tab para 3 ações, 3 mudas | **3 paradas**, todas nomeadas | `c15dfbf` |
| UI-01 · ordem de foco | `scrollTop` 0 → 1862 → 2230 → 0 em 390px | ~~monotônica em 390 e 1024~~ — **revertido**, ver abaixo | `da26b89`, desfeito |
| UI-06 · ação do slot vazio em 390px | x=297 contra 348 | **348 nos quatro** | `c9289fb` |
| UI-07 · vão rótulo/valor em 1024px | 548px | **214px** | `058b80f` |

**A UI-01 foi decisão do João, não escolha do executor, porque não tinha correção neutra.** A D1
punha o imutável à esquerda em `xl` e a D-27 punha o self-service em cima abaixo de `xl`: duas ordens
visuais para um DOM só, conciliadas com `order-*` — que reordena a pintura e não a árvore de
acessibilidade. Inverter só o DOM mudaria a viewport em que a violação acontece, não a eliminaria, e
1440 é a viewport de trabalho. O João escolheu virar as colunas em `xl`, e **depois, vendo a tela
pronta, reverteu** (*"deixe o meu perfil como estava"*): o desktop volta com a identidade à esquerda
e o `order-*` de volta abaixo de `xl`. **A revisão continua certa e o layout venceu** — não é o
achado que caiu, é o preço dele que foi aceito, e aceito com o número na mão.

O que sobrou está escrito onde se tropeça nele: o docblock do `ProfilePage` carrega a medição e diz
por que `tabIndex` positivo não é saída, e o débito é o **D-32** do `backlog.md`, sem bloco, porque a
saída restante é desenho — ou a D1 abre mão do lado, ou a D-27 abre mão da precedência abaixo de
`xl`, ou o cartão de identidade encolhe o bastante para dispensar a inversão. As outras seis
correções não dependiam desta e ficaram todas de pé.

**Duas correções não couberam na feature e subiram para `shared/ui`,** porque o defeito não era de
`/perfil`: o alvo do olho vale para os 4 campos de senha da aplicação, e o par `<a>`+`<button>` do
download vivia em **dois** sítios (`AppFileActions` e `AppFilePreviewDialog`) — corrigir um deixaria
o débito vivo no irmão. Nasceu daí o `AppDownloadButton`. A tinta `danger` foi ainda mais fundo: é
regra de tema, não de componente, e vale para todo botão `text`/`outlined` de severidade.

**A porta do dev server virou armadilha e fica registrado.** A revisão rodou em `:5173`, que era o
Vite deste worktree naquele momento. No passe de correção, `:5173` já era o Vite do **main tree
`lotus`** e este worktree servia em `:5174` — a primeira leva de medições saiu do app errado e foi
descartada (o sintoma foi `Eliminar foto` medindo `#186b94` em peso 400, que é outro componente).
`backend/.env:38` já lista as duas origens, então as duas autenticam com o mesmo cookie e nada
denuncia a troca. **Confira o `cwd` do processo, não a porta.**

**Fechamento documental do Step 7:** a linha da entrega entrou em `historico/progress.md`; **P-36 e
P-37** foram para `pendencias/encerradas.md` com os commits que as pagam (`8ffdefa`/`efd5bfe` e
`0672019`/`2ad35d7`) e saíram do índice, que passa a 29 abertas e 4 encerradas; a contagem de
consumidores do `FormSection` no `backlog.md` foi corrigida de 11 para **16**; e as duas chaves i18n
órfãs viraram o débito **D-31** (`profile.documents.noValidity` e `profile.identity.role` existem nos
três locales e nenhum `.tsx` as consome).

**A colisão de ID dos dois `D-18` não se resolve aqui** — renumerar é decisão do João, e mexer no ID
sem ele quebra as referências cruzadas já escritas dos dois lados.

**Estado: `ready_for_review`.** Working tree limpo, branch `feat/bd16-perfil-e-kit-compartilhado` com
15 commits de task, 10 do gate visual, 7 do passe de revisão (um deles desfeito por decisão) e os de
doc. Gate final: `pnpm build`
verde, `pnpm lint` 0, **54 arquivos / 321 testes** contra a baseline de 45/250 — o passe de revisão
somou 1 arquivo e 9 testes (a catraca da tinta `danger`, o alvo do olho e o controle único de
download). `state_basis_commit` segue em `254d691`: ele marca a base do item ativo, e a entrega ainda
não foi para a `main`. A próxima instrução do João aciona `/revisar-sprint`; este passo não inicia
review.

### Revisão de sprint — 2026-08-18: risco BAIXO, uma lente, 3 achados, zero violação de lei

`/revisar-sprint` sobre `254d691..dc46eb3` — 36 commits, 57 arquivos, +2260/−273.

**Risco BAIXO, e a classificação é o que decide o número de lentes.** O bloco não tocou nenhum
domínio das leis §5 (nenhuma migration, `generated.ts` intocado, nada de Sanctum, auditoria ou
RBAC), não tocou dinheiro nem emissão de certificado, e o executor foi o Claude. Uma lente,
sem segunda opinião do Codex.

**O gate foi reconferido, não citado.** O `state.md` afirmava 54 arquivos / 321 testes; a suíte
rodou de novo no review e devolveu o mesmo número, com `pnpm build` verde e `pnpm lint` 0. O
wrapper composto do gate devolveu `exit 1` com `BUILD=0 LINT=0 TEST=0` nos logs — o código de saída
era do encadeamento, não de checagem nenhuma.

**Passo 1 — órfãos: nenhum.** `AppDownloadButton` (2 consumidores + barrel), `ProfileDocumentSlotHeader`
(1) e `fieldContext` (5 wrappers + o `FormField`) estão todos consumidos; `BRAND_COLOR` foi apagada
e não deixou referência. Os 3 locales medem **636 chaves idênticas**, zero faltando e zero extra. As
duas chaves i18n sem consumidor já são o débito **D-31** — decisão registrada não é achado. A
contagem de consumidores do `FormSection` no `backlog.md` bate: 17 arquivos casam `<FormSection`,
menos o próprio teste, **16**.

**Leis e convenções, medidas:** zero import direto de `primereact` sob `src/features` ou `src/app`,
zero import cruzado entre features, nenhum `Field`/`UnmappedErrors` local, nenhum `useEffect` de
reset, nenhum `setForm` solto, e nenhum `any`/`@ts-ignore`/catch vazio/`console.*` no diff inteiro.

| Achado | Onde | Severidade | Esforço |
|---|---|---|---|
| **Q-1** · `role="button"` cravado sem o resto do contrato: Espaço não ativa e `disabled` não se anuncia | `shared/ui/AppFileUpload/AppFileUpload.tsx` | 🟡 | P |
| **Q-2** · `pt` que não pode vencer — o wrapper crava o mesmo `aria-label` pelo `pins` | `features/commercial/.../QuoteRow.tsx:90` | 🟢 | P |
| **Q-3** · `mergePt` compunha função num sentido só; no outro a folha do chamador sumia | `shared/ui/mergePt.ts:32-36` | 🟢 | P |

**Dois candidatos morreram na verificação, e é por isso que se verifica.** O `AppDownloadButton`
parecia abrir popup sem barra (`window.open(href, '_blank', 'noopener,noreferrer')`): a
especificação **remove** `noopener`/`noreferrer` do `tokenizedFeatures` antes do teste de popup, que
sai vazio — é aba, como o docblock diz. E um parser próprio acusou dois controles dentro de um
`FormField` no `StaffUserDialog:93`: ele engasgou com `<FormField ... />` autofechado, e a leitura
das linhas 84–135 mostrou três campos, um controle cada.

**Nada de decisão registrada virou achado:** D-32 (ordem de foco), DS-05 (avatar), D-31 (chaves
órfãs), a colisão dos dois `D-18` e o `--text-color-secondary` separado do interno compilado do
Prime estão todos escritos com número medido. **Nenhum padrão reincidente** apareceu — nada a
promover para rule ou ADR.

### Correções — 2026-08-18: os 3 achados aprovados pelo João, todos aplicados

Autorizado pelo João (*"Vamos aplicar de Q-1 á Q-3"*). Um commit por achado:

| Achado | Antes | Depois | Commit |
|---|---|---|---|
| Q-1 · contrato do disparador de upload | Espaço inerte; `disabled` focável e mudo | Espaço ativa; `aria-disabled` anunciado | `e9f53f3` |
| Q-2 · `pt` morto na cotação | 3 linhas que não valiam | removidas; nome vem do piso do wrapper | `a4eac5c` |
| Q-3 · assimetria do `mergePt` | função no `pins` descartava a folha do chamador | compõe nos dois sentidos | `fb2d38b` |

**A Q-1 é a metade que faltava da D-24.** O `mergeProps` do PrimeReact COMPÕE função de mesmo nome —
chama a existente e depois a do `pt` (`utils.cjs.js:2694-2700`) —, então o `onKeyDown` novo soma ao
`Enter` do Prime em vez de trocá-lo, e há teste travando as duas teclas. O `aria-disabled` entra
sem tirar o alvo do Tab: botão desabilitado que some da navegação é botão que o leitor de tela nunca
encontra para descobrir por que não responde.

**Os testes viram o defeito antes de virarem verde** (lição 10): as duas correções de comportamento
foram rodadas contra o código anterior e **5 dos 6 testes novos ficaram vermelhos** — o sexto é a
guarda do caso negativo (`aria-disabled` ausente quando habilitado), que passa dos dois lados por
construção. A Q-2 não ganha teste: é remoção de linha morta, e o nome acessível que ela repetia já
está travado por teste desde o BD-16.

**Gate após as correções:** `pnpm build` verde, `pnpm lint` 0, **54 arquivos / 327 testes** — os 321
anteriores mais 6. Nenhuma chave i18n virou órfã: `common.upload`, que saiu do `QuoteRow`, continua
consumida pelo próprio wrapper.

**Estado: `ready_for_closure`.** Nenhum achado aguardando decisão ou correção. `/fechar-sprint` é o
próximo passo e **não** foi executado aqui.

### Fechamento — 2026-08-18: o contrato do disparador provado no navegador, e a suíte de backend vermelha pelo mesmo `.env` de sempre

**O passo 0 não foi herdado do DoD da Task 16, e não podia ser.** Aquele DoD mediu o bloco antes das
três correções do review, e duas delas mudam comportamento de teclado e de estado no controle que
substitui documento de peso legal. A prova foi refeita em **Chromium real** (o `playwright-cli`
default não abre: ele procura o canal `chrome` em `/opt/google/chrome`, que não existe nesta máquina
— `--browser chromium` usa o binário do `ms-playwright` e abre), com o frontend **desta** worktree e
a API em `:8080`.

**A armadilha da porta foi conferida pelo `cwd`, não pela porta**, como o Step 7 mandou: `:5173` é o
Vite do main tree (`/home/jvbat/projetos/lotus/frontend`, pid 8995) e `:5174` é o desta worktree
(pid 12027). Toda medição saiu de `:5174` — e o `:5173` só apareceu de propósito, como grupo de
controle.

| O que | Como foi provado | Resultado |
|---|---|---|
| Q-1 · tecla | listener de contagem no `<input type=file>`, foco no disparador, `Space` | **1 ativação** (era 0) |
| Q-1 · Enter | mesma sonda, `Enter` | **1 ativação** — o handler do Prime sobreviveu à fusão, e não dispara duas vezes |
| Q-1 · estado | POST `/api/profile/documents` **segurado em voo** por rota do Playwright | `aria-disabled` de `null` para `"true"`, `tabIndex` **0** nos dois (focável de propósito), `p-disabled` e `<input disabled>` |
| Q-2 | nomes acessíveis de `/comercial/presupuestos/1` em es-CL | `Subir documento` ×3 pelo piso do wrapper, mais o 4º que se nomeia pelo rótulo visível |
| Q-3 | `maximizableButton` do `AppDialog` — a função que o ramo novo compõe | `Maximizar diálogo` → `Restaurar diálogo`, e `Cerrar` traduzido |
| D-23 | árvore de acessibilidade de `/perfil` como Redator | `Replace Résumé (CV)`, `Replace University degree`, `Upload Postgraduate degree` — nome por documento |
| P-37 | mesma árvore | `textbox "Name"`, `textbox "Current password"` — o nome é **só** o rótulo |
| UI-05 | mesma árvore | `button "Download"`, zero `<a>` no par de ações |
| UI-04 | olho da senha | `28x28` e Espaço alterna (`password` → `text`) |

**Zero resíduo no banco de dev.** A rota abortou a escrita depois de medir, e o slot de Post-Grado
seguia `Not uploaded` na releitura. Nada foi gravado — ao contrário do fechamento anterior, que
declarou dois documentos.

**Um defeito novo apareceu na prova e NÃO é deste bloco — foi medido nos dois lados.** Com o foco no
olho da senha, Espaço alterna e o `document.activeElement` vira `BODY`: o Prime troca o ícone e o nó
focado sai do DOM. O mesmo teste no main tree (`:5173`, sem os commits do BD-16) devolve `BODY`
igual, mudando só o alvo — 16x16 lá, 28x28 aqui. Entrou como débito **D-33**, sem bloco. É a terceira
ponta do mesmo `AppPassword`, depois da tecla (D-24, não reproduzida) e do alvo (UI-04, pago).

**Suíte de backend: 12 falhas no primeiro run, e a causa é a P-45, não o bloco.** Todas são
`RuntimeException: Session store not set on request`, do `tests/TestCase.php:18` lendo
`FRONTEND_URL` cru enquanto o `.env` do main tree é lista com vírgula
(`http://localhost:5173,http://localhost:5174`). **Provado por medição, não deduzido:** com
`FRONTEND_URL` valendo uma URL só, a suíte fecha em **684 passed / 5 skipped / 0 failed**. O bloco
tem **zero** arquivo em `backend/`, e o container que mede monta o main tree, que está em `main` —
o vermelho é o da `main`, e a ficha da P-45 já o registra desde 2026-08-17.

**Higiene medida:** 0 arquivo PHP no diff (Pint não se aplica, e ele nunca roda sem argumento),
`generated.ts` intocado e nenhum DTO alterado (`typescript:transform` não se aplica), 0 `.gitkeep`
novo, e nenhum órfão entre os arquivos que o bloco criou. Front: `pnpm lint` 0, `pnpm build` verde,
**54 arquivos / 327 testes**.

**Gatilhos de pendência conferidos um a um; nenhum venceu.** A **P-46** foi a única que chegou perto
e **não** disparou: o diff tem um `marginTop: 0`, mas ele neutraliza a margem do **próprio Prime**
num `<span>` de ícone (`AppPassword.tsx:111`), não a margem de agente do usuário num `h1`–`h6`/`p`/
`ul`/`ol`, que é o que a ficha conta. A **P-45** teve o sintoma medido de novo e segue aberta — o
gatilho dela é o commit que fechar o multi-origin, e ele não é deste bloco. A **P-03** não dispara em
bloco frontend puro; a **P-44** pede bloco que possa reseedar o dev; a **P-32** pede lição 13
reincidindo por **classe**.

**Duas encerradas saíram por rastro cumprido** — **P-38** e **P-34**, pelo precedente da P-26. A
**P-36** e a **P-37** ficam mais uma sprint: foram encerradas **dentro** deste bloco.

**Arquivamento e backlog.** Plano e spec foram para `plans/archive/` e `specs/archive/`. Do
`backlog.md` saíram o **BD-16** e o **BD-10** que ele havia absorvido, junto dos 14 débitos que
pagaram (D-01, D-18 do `AppFileRow` e D-19…D-30). Duas coisas foram **resgatadas antes** de a seção
sumir, porque a única cópia delas morava lá: **DS-05** e **DS-07**, que o João deixou fora do bloco
por decisão, agora vivem em "Travados em decisão". **A colisão dos dois `D-18` terminou por
entrega, não por renumeração** — o gêmeo do `AppFileRow` foi pago e saiu, então o número voltou a ser
único sem ninguém mexer em ID alheio.

**O que fica aberto, e é a única coisa:** a **`main` avançou 21 commits** desde a base deste bloco
(entrou o `dashboard-frontend-analitico-e-redator`) e **14 arquivos são tocados pelos dois lados** —
`state.md`, `backlog.md`, `progress.md`, o índice e as fichas de pendências, `eslint.config.js`,
`DashboardPage.tsx`, os 3 locales, `brand-theme.css`, `tokens.ts`, `AppCard.tsx` e o barrel de
`shared/ui`. O merge é trabalho a fazer, não defeito — e os arquivos de doc vão conflitar por
construção, porque os dois lados fecharam bloco no mesmo período.
### Integração — 2026-08-18: merge da `main` (fechamento do `dashboard-frontend-analitico-e-redator`)

**A `main` andou 21 commits desde o `254d691` de onde este bloco partiu** — o PR #57 fechou o
`dashboard-frontend-analitico-e-redator` (B2 da Sprint 5) em 2026-08-17. As duas frentes correram em
paralelo por exceção declarada, então este merge é a costura prevista.

**Merge, não rebase, e a razão é a mesma de 2026-08-17: documental.** O fechamento deste bloco
**cita SHAs** — `state_basis_commit: 0a1918b` e o intervalo `86ec2dd..0a1918b` na linha do
`progress.md`. Rebase reescreveria todos eles e a prova da entrega passaria a apontar para commits
que não existem.

**Cinco conflitos: dois de documento e três de código.** Documento: `state.md` e `progress.md`.
Código: `DashboardPage.tsx`, `brand-theme.css` e `tokens.ts`. Auto-mergearam `backlog.md`,
`pendencias/README.md`, `pendencias/abertas.md`, `progress-archive.md`, `eslint.config.js`, os três
locales, `AppCard.tsx` e o barrel de `shared/ui`.

**Os dois conflitos de CSS e token eram adição pura dos dois lados** — o `accentText` daqui e o
`chartInks` da `main`; a tinta `danger` de botão `text`/`outlined` daqui e a linha transparente da
tabela lá. Ficaram os quatro; nenhum decidia sobre o outro.

**O conflito de `DashboardPage` era estrutural, e a resolução foi rastrear o código, não o arquivo.**
A `main` transformou a página no roteador de `kind` (admin × redator) e **extraiu o `SectionLabel`
para arquivo próprio**; este bloco tinha mudado, no mesmo trecho, **só o docblock** — a D-28 matou a
razão original da tinta de corpo (a secundária do claro desceu ao slate-600 e hoje mede 6,92:1 no
humo), e a tinta fica por hierarquia. Ficou o arquivo da `main` inteiro, e a medição foi portada para
`SectionLabel.tsx`. Resolver por arquivo teria apagado a estrutura nova ou perdido a medição.

> Herdado da extração da `main` e **não corrigido aqui**: o docblock do `SectionLabel` ainda diz que
> os dois registros "estavam escritos no docblock abaixo", e abaixo não há mais docblock nenhum — ele
> ficou no `DashboardPage`. Comentário alheio se menciona, não se reescreve no meio de um merge.

**O frontmatter foi lido antes do push, que é exatamente o que a lição da `main` pede** (ela nasceu
de um frontmatter auto-mesclado que ninguém escreveu e que ficava **verde**). Os dois lados estavam
`idle`; venceu a entrega mais recente — `last_completed_work_item: bd16-perfil-e-kit-compartilhado`,
`state_basis_commit: 0a1918b`, `updated_at` de 2026-08-18.

**A escada de itens fechados ficou com os dois fechamentos** — BD-16 como último, o B2 do Dashboard
como penúltimo — e desceu um degrau: o `dashboard-backend-agregacoes` (2026-08-15) saiu do arquivo,
como o `celula-de-identidade` saiu no fechamento anterior. No `progress.md` as duas linhas de entrega
ficaram e o **BD-5** desceu **verbatim** para o `progress-archive.md`, mantendo as dez.

**Os números foram contados, não herdados** — é a classe de deriva que o merge de 2026-08-17 pegou.
Pendências: **29 abertas e 2 encerradas**, com o índice batendo ficha a ficha (zero ID de diferença
nos dois sentidos). Locales: **698 chaves idênticas** nos três. Desta vez não havia deriva a
corrigir.

**Gate depois do merge:** `pnpm build` verde, `pnpm lint` 0, **59 arquivos / 368 testes** — os 54/327
deste bloco mais os 5 arquivos e 41 testes que a `main` trouxe.
