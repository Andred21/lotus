---
schema_version: 1
active_feature: profundidade-backend-b4-b7
active_work_item: profundidade-backend-b4-b7
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
resume_state: null
active_spec: docs/superpowers/specs/2026-08-07-profundidade-backend-b4-b7-design.md
active_plan: docs/superpowers/plans/2026-08-07-profundidade-backend-b4-b7.md
context_packet: null
blocker: null
review_findings_approved: null
last_completed_work_item: certificacao-sprint-4
state_basis_commit: 5787f94
updated_at: 2026-08-07T23:45:00-03:00
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

## Item ativo — 2026-08-07 (`profundidade-backend-b4-b7`)

**Item 2 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-07** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). Rota direta a `ready_for_planning` **sem packet, por ausência medida de fonte externa**
(mesmo caso do bloco `profundidade-form-crud`): as fontes são o repositório e o relatório local do
review de arquitetura de 2026-08-07 — nada de Drive/Notion/Figma. O João declarou a dispensa no
próprio argumento do comando.

**Passo 0 executado antes da seleção, na mesma sessão:** a skill `improve-codebase-architecture`
não existe nesta máquina (o João a rodou fora), então a re-verificação foi manual, alegação por
alegação, contra o código real. Resultado: B1–B3 confirmados resolvidos (`CertificateEligibility`,
`Data/Snapshot/` com `schema_version`, `App\Shared\Pdf`); **B4–B7 todos ainda válidos** — B4 com 8
sítios medidos da cadeia em 3 domínios, B5 com o lazy load do `result` confirmado, B6 com `grades`
ainda `['nullable','array']` e action pass-through, B7 com setUps de 40–98 linhas em 8 arquivos
(cresceu desde o relatório). Nada novo material no backend. O merge do bloco anterior já estava
feito pelo João (PR #31); `main` local avançou por fast-forward para `9ed46cc`.

**Brainstorming de 2026-08-07 — decisões do João:** B6 fica **declarada pelo admin** (derivar
exigiria inventar regra de corte sem fonte; a leitura futura da nota do docx de evaluación é
deferred com bloco próprio, muda ADR/RN); B4 ganha **catraca da cadeia** (teste-grep, não
reflection — mini-framework rejeitado); B5 cobre **os 4 models medidos** (Enrollment, Quote,
Client, Course — nem só o bug, nem todos os models). Corte e ordem definidos por ele na abertura:
B4 → catraca → B5 → B6 → B7 → gate, um bloco. Design aprovado em 6 seções; spec em
`docs/superpowers/specs/2026-08-07-profundidade-backend-b4-b7-design.md`.

**Backend-only, main tree (P-03), zero schema — ADR/DER não abrem.**

**Plano escrito em 2026-08-07 — 10 tasks (0–9), `executor: claude` (SDD).**
`docs/superpowers/plans/2026-08-07-profundidade-backend-b4-b7.md`. A escrita do plano achou
**quatro desvios contra a spec aprovada, declarados no §Desvios em vez de silenciados** (lição 13):
D-P1 — `ContratanteData` não pode morar em `Commercial/Data` como a spec D2 pedia, porque a Regra A
do `DomainDependencyTest` só expõe `Models/Enums/Services`; vai para `App\Shared\Data`, a D12 mora
em `Client::contratante()` e a dependência Certification→Commercial some por mediação (Operation)
em vez de virar aresta — e `generated.ts` **não muda**. D-P2 — `AcademicResult` vai para
`Operation\Services` (mesma Regra A; precedente `IssuanceContext`), com a aresta
`Certification → Operation\Services\AcademicResult` declarada na matriz. D-P3 — os sítios da cadeia
são 10, não 8: `EnrollStudentAction:31` precisa do **model** (`Turma::contratanteClient()` nasce) e
`manual-turma.blade.php:21` está fora de `app/` (a catraca varre blades; strings de eager-load
ficam fora por serem carga, não projeção). D-P4 — o builder de cenário não tem `->jaEmitido()`:
emissão é ato do teste, não setup.

### Execução iniciada em 2026-08-07 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/profundidade-backend-b4-b7` a partir de `main` (`1474f6b`). **Task 0** confirmou o
baseline exato do plano: 457 passed, 1 skipped (1655 assertions). **Task 1** (`ContratanteData` +
`Client::contratante()`) entregue e aprovada no review de task, com um achado Importante do próprio
brief: o caminho do teste (`tests/Feature/Commercial/`, grafia inglesa) criava uma segunda pasta
para o domínio Comercial, que já tem 40+ testes em `tests/Feature/Comercial/` (grafia portuguesa).
**Decisão do João:** o teste migra para a pasta existente — `Comercial/`, não `Commercial/`. Fix
aplicado e re-review aprovado. Placar: 458 passed, 1 skipped (1658 assertions). Commits
`d926faf`…`06f869b`.

**Task 2** (seams `Turma::contratanteClient()`/`contratante()`, `Quote::contratante()`) aprovada
sem achados. Placar: 461 passed, 1 skipped (1665 assertions). Commit `55ccb1d`.

**Task 3** (migração dos 8 sítios) expôs um gap real: `Client::contratante()` exige `user->rut`
não-nulo, e ~8 arquivos de teste em `tests/Feature/Operation/` nunca setavam `rut` (só liam
`legal_name`/`client_name`) porque a decisão Q-4 (2026-08-04) deixa o trait compartilhado
`CreatesDomainRecords::makeClientWithUser` sem default de `rut` de propósito. O subagente parou
(`BLOCKED`) em vez de escolher sozinho entre nullable na VO, accessor mais leve ou default no
trait. **Decisão do João: fixtures explícitas** — os ~8 arquivos de teste passam a setar `rut` via
`$userOverrides`, mesmo padrão que Q-4 já estabelece; `ContratanteData`, `Client`, `Turma`, `Quote`
e o trait compartilhado ficam intocados. Fix aplicado, re-review aprovado, placar de volta ao
baseline exato: 461 passed, 1 skipped (1665 assertions). Commits `3f8b671`…`4f89f2f`.

**Task 4** (catraca `ContratanteSeamTest`) aprovada. O regex varre acesso a propriedade
`->budget->client` em `app/Domains/**` (comentários strippados por `token_get_all`, mesma técnica do
`DomainDependencyTest`) e em `resources/views/**` (RAW — Blade não passa pelo tokenizer do PHP puro),
com allowlist dos dois donos do seam. String de eager-load (`'quote.budget.client'`) fica fora de
propósito (D-P3): é carga de query, concern dos builders, não travessia de código. Placar: 462/1/1666.
Commit `efeda0a`.

**Task 5** (`EnrollmentQueryBuilder` + o lazy-load do `result`) aprovada com um desvio de RED
documentado e verificado duas vezes. A abordagem literal do brief (`Model::preventLazyLoading(true)` +
`putJson`) **não conseguia reproduzir o bug**: `Illuminate\Database\Eloquent\Builder::hydrate()` só
liga o flag `preventsLazyLoading` por instância quando `count($items) > 1`, e busca singular
(route-model-binding, `find`, `firstOrFail`) nunca satisfaz isso. O subagente investigou em vez de
chutar, provou no `tinker`, e passou a chamar `EnrollmentController::result()` direto contra um
`Enrollment` hidratado com 2 linhas. Conferido de forma independente por mim contra o fonte real do
vendor, e de novo pelo revisor. Placar: 463/1/1668. Commit `f10e3ee`.

**Task 6** (builders de Quote/Client/Course) aprovada, refactor puro, placar idêntico ao da Task 5.
Commit `90deba0`.

**Task 7** (`AcademicResult` + `PrintableGrade` na escrita + snapshot lendo do VO) aprovada com um
segundo desvio documentado, este imposto pelo Pint: a forma literal do brief (`$resultado =
$enrollment->academicResult();` como variável solta) deixava o `use ...\AcademicResult` sem nenhum
type-hint no arquivo, e o fixer `no_unused_imports` **removeria o import — quebrando em silêncio
justamente a aresta que o `DomainDependencyTest` precisa provar**. Resolvido extraindo um método
privado tipado `resultadoSnapshot(AcademicResult $resultado)`. O revisor reproduziu o conflito num
arquivo de sonda isolado antes de aceitar. Placar: 473/1/1690. Commit `cedb633`.

**Task 8** (`IssuableEnrollmentBuilder` + migração dos 8 setUps de Certification) aprovada, com
contagem antes/depois idêntica em cada um dos 8 arquivos. `->jaEmitido()` **não** entrou no builder
(D-P4 respeitado). Duas colisões de índice único apareceram só em `CertificateEligibilityTest`, que
materializa 7 cadeias no mesmo `setUp`: `budgets.code` (resolvido com `null` no builder, que nunca
expõe o Budget) e `users.rut` (resolvido **no arquivo consumidor**, com um helper local que anula os
RUTs das 6 cadeias reprovadas — sem expandir a interface do builder). O efeito colateral (cada
cenário reprovado deixa de compartilhar client/course/redator com o emitível) foi verificado como são
contra a ordem real de execução das portas do `CertificateEligibility`. Placar: 473/1/1690, idêntico
ao da Task 7. Commit `5787f94`.

### Task 9 — o gate (2026-08-07)

Executado por mim direto, não por subagente: é a prova do DoD do bloco inteiro, e o DoD pede
comportamento provado contra a API real, não mais uma camada de alegação reportada.

**Ferramentas.** Suíte backend **473 passed, 1 skipped (1690 assertions)**. Frontend sem regressão:
`pnpm test` 10 arquivos / 35 testes, `pnpm lint` limpo, `pnpm build` OK. Pint `passed` nos **44**
`.php` tocados do bloco, zero reescrita. `typescript:transform` rodou e `generated.ts` ficou **sem
diff** — a prova do **D-P1**: `ContratanteData` e `AcademicResult` são VOs internos e **não vazaram**
para o front.

**Mecanismos vistos reprovando (lição 10), com sondas frescas.** A catraca foi provada nos **dois**
modos de varredura, em arquivos diferentes dos da Task 4: `EnrollStudentAction.php:22` (PHP) e
`certificate.blade.php:262` (Blade). Reprovou nomeando os dois com a linha exata; sondas removidas,
árvore limpa, verde de novo. A aresta do B6 foi provada removendo a linha
`'Operation\Services\AcademicResult'` da matriz — reprova nomeando `CertificateSnapshotBuilder.php`
— e repondo.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(lição 12). Duas armadilhas que valem para o próximo e2e: sem `Origin: http://localhost:5173` o
`statefulApi()` não liga a sessão e o login devolve **500 "Session store not set on request."**; e o
`XSRF-TOKEN` **rotaciona no login** (regeneração de sessão anti session-fixation), então reusar o
token do `/sanctum/csrf-cookie` depois do `POST /api/login` dá **419 "CSRF token mismatch"** — tem
que reextrair do cookie jar.

1. `PUT .../resultado` com `grades.final = "6,9"` → **200**; com `grades.final = []` → **422** RFC
   7807, `"La nota final debe ser un número o un texto no vacío."` (es-CL).
2. `GET /api/certificates/issuable` → turma listada, `client_name` = razão social.
3. `POST /api/enrollments/{id}/certificate` → **201**. **A prova viva do seam foi conferida no MySQL
   com SQL cru**, não pela projeção do model: `snapshot.cliente.name` = `clients.legal_name`
   (`Enel Distribucion Chile S.A.`), enquanto o `users.name` do mesmo cliente é `USUARIO-EMPRESA
   Enel`. **Os dois textos precisaram ser deixados diferentes à mão no fixture** — o
   `OperationDemoSeeder` grava `name == legal_name` de propósito (comentário no próprio seeder), e
   com eles iguais o e2e passaria mesmo se o regresso A-1 tivesse voltado. Nota para o próximo gate
   que tocar esse caminho: **o cenário de demo não distingue as duas colunas; quem for provar o seam
   tem que diferenciá-las antes.**
4. `GET /api/certificates/{id}/pdf` → **200 `application/pdf`**, `pdfinfo` 2 páginas, **A4**
   (594.96 x 841.92 pts). Inspeção visual da página 1: o documento **imprime a razão social**, não o
   `user.name` — o seam chega intacto ao papel com peso legal.
5. `GET /api/turmas/{id}/alunos` → **200**, 15 matrículas, todas com o aluno aninhado — o
   `EnrollmentQueryBuilder` em produção, sem lazy-load. (A rota real é `/alunos`; o brief a chamava
   de `/enrollments`.)

Placar task a task, os desvios e os **6 achados Minor** acumulados nas Tasks 4–8 ficam registrados em
`.superpowers/sdd/progress.md`, para triagem do review final whole-branch. Nenhum Minor foi corrigido
por decisão própria: o review final decide o que entra antes do merge.

## Último item fechado — 2026-08-07 (`certificacao-sprint-4`)

### Gate de fechamento — 2026-08-07

**O item 0 foi provado contra a API real, não pela suíte** (lição 12; o D-P8 partiu o item em dois e
deixou aqui a cadeia até a API pública). Sessão Sanctum por cookie → `GET /api/certificates/issuable`
(1 turma, 9 matrículas) → `POST /api/enrollments/25/certificate` **201, `LOT-2026-1004`** →
`GET .../pdf` **200 `application/pdf`, 44.570 bytes**, `pdfinfo` diz **A4 (594.96 × 841.92 pts)** →
`POST .../revoke` **200**, e o **MD5 da coluna `snapshot` é idêntico antes e depois**
(`f46b7cb2…`) → `GET /api/publico/certificados/<uuid>` **sem cookie, 200**, com o payload público e
`status: revocado`.

**As correções Q-1 a Q-4 foram provadas na mesma passada, contra o MySQL e o PDF real:** a sonda que
demonstrou o 🔴 (ler o snapshot, salvar outro campo) agora responde **`REESCREVEU? NAO`** com
`layout_config`/`orientation` intactos; o PDF traz **"El trabajador logró aprobar el curso con nota
6,4."** — a nota que o filtro `is_numeric` apagava; e corromper `aluno.name` na coluna faz a rota
pública do QR devolver **500 RFC 7807** em vez de 200 dizendo `emitido` com nome vazio.

**Achado do gate, registrado e NÃO tocado:** o certificado de uma turma cujo curso tem
`description` de **3.689 caracteres** (o seed de demo repete o parágrafo ~20×) sai em **3 páginas**,
com o rodapé/QR/assinatura transbordando para a página 2. É o Q-6 do review da Task 15 — rodapé e QR
absolutos sobre fluxo de tamanho ilimitado —, não regressão deste bloco: o certificado 2, com
descrição normal, continua em **2 páginas e 41.766 bytes**, exatamente como a Task 16 mediu. Herdado
pelo bloco de frontend, junto com o Manual de Classe em Letter.

**Demais itens do gate:** suíte 457 passed, 1 skipped (1655 assertions) · `pnpm lint` e `pnpm build`
verdes · Pint `passed` nos 16 arquivos · `typescript:transform` sem diff · matriz de domínios com as
8 arestas · 7 rotas de certificação no `route:list` · zero `abort(4xx)` fora do 404 de recurso
inexistente · alias `certificate` no morph map.

**Pendências revisadas:** P-15 e P-21 tiveram o gatilho vencido por este bloco e foram reescritas —
a P-21 agora espera **decisão do João sobre o formato do registro** do `simple-qrcode` (ADR próprio
ou nota), mesma decisão pendente do P-20. Nenhuma pendência fechou; nenhuma nasceu.

**Arquivamento assimétrico, de propósito:** o plano foi para `plans/archive/`, a **spec não** — as
Tasks 9–13 migraram inteiras para o bloco de frontend da certificação (D-P8), que é o último
consumidor dela. O item 1 do backlog não saiu: **encolheu** para o frontend que sobrou.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-05** (`/planejar-bloco`
com o item nomeado literalmente no argumento — "Bloco 7 · Sprint 4 · Certificação" — e o estado em
`idle`; o comando não promove item sozinho). O item já estava na fila; a edição que o **promoveu da
posição 3 para a 1** e reescreveu o corpo dele (contexto obrigatório, decisões a fechar, exigência
de packet) é do João e estava na árvore sem commit — entra neste commit, porque é o artefato que
prova a seleção.

**O id não promete o corte.** `certificacao-sprint-4` nomeia a vertical, não o que sai numa branch:
o item pede emissão, numeração, template oficial, PDF sob demanda, histórico e validação pública por
QR. O corte é decisão do brainstorming; o id é renomeável na revisão da spec, como já ocorreu duas
vezes.

**Rota `context_required`, e desta vez o próprio item a exige.** Diferente do bloco anterior (que
foi direto a `ready_for_planning` por ausência **medida** de fonte externa), aqui o backlog escreve
que os arquivos visuais e documentos de referência **devem** entrar no packet: doc canônica do Drive
sobre Certificação/Curso/Turma, tasks 8.x da Sprint 4 no Notion, prints do protótipo (emissão,
histórico, validação) e os dois documentos oficiais da Lotus — **certificado** e **Manual de
Classe** —, que fixam campos fixos × dinâmicos. Nenhuma dessas fontes é medível no repositório, e as
três decisões abertas dependem delas.

**Ponto de partida medido aqui, para o packet reconciliar e não redescobrir** (lição 13):

1. **As duas tabelas não existem** — zero migration `certificates`/`certificate_sequences`;
   `docs/der-fisico.md:73-74` as descreve como planejadas. O domínio
   `backend/app/Domains/Certification/` **existe e está vazio** (7 pastas, nenhum arquivo).
2. **O contrato público do QR já tem as duas colunas no papel, e é daí que a decisão nasce:** o DER
   dá a `certificates` **`uuid UK` e `qr_code_hash UK` ao mesmo tempo**. `hash × UUID` não é escolha
   entre desenhos rivais — é escolher qual dos dois campos previstos vira o identificador público.
3. **Template de certificado já é feature entregue, e mora em `Catalog`, não em `Certification`:**
   `CourseCertificateTemplate`, `CertificateTemplateData` e `CourseTemplateController` com 3 rotas
   (`POST courses/{course}/templates`, `PUT|DELETE templates/{template}`); o DER dá à tabela
   `version` (int) e `validity_months` (nullable). **Versionamento e vigência já têm coluna** — o
   aberto é o snapshot no ato da emissão e o mapeamento do documento oficial no `layout_config`
   (json).
4. **PDF sob demanda pelo Gotenberg já roda em produção, e o precedente é do próprio Manual de
   Classe:** `ManualPdfService` (RF-TUR-04) renderiza Blade e converte por HTTP, com docblock
   declarando "**mesmo racional do certificado RF-CER-03**" — nada materializado. ADR-12 decide o
   mecanismo; não há o que reabrir.
5. **As 3 permissões já existem** no `PermissionCatalog` (`certification.certificate.view|issue|revoke`,
   a última marcada como peso legal), a navegação já lista `/certificados` gateada por `view` e a
   rota **aponta para `ModulePlaceholder`**. RBAC e entrada de UI não nascem neste bloco; a tela,
   sim.

**Toca `backend/` com migration nova → main tree, sem worktree (P-03).**

### Packet gerado em 2026-08-05 pelo Codex — `status: blocked`

**O packet existe e está salvo** em `docs/superpowers/context-packets/certificacao-sprint-4.md`,
mas **`context_packet` segue `null` de propósito**: packet `blocked` não promove nada, e a
invariante exige packet válido antes de `ready_for_planning`. O arquivo fica como evidência da
varredura — 10 documentos do Drive por ID, 16 tasks do Notion pela base canônica
(`e64b7d57-…`, a homônima obsoleta **não** foi consultada) e 1 fonte `unavailable` — para que a
regeneração pós-decisão não repita o trabalho.

**Contrato conferido, não aceito por relatório:** markers exatos, frontmatter completo com
`plan_*`/`spec_*` em `null` (os ponteiros do estado são nulos), 8 key facts (no teto), o excesso de
artefatos externos justificado no próprio registro, a fonte Figma marcada `unavailable` com a linha
de erro (`INVALID_ARGUMENT: Invalid fileKey argument` — o Drive só tem o site publicado, sem
fileKey/node ID), e nenhum gatilho de staleness citando hash de provenance ou a transição
promotora. **Os 3 blob SHAs foram recalculados aqui com `git hash-object` e batem** — `base_commit`
`e23c913`, `state.md` `4ce96f2`, `progress.md` `1043c4e`.

**A medição local foi confirmada pelo packet** (key fact 8): migrations ausentes, `Certification`
vazio, template versionado em `Catalog`, Gotenberg existente, 3 permissões e `/certificados` ainda
`ModulePlaceholder`.

**O que o packet trouxe e o repositório não sabia:**

1. **A emissão é manual e o gate é só acadêmico** — matrícula aprovada em turma concluída; o
   financeiro não entra, o que confirma a lei §5.7 no caminho mais sensível do produto.
2. **A numeração externa é `LOT-ANO-SEQ`**, incremental e atômica por ano, com um único exemplo
   real (`LOT-2026-016`).
3. **Os campos fixos × dinâmicos dos dois documentos oficiais estão mapeados** — no certificado,
   marca OTEC/RUT/cláusulas/narrativa/temário são fixos ou versionados, e `CodCert`, datas,
   aluno/RUT, empresa/RUT, curso, horas, nota e relator são dinâmicos. **Nenhum dos três exemplares
   oficiais exibe vigência ou placeholder de QR**, o que é fato contra a leitura antiga do Drive.
4. **A divergência do QR é entre fontes externas, não entre Drive e código:** o Drive e a 8.1.9
   prescrevem `qr_code_hash`; a 8.2.1 prescreve `/validar/{uuid}`. A task **8.0.3 existe
   justamente para consolidar um contrato público único** — o packet registra e não decide, como
   deve.
5. **Uma divergência foi resolvida por hierarquia, não apagada:** o Drive antigo manda o download
   usar os **dados atuais**; a instrução vigente no backlog manda **snapshot no ato da emissão**. A
   instrução atual do João vence o snapshot antigo, e isso está na tabela.

**Os 3 fatos que bloqueiam, e por que bloqueiam de verdade:** vigência, padding/overflow da
numeração e representação de múltiplos redatores no certificado. São **regra de negócio em
documento de peso legal** — o §3 do `CLAUDE.md` e a própria SKILL mandam bloquear em vez de supor.
O `hash × UUID` **não** entra como bloqueio de packet: é decisão de desenho do João no
brainstorming, e o packet já entrega os dois lados medidos.

### Bloqueio resolvido pelo João em 2026-08-05 — três decisões de regra de negócio

Respostas explícitas do João, que são fonte canônica de topo da hierarquia (instrução vigente vence
snapshot de Drive). Elas desbloqueiam o packet; o estado volta a `context_required` para a
regeração.

**RN-CER-01 — vigência: o padrão é NÃO ter validade, e o campo existe para a exceção.** Certificado
nasce sem vencimento; `valido_ate` fica nulo por padrão. O campo permanece porque algum certificado
pode ter vigência — o que reconcilia as três leituras contraditórias das fontes: "tempo
indeterminado" é o **padrão**, `valido_ate`/`vigencia_meses` é a **exceção**, e o estado "expirado"
só existe para quem tem data. Isso também explica por que **nenhum dos três certificados oficiais
exibe vigência**: eles são o caso padrão.

**RN-CER-02 — numeração segue e passa de 3 dígitos sem tratamento especial:** depois de
`LOT-ANO-999` vem `LOT-ANO-1000`. Não há teto nem rollover a desenhar — a sequência anual
simplesmente cresce. O João acrescentou que **o código pode carregar referência à turma que o
gerou**; isso muda o formato de `codigo` (coluna `UK`, visível no documento legal) e por isso é
**decisão de desenho do brainstorming**, não fato de packet. Fica registrado que o único exemplo
real medido é `LOT-2026-016`, com 3 dígitos zero-padded.

**RN-CER-03 — um relator por certificado, escolhido pelo admin na emissão.** A operação do cliente é
**1 redator por vez**; o N:N que o Bloco 6b introduziu existe para a **troca durante o curso**, e a
auditoria guarda o histórico da troca. Quando a turma termina com mais de um redator associado e o
sistema está pronto para emitir, **o admin escolhe a assinatura** — o `RELATOR` singular do
documento oficial não é defasagem do documento, é o comportamento correto.

**Observação do João, que é restrição de escopo:** as **assinaturas não serão indexadas ainda** —
como viabilizar ainda será discutido com o cliente. O bloco deixa o caminho **preparado** para
quando as assinaturas dos redatores existirem, sem construir o armazenamento agora (lição 3: não
construir para consumidor hipotético; o que se preserva é o ponto de extensão, não a feature).

**Segue aberto para o brainstorming, e não bloqueia o packet:** o contrato público do QR
(`hash` × `UUID`, task 8.0.3) e o formato final do `codigo` com a referência de turma.

### Packet regerado em 2026-08-05 — `status: partial`, promovido

`docs/superpowers/context-packets/certificacao-sprint-4.md`, refresh do próprio packet anterior:
o registry foi **reutilizado por ID**, sem refazer a varredura ampla, e as três decisões entraram
como fonte `J-DEC` (instrução vigente do João + esta seção do `state.md`). As três linhas
`unresolved` da tabela de divergências fecharam com base na instrução vigente, sem apagar o
enunciado externo que elas contradizem.

**`partial`, não `ready` — e o motivo é uma fonte só:** o Figma segue `unavailable`, com a mesma
evidência admissível de antes (chamada feita, `INVALID_ARGUMENT: Invalid fileKey argument`; o Drive
só guarda o site publicado, sem fileKey/node ID). Pela SKILL, `partial` prossegue e a fonte ausente
vira limitação declarada do brainstorming: **as três telas terão comportamento vindo do Drive/Notion
e composição visual sem referência recuperada** — o mesmo tipo de limitação que os blocos de
2026-08-02/03 aceitaram para a prova visual, e que o checkpoint do João cobre.

**Contrato reconferido:** 8 key facts (no teto), Open questions só com o que ainda pode mudar
implementação e **nenhuma bloqueante**, restrição das assinaturas registrada em Constraints **e**
Deferred (é limite de escopo, não pergunta), e nenhum gatilho de staleness citando hash de
provenance ou a transição promotora. **Provenance recalculada aqui e batendo:** `base_commit`
`492f8f8`, `state.md` `936f35e`, `progress.md` `1043c4e`.

**Dois fatos do packet que mudam o ponto de partida do desenho, além das três RN:** a emissão aceita
**lote**, não só individual (telas 8.2/8.3), e a `8.1.5` pede **PDF → S3 → URL temporária sem
intermediário** — que casa com o transformer de URL assinada entregue no bloco anterior, e não com
um endpoint que faça streaming pela app.

### Brainstorming de 2026-08-05 — o corte, e as quatro medições que o antecederam

**Sétima ocorrência da lição 13 no projeto.** Quatro fatos do repositório contrariam doc, ADR ou
task, e todos mudaram o desenho antes de ele existir:

1. **O gate acadêmico não tem escritor em produção.** `enrollments.approval_status` nasce `pendiente`
   e **nada em `backend/app/` o escreve** — o `EnrollmentData` declara em docblock que "a escrita é
   6d", e o 6d fechou sem entregar. O único escritor é o `OperationDemoSeeder`, que registra a
   exceção no próprio docblock. Emissão gateada por `aprobado` **nunca dispararia em produção**, e o
   DoD deste projeto não aceita prova contra dado de seed.
2. **`spatie/laravel-pdf` ^2.12 e `simplesoftwareio/simple-qrcode` ^4.2 estão instalados com zero
   uso** em `app/`, `config/`, `tests/` e `resources/`. O ADR-12 manda o primeiro; o único PDF de
   produção chama o Gotenberg por `Http::attach` cru. Lição 1, agora com pacote pago em disco.
3. **A entrega do PDF diverge em três fontes:** ADR-12 ("stream direto para S3"), task 8.1.5 ("S3 →
   URL temporária sem intermediário") e o precedente real (`TurmaController::manual`, binário pela
   app).
4. **`course_certificate_templates` já existe desde 2026-07-08 e o `layout_config` não tem um único
   consumidor** — nada renderiza aquele JSON, que é exatamente onde o documento oficial se mapeia.

**Corte escolhido pelo João: fatia vertical fina** — emitir um certificado, baixar o PDF com QR,
validar publicamente e revogar, com as telas mínimas. As alternativas (backend inteiro sem tela, ou
só fundação) adiavam a única prova que importa num módulo cujo valor é o papel escaneado.

**Quatro decisões do João no desenho:** o **escritor mínimo do resultado acadêmico entra** (sem ele o
módulo é inalcançável em produção); o identificador público é **só o `uuid`**, e `qr_code_hash` não
nasce — o argumento do hash é rotacionar URL, e URL impressa em papel não rotaciona; **`codigo` puro**
`LOT-ANO-SEQ`, com a turma vivendo na relação e não dentro de uma coluna `UK` impressa para sempre;
e a **revogação entra**, porque sem ela o valor `revocado` do enum nasceria sem produtor e a tela
pública prometeria um estado inalcançável.

**Três decisões nasceram no desenho e estão na spec:** `certificates` **sem soft delete** e
`enrollment_id` **sem UK** — com UK estrito, certificado revogado por erro nunca poderia ser
reemitido, e soft delete não libera índice (lição 8), então a unicidade vira "um certificado
**vigente** por matrícula" por índice em coluna gerada, provado contra MySQL real (lição 15); a
emissão exige **template do curso** (certificado sem template aprovado é narrativa inventada); e a
**matriz de domínios abre pela primeira vez**, com 6 arestas justificadas uma a uma — o
`DomainDependencyTest` declara `'Certification' => []` de propósito, dizendo em docblock que cada
import exigiria decisão explícita.

**Duas descobertas de fronteira que mudaram onde o código mora:** a emissão **não** cabe na tela da
turma (`TurmaDetailPage` é `operation`, e chamar a API de certificação de lá quebra a lei §5.6), e o
`SessionBootstrap` precisa **descer para dentro do router** — hoje ele envolve o `AppRouter` inteiro,
então quem abre o QR pelo celular espera um `GET /api/me` que vai dar 401 antes de ver a validação.

Spec: `docs/superpowers/specs/2026-08-05-certificacao-sprint-4-design.md` — 21 decisões, 8
invariantes de comportamento e gate com item 0 próprio (o QR escaneado abrindo a validação real,
provado **sem cookie** na ponta pública). Aprovada pelo João em 2026-08-05.

### Plano escrito em 2026-08-05 — 15 tasks, `executor: misto`

`docs/superpowers/plans/archive/2026-08-05-certificacao-sprint-4.md` (arquivado no fechamento de
2026-08-07). Ordem: 0 baseline e branch · 1
escritor do resultado acadêmico · 2 schema + models + matriz de domínios · 3 numeração atômica ·
4 snapshot · 5 emissão com as 4 portas · 6 leitura/`issuable`/revogação · 7 PDF com QR · 8 rota
pública · 9 `/validar/:uuid` · 10 histórico · 11 emissão/revogação/download · 12 resultado na tela
da turma · 13 checkpoint visual do João · 14 gate.

**Atribuição do João: backend → Codex (tasks 1–8), frontend → Claude (9–12).** Tasks 0 e 14 com
Claude, 13 com o João. `paths_autorizados` do Codex fecha em `Certification/**`, os 4 arquivos de
Operation do escritor acadêmico, `AppServiceProvider`, `config/app.php`, a migration, a view, os
testes e `generated.ts` — **nada** em `frontend/src/features/**`, `frontend/src/app/**` ou `docs/`.

**A escrita do plano achou três divergências contra a spec aprovada, todas declaradas no próprio
plano em vez de silenciadas** (§Desvios):

1. **A spec não previu de onde o diálogo de emissão tira os candidatos.** O diálogo mora em
   `features/certification` (D18) e **não pode** importar `features/operation` (lei §5.6); sem
   endpoint próprio a UI quebraria a lei ou re-derivaria as 4 portas no cliente. Entra
   `GET /api/certificates/issuable`. O filtro "sem certificado vigente" roda **do lado de
   Certification** (`pluck('enrollment_id')` + `whereNotIn`), porque uma relação
   `Enrollment->certificate` seria aresta Operation → Certification, que não existe.
2. **São 7 arestas de domínio, não 6.** O §5 da spec manda o gate provar "as 6 arestas declaradas —
   nenhuma a mais", mas a porta 1 (turma concluída) exige `Operation\Enums\TurmaStatus`, que a lista
   da spec omitiu. Com 6 a execução baterá numa contradição; a matriz nasce com 7.
3. **`config/app.php` não tem `frontend_url`** (medido). O QR aponta para
   `<FRONTEND_URL>/validar/{uuid}` e ler `env()` em runtime quebra com config cacheado — vira chave
   de config, não `env()` solto.

**Placar declarado, task a task:** backend 378 → 384 → 387 → 390 → 394 → 402 → 410 → 415 → **419**;
frontend fica em **35** (o projeto só testa unitariamente hooks de `shared/`), e a Task 11 usa esse
número como sinal: extrair `problemFromBlob` para `shared/api` não pode mudar a contagem.

**Três provas que não aceitam sqlite** (lição 15): o índice único na coluna gerada (Task 2), a
sequência sob `lockForUpdate` com duas conexões (Task 3) e a unicidade na emissão (Task 5) rodam
também contra o MySQL do compose.

### Corte alterado em 2026-08-05 pelo João — o frontend vira bloco próprio (D-P8)

Decisão tomada **depois da Task 8 e antes da Task 9**, com o backend inteiro entregue e commitado
(`cfe37a0` … `cb30ba5`). Dois motivos novos, ambos externos ao repositório e nenhum deles conhecido
quando a spec foi aprovada: os **dois documentos oficiais da Lotus** entraram na sessão (o
certificado `Roles y Responsabilidades del Jefe de Faena` e o `Libro de Control de Clases`), e os
**prints do protótipo Figma** vão entrar — a fonte que o packet declarou `unavailable` e que o
brainstorming aceitou como limitação. O João registra também que **certificados tem módulo próprio
na interface**, o que a spec não modelou.

Tasks 9–13 **migram inteiras**, não são canceladas. Consequências declaradas no plano, não
escondidas: `generated.ts` fica com DTOs sem consumidor até o bloco seguinte (dívida com prazo), a
invariante §4.2 migra junto, e o item 0 do gate parte em dois — a cadeia até a API pública sem
cookie continua exigida aqui; só a ponta renderizada no navegador migra.

**Fila que o João desenhou:** (1) revisão em duas frentes do backend — feita, abaixo; (2) aproximar
os Blades dos documentos oficiais, com o Manual de Classe recebendo melhoria além da cópia; (3)
replanejar o frontend com os prints e o módulo próprio.

### Revisão em duas frentes — 2026-08-05, backend do bloco

Pedida pelo João: padronização contra as demais entidades, leis/rules, e conformidade com spec e
plano. Frente Codex (`mcp__codex__codex`, read-only) e frente Claude, independentes.

**Limpo nas duas frentes, medido aqui e não aceito por relatório:** leis §5 sem violação (zero
Repository, zero `abort(422)`, alias `certificate` no morph map, `generated.ts` gerado); rota
pública sem RUT/id/nota/motivo; PDF sem materialização; unicidade do vigente, reemissão pós-revogação
e terminalidade da revogação implementadas; suíte **426 passed + 1 skipped**, matriz com as 7
arestas, Pint verde nos 36 arquivos, `migrate:fresh --seed` no MySQL.

**O gate reprova por duas invariantes sem teste** (§4.5 auditoria com `user_id` — a emissão não tem
teste nenhum e a da revogação só conta linhas; §4.7 PDF não materializado — nenhum teste afirma).

**Achado 🔴 confirmado: o certificado imprime o nome errado da empresa.**
`CertificateSnapshotBuilder` congela `client->user->name`; a D12 pede **razão social**, que é
`clients.legal_name` — comentada `// razón social` na própria migration e usada por
`TurmaData`, `PendingQuoteData`, `StudentData` e pelo `IssuableTurmaData` **deste mesmo bloco**. O
teste não só deixa passar: ele **fixa o valor errado**, com fixture que separa de propósito
`legal_name = 'Empresa Legal SpA'` de `user.name = 'Empresa Cliente'` e assere o segundo.

**Decisão do João: corrigir o 🔴, os 🟡 e as duas lacunas do gate; os 🟢 viram débito.** Feito em
`5158b16`. Além do A-1: **A-2** (`issuable` só encapsulava a porta do template e listava turma que o
POST recusa com 422 — a regra da cidade virou `CertificateTemplateResolver::emissionCityFor`, fonte
única da Action, do `issuable` e do snapshot, que tinha a terceira cópia; a porta do redator virou
`whereHas('redatores')`), **A-3** (três `now()` numa emissão só, com o lock da sequência no meio: a
virada do ano gravava `emitido_em` de 2027 num código `LOT-2026`) e **A-4** (`RevokeCertificateData`,
porque a revogação validava por `$request->validate` enquanto todo o projeto valida em `Data`).

**Débitos registrados, não corrigidos:** `abort(404)` é o único `abort()` de `backend/app/` e o
route-model-binding `{certificate:uuid}` funcionaria; `uuid` gerado na Action e não no `booted()` do
model, como faz `User` — morde quando a emissão em lote entrar; `der-fisico.md:73` ainda descreve
`enrollment_id FK,UK` e `qr_code_hash UK`, os dois que a D3 recusou; e a corrida entre
`RecordEnrollmentResultAction` e `ConcludeTurmaAction`, que o Codex marcou 🔴 e **não é achado deste
bloco** — é a convenção pré-existente, idêntica em `StoreTurmaDocumentAction` e
`DeleteTurmaDocumentAction`. **P-15 e P-21 estão satisfeitas** e fecham no `/fechar-sprint`.

**Gate refeito e passando.** Suíte **432 passed, 1 skipped (1579 assertions)** — +6 sobre 426, um por
teste novo; frontend **35 passed** inalterado; Pint, build e lint verdes; `generated.ts` com só o
`RevokeCertificateData` a mais, no mesmo commit do Data. **Item 0 provado e2e contra a API real com
sessão Sanctum** (lição 12): resultado acadêmico gravado, `issuable` escondendo a turma online sem
cidade e mostrando-a depois do template com `city`, emissão `LOT-2026-1000/1001/1002` com `valido_ate`
do template mais recente, PDF **200 `application/pdf` de 23.831 bytes** começando em `%PDF-1.4`,
rota pública **sem cookie** devolvendo 200 sem RUT/id/nota/motivo, revogação sem motivo em 422 es-CL,
a mesma URL passando a `revocado`, `uuid` inexistente em 404 e reemissão pós-revogação. **A D12 foi
provada contra a API real, não só em teste:** com `legal_name` diferente de `user.name`, o
`LOT-2026-1001` saiu com a razão social, e o snapshot sobreviveu ao rename posterior do cliente.

Detalhe task a task e a íntegra do e2e em `.superpowers/sdd/progress.md`.

### Volta a `executing` em 2026-08-06 — Task 15, o Blade contra o documento oficial (D-P9)

**Não é reabertura por heurística: é o item 2 da fila que o próprio D-P8 escreveu** ("aproximar os
Blades dos documentos oficiais"), e o D-P8 já dizia que isso "vem antes do frontend". O que mudou em
2026-08-06 é que os templates deixaram de ser anexo de prompt e entraram no repositório —
`docs/templates/certificado.pdf`, `manual.pdf` e `manual.docx` —, então o trabalho passou a ser
executável em vez de descrito. O estado sai de `ready_for_review` porque **o review tem de ver o
Blade final**, não um Blade que já se sabe que vai mudar.

**O documento foi lido, não parafraseado.** `Read` não renderiza PDF neste ambiente (poppler-utils
ausente no host e no container `app`), então o `certificado.pdf` foi aberto por extração direta:
texto posicionado dos content streams (`x`, `y`, fonte, corpo) e as duas artes de fundo extraídas
como JPEG e vistas. É daí que sai a tabela campo-a-campo do D-P9 — inclusive os três campos que o
Blade da Task 7 não tinha de onde tirar.

**As três decisões do D-P9, e o motivo de nenhuma criar coluna:** a narrativa é `courses.description`
(coluna que existe desde 2026-07-08 e **não tinha um único consumidor**); o temário é
`course_modules` (`name` + `contents`, cuja própria migration descreve o conteúdo autoral numerado
que a página 2 imprime); e o certificado passa a ser **retrato fixo**, com
`layout_config.orientation` perdendo o único consumidor — ele era parte do "layout genérico" que o
D-P8 nomeia como o defeito, e `city` fica sendo a única chave viva do JSON.

**Restrição do João mantida:** assinaturas continuam fora — o Blade imprime nome sobre linha, que é
texto. A papelaria poligonal do original também não entra; o cabeçalho é montado com
`frontend/src/assets/LogoLight.png`, copiada para `backend/resources/images/` porque a imagem do
container `app` não carrega a árvore do frontend e o Gotenberg só recebe HTML.

**Task 15 entregue em 2026-08-06, `cbb9e09` — e provada no PDF real, não na suíte.** Suíte
**436 passed, 1 skipped (1590 assertions)**, +4 sobre 432, um por teste novo; Pint verde nos 5 `.php`
tocados; frontend não tocado (`git status` sem uma linha em `frontend/`). **E2e com sessão Sanctum**
contra `migrate:fresh --seed` no MySQL: `LOT-2026-1000/1001/1003` emitidos pela API real,
`GET /api/certificates/{id}/pdf` devolvendo `application/pdf` de ~41 KB, e **o PDF baixado foi aberto
e lido** — `pdftotext -layout` para conferir campo a campo e `pdftoppm` para ver as duas páginas.
Estão no documento, nesta ordem: `N° LOT-2026-1001` · `Emisión: 06-08-2026` · a marca ·
`CERTIFICADO DE CAPACITACIÓN` · `En Santiago a 06-08-2026, OTEC LOTUS SpA [77.510.327-2] certifica
que:` · nome · RUT do aluno · razão social · `El trabajador de la empresa RUT: 77.555.333-2,
participó en el curso:` · curso + nome técnico + horas · a narrativa · `El trabajador logró aprobar
el curso con nota 6.4.` e `Asistencia registrada: 92.50%.` (no `LOT-2026-1003`, o único com
resultado lançado) · vigência · `El N° de Registro…` · `Ana Reyes` sobre `Instructor` · QR ·
cláusula de rodapé. **Página 2 com `Temario del Curso`**, os dois módulos e os bullets de
`contents` — inclusive com o marcador `*` escrito à mão sendo removido na renderização. Certificado
sem módulos e sem descrição não imprime a página 2, e isso tem teste nomeado.

**Dois achados da execução, os dois declarados no plano em vez de silenciados:** a 8ª aresta da
matriz (`Catalog\Models\CourseModule`) — bastava não tipar o closure do `map` para o
`DomainDependencyTest` não ver nada, e guardrail com escape usado é pior que guardrail nenhum; e a
frase da narrativa, que no original só fecha se `courses.description` começar por verbo, enquanto o
dado real do projeto é sintagma nominal. A oração fecha antes (`… abordó los siguientes contenidos:`)
e a descrição vira parágrafo próprio.

**Nota de ambiente, não do produto:** `Read` não abre PDF aqui porque falta `poppler-utils`; ele foi
instalado **no container `app` em runtime** (`apk add poppler-utils`) só para a leitura da prova.
Não entrou em `Dockerfile` nem em dependência do projeto — some no próximo rebuild, e nada do código
o usa.

**O que o João deixou registrado como contexto e NÃO é trabalho deste bloco:** o Manual de Classe
(aba de documentos da turma, PDF novo + botão de `.docx` para o redator, páginas 1/2/4 geradas) é
para ser planejado **com o bloco de frontend** — instrução literal dele. Fica fora da Task 15.

### Review da Task 15 — 6 achados aprovados, corrigidos pelo Codex e provados aqui (2026-08-06)

Review em duas frentes (lente Claude + Codex read-only, ALTO RISCO por ser documento de peso legal).
Os seis achados foram **aprovados pelo João**, a correção **delegada ao Codex** e a revisão das
correções feita com Claude. **Todos provados, e o gate reconferido aqui — não aceito por relatório:**
suíte **441 passed, 1 skipped (1604 assertions)**, +5 sobre 436; Pint `passed` nos 5 `.php` tocados;
frontend intocado. RED visto para os testes novos; **Q-5 provado não-vacuoso por mutação**; Q-1, Q-2,
Q-4 e Q-6 provados **no PDF real** pela API com sessão Sanctum.

O que cada um era, e o que a correção fez:

- **Q-1 🔴 — o período da capacitação sumia do certificado quando `courses.description` é null**, e o
  teste fixava esse comportamento. O `$periodo` vivia dentro do `@if ($description)`; agora tem
  ramo próprio (`La actividad fue realizada {periodo}.`) e o `$periodo` vira `null` explícito quando
  falta data, em vez de imprimir frase quebrada.
- **Q-2 🟡 — razão social e RUT da OTEC emissora eram literais no Blade** e não congelavam no
  snapshot, violando a D12 no mesmo campo que o A-1 já tinha corrigido para o cliente. Nasce
  `snapshot.emissor` no `CertificateSnapshotBuilder`, alimentado por `config('app.certificate_issuer')`
  (chave nova, com `env()` — nunca `env()` em runtime), e o Blade lê o snapshot com a config só como
  fallback para os certificados já emitidos.
- **Q-3 🟡 — `description` era lido sem defesa** enquanto `modules` usava `?? []`, na mesma leva.
  Toda leitura de snapshot no Blade passa a `data_get` com default.
- **Q-4 🟡 — `ltrim` com charlist multibyte corrompia o travessão no temário** (provado por sonda):
  `ltrim($line, "*-•\t ")` opera byte a byte e comia pedaço de `•`/`–`. Virou `preg_replace` com
  `/u` e lookahead, que só remove marcador seguido de espaço ou fim de linha.
- **Q-5 🟡 — as asserções de omissão do `CertificatePdfTest` viraram vacuidade** depois da reescrita
  do Blade. Reescritas para falhar de verdade; a não-vacuidade foi provada por mutação.
- **Q-6 🟡 — rodapé e QR eram `position: absolute` sobre fluxo de tamanho ilimitado**: descrição ou
  temário longos passavam por baixo da assinatura. A página vira flex column com
  `.certificate-footer` em `margin-top: auto`.

**Achado NOVO da revisão, fora dos seis, e por isso a decisão do João foi separada:** o Gotenberg
**não recebe tamanho de papel** e devolve **Letter (612×792 pt)**, enquanto o Blade declara
`@page size: A4` e o Q-6 calibra `min-height: 297mm` — documento legal chileno saindo em papel
errado. **Defeito pré-existente da Task 7**, não introduzido pelas correções.

**Decisão do João em 2026-08-06:** commitar as correções dos seis achados, e **tratar o A4 dentro
deste bloco** — não vira débito. O papel errado é a Task 16; o bloco só volta a `ready_for_review`
depois dela, porque o review tem de ver o PDF no papel certo.

Correções commitadas em `cd457bc`, com o gate reconferido antes do commit.

### Task 16 — o papel do certificado (2026-08-06)

**O tamanho já estava declarado; quem não o lia era o Gotenberg.** O Blade tem
`@page { size: A4 portrait; margin: 0 }` desde a Task 15, mas o Chromium só honra o `@page` do CSS
quando recebe `preferCssPageSize`; sem ele imprime no default do Gotenberg, **Letter**. A correção é
uma linha no `CertificatePdfService` — `preferCssPageSize=true` no multipart —, e não duplica o A4
no PHP de propósito: **o tamanho continua declarado uma vez só, no CSS do documento**, que é onde o
`min-height: 297mm` do `.page` já estava calibrado.

**Provado nos dois sentidos.** O teste novo (`test_gotenberg_recebe_o_tamanho_de_papel_declarado_no_css`)
foi visto reprovando contra o serviço antigo com a **regex final** — o primeiro RED tinha regex
errada e não valia como prova. Suíte **442 passed, 1 skipped (1606 assertions)**, +1 sobre 441; Pint
`passed` nos 2 `.php` tocados; frontend intocado.

**Prova no PDF real, não na suíte** (lição 12): `GET /api/certificates/2/pdf` com sessão Sanctum
devolveu **200 `application/pdf`, 41.766 bytes**, e o `pdfinfo` do arquivo baixado diz
**`594.96 x 841.92 pts (A4)`, 2 páginas** — antes era Letter (612×792). As duas páginas foram
**renderizadas e vistas**: rodapé, QR e assinatura assentam no fim da página 1 (Q-6 continua de pé
no papel certo), a página 2 traz o temário, e nenhuma terceira página órfã aparece. O Q-4 também
aparece no papel: `-5 kV nominal` e `–5 kV a 15 kV` chegam íntegros enquanto os marcadores `*`/`•`
somem.

**Achado registrado e NÃO tocado:** `manual-turma.blade.php` não declara `@page` nenhum e o
`ManualPdfService` também não manda tamanho — o Manual de Classe sai em Letter pelo mesmo motivo.
É o layout genérico que o D-P8 já nomeia como defeito, e o João mandou planejar o Manual **com o
bloco de frontend**. Fica como contexto para aquele bloco, não como trabalho deste.

### R-1 a R-5 aplicados e três refatorações de arquitetura (2026-08-07) — `28ac6a3`…`e7626b4`

**Os cinco achados do review das correções, aprovados pelo João, foram corrigidos em `28ac6a3`.**
R-1 🟡 o `data_get(..., [])` do Q-3 não cobria valor `null` — o default do `data_get` só vale para
chave **ausente**, então `curso.modules: null` entrava no `@foreach` e derrubava o PDF em 500
(provado pela API real antes do fix). R-2 🟡 o A4 não tinha guarda; R-3 🟡 a origem em `config` do
emissor não era guardada, porque o teste fixava os mesmos valores do default — os overrides passaram
a usar valores **diferentes** de `config/app.php`; R-4 🟢 a "descrição longa" do teste de rodapé era
decorativa; R-5 🟢 `.env.example` sem `CERTIFICATE_ISSUER_NAME`/`RUT`.

**Depois disso o João trouxe uma revisão paralela de arquitetura** (skill `improve-codebase-
architecture`, executada por ele fora desta sessão) e mandou aplicar **só o backend, e só o que toca
o bloco ativo** — B4–B7 e C1–C7 do relatório ficam fora por escopo, não por discordância. **As três
alegações foram conferidas no código antes de qualquer edição**, e uma sub-alegação foi medida como
**falsa e registrada como falsa**: o relatório dizia que `layout_config.orientation` era "gravado e
nunca lido", e o `grep` não acha uma ocorrência sequer da chave em lugar nenhum do repositório —
ela já não existe desde a Task 15 (D-P9).

- **B3 (`eccf0ee`) — o transporte do Gotenberg estava escrito duas vezes e as duas cópias já haviam
  divergido:** `CertificatePdfService` recebeu `preferCssPageSize` na Task 16 e `ManualPdfService`
  não. Nasce `App\Shared\Pdf` — `HtmlToPdf` (interface), `GotenbergHtmlToPdf` (o único lugar que
  conhece multipart), `PageOptions` e `FakeHtmlToPdf`. O teste do certificado deixou de ser regex
  sobre corpo multipart; **um teste só** (`Tests\Feature\Shared\HtmlToPdfTest`) conhece o formato do
  transporte. O Manual segue em `PageOptions::converterDefault()` **de propósito** — ele não declara
  `@page`, e mudar o papel dele é trabalho do bloco de frontend, não deste.
- **B2 (`a33d793`) — o snapshot congelado era `array` sem contrato**, com dois leitores de política
  oposta (o Blade defendia com `data_get`, os testes indexavam cru) e `Record<string, any>` no
  `generated.ts`. Vira `CertificateSnapshotData` (+6 DTOs aninhados) com `CURRENT_VERSION = 2` e um
  `fromArray` **tolerante que nunca estoura**: certificado emitido em 2026 tem de continuar
  renderizando em 2030, mesmo com chave que o código atual não conhece. O `CertificateSnapshotCast`
  aceita DTO **ou array cru** — é assim que o teste simula o schema versão 1 sem falsificar o
  caminho de produção. `generated.ts` regenerado no mesmo commit; a regra da vigência e a leitura de
  `city` no formato legado (`template.layout_config.city`) continuam funcionando.
- **B1 (`e7626b4`) — as seis portas da emissão estavam escritas duas vezes:** guardas em PHP na
  `IssueCertificateAction`, restrições em Eloquent no `CertificateController::issuable`. É a mesma
  classe de bug que já custou A-2 e D-P8 — **a lista promete um certificado que o POST recusa com
  422**. Nasce `CertificateEligibility`, com cada porta como par adjacente `assert*`/`constrain*` e
  a mensagem escrita uma vez; a Action recebe o `IssuanceContext` já resolvido e não reconsulta
  template nem cidade. `CertificateTemplateResolver::latestForCourse()` deixa de ter query própria e
  deriva de `latestByCourse()`, então "template vigente" também volta a ter uma implementação só.

**A invariante do B1 tem teste nos dois sentidos, e o RED foi visto** (lição 10):
`CertificateEligibilityTest` prova que tudo que `issuableTurmas()` mostra passa em `assert()` e que
uma turma por porta fechada some da lista **e** leva 422 na emissão. Removendo
`constrainRedatorDesignado` da face 2, o teste falha nomeando a porta que divergiu.

**Gate reconferido aqui, não aceito por relatório:** suíte **449 passed, 1 skipped (1634
assertions)**, +7 sobre 442; Pint `passed` nos 6 `.php` do B1; `pnpm build`, `pnpm lint` e **35
passed** no frontend; `typescript:transform` rodado de novo **sem diff** (o `generated.ts` do B2 já
está commitado com ele).

**E2e com sessão Sanctum contra a API real** (lição 12): `GET /api/certificates/issuable` devolveu
a turma 3 com 10 matrículas; `POST /api/enrollments/24/certificate` emitiu **`LOT-2026-1003`** com
`snapshot.schema_version = 2`, `template.city = Santiago` e `emissor` vindo da config; a mesma
matrícula **sumiu da lista** na chamada seguinte (a porta 3 fechando nas duas faces, provada no
banco real); e `GET /api/certificates/4/pdf` devolveu **200 `application/pdf`, 44.292 bytes**, com
`pdfinfo` em **`594.96 x 841.92 pts (A4)`**. As três páginas foram **renderizadas e vistas**: o
documento traz emissor, razão social, narrativa, QR, assinatura sobre `Instructor` e o temário com
`-5 kV nominal` / `–5 kV a 15 kV` íntegros (Q-4 de pé), rodapé no fluxo (Q-6 de pé).

**O que ainda NÃO aconteceu, e por isso o estado é `reviewing` e não `ready_for_closure`:** as três
refatorações são código novo e substancial, e **nenhuma passou por uma lente de review** — só pelo
gate. O próximo passo é repetir o `/revisar-sprint` sobre `28ac6a3..e7626b4`.

### Correções do review — 2026-08-07, Q-1 a Q-7 aplicados

O João aprovou os sete. **Suíte após as correções: 457 passed, 1 skipped, 1655 assertions**; Pint
`passed` nos 16 arquivos; `typescript:transform` sem diff no `generated.ts` (só métodos mudaram, não
a forma dos DTOs). **Cada um dos 8 testes novos foi visto reprovar contra o código antigo**
(`git stash` do arquivo de produção, roda, `stash pop`) — lição 10.

Duas correções mudam comportamento de propósito e ficam registradas aqui:

- **Q-3 — nota não-numérica volta a ser impressa.** `finalGrade()` filtrava por `is_numeric` e
  apagava `"6,4"` do documento em silêncio; `enrollments.grades` é validado só como `array`, então a
  nota chega como o redator lançou, vírgula inclusive. Agora omite apenas o que não dá para
  imprimir — array, objeto, booleano, string vazia (D-P7 preservado). O `AcademicResult` tipado
  segue como B6 no backlog; isto é a defesa até lá.
- **Q-4 — `schema_version` passou a governar a leitura, e snapshot corrompido falha alto.** Só a
  versão 1 cai para `config('app.certificate_issuer')` quando falta `emissor`; da 2 em diante o
  emissor é o congelado, senão a OTEC de HOJE entraria num documento antigo. E `aluno.name`,
  `curso.name` e `emissor.name` em branco viram `CorruptedSnapshotException` (500 pelo handler RFC
  7807) nos dois consumidores legais — PDF e rota pública do QR. Um 200 dizendo `status: emitido`
  com nome vazio é prova falsa; erro visível vira chamado.

Três testes que comparavam `assertEquals($snapshot, $reloaded->snapshot)` passaram a comparar
`toArray()`: sem o cache de casts, cada leitura reconstrói o DTO, e a comparação objeto a objeto
batia no `_dataContext` do spatie — escrituração da biblioteca, não conteúdo do documento.

### Review das três refatorações — 2026-08-07, 7 achados aguardando o João

Duas frentes (lente Claude + `mcp__codex__codex` read-only), ALTO RISCO por documento de peso legal.
Suíte reconferida aqui, não aceita por relatório: **449 passed, 1 skipped, 1634 assertions**.

**O 🔴 foi provado por sonda, não deduzido.** `CertificateSnapshotCast` é um cast de objeto, e o
Eloquent guarda o valor no cache de casts: `Model::save()` chama `mergeAttributesFromCachedCasts()`
antes de qualquer coisa, então **ler `$certificate->snapshot` e salvar o mesmo model reescreve a
coluna** a partir do DTO. Rodado no MySQL de dev dentro de `beginTransaction`/`rollBack` com um
snapshot da versão 1: `template.layout_config` (com `orientation`) **sumiu**, `emissor` **da config
atual** entrou num documento de 2026 — a mesma classe de defeito que o A-1 e o Q-2 já corrigiram —
e `schema_version: 1` foi carimbado numa estrutura versão 2. Nenhum caminho de produção dispara
hoje: `RevokeCertificateAction` recarrega o model com `lockForUpdate` e não lê o snapshot antes do
`update`. O bloco de frontend, que lê certificado em toda tela, é quem encosta nisso.

**A divergência entre os revisores foi mostrada, não resolvida em silêncio:** o Codex marcou a troca
de `template.layout_config` por `template.city` como perda de dado congelado. Conferido no código —
`orientation` não existe em lugar nenhum desde o D-P9 e a `city` nomeada é a decisão do próprio B2,
com teste atualizado de propósito. **Não é achado.** O risco real que sobra é o Q-1: é ele que apaga
o `layout_config` dos snapshots v1 que ainda o carregam.

## Penúltimo item fechado — 2026-08-05 (`profundidade-form-crud-e-hidratacao-dto`)

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-05** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). O item entrou no backlog em `aa715ad`, escrito no dia anterior a partir do review de
arquitetura de 2026-08-04 e do grilling que o seguiu.

**A árvore mudou antes de qualquer commit, e a divergência não foi resolvida por heurística.** A
sessão começou em `/home/jvbat/projetos/fix-frontend`, na branch `fix/interface-modules` — que está
**no mesmo commit que `main`** (`c43a2a1`) e não carrega conteúdo próprio. Os commits de
planejamento dos três blocos anteriores entram **first-parent em `main`** (`ce2d2e4`, `54684fe`,
`983086f`, `d17df21` são o exemplo mais recente), e o `/executar-bloco` cria a branch a partir de
`main`; commitar spec e plano na branch antiga os deixaria invisíveis para a execução. Some-se a
P-03: o sub-bloco A toca `backend/`, então a execução já exigiria o main tree. **Decisão do João:**
a edição do `backlog.md` migrou para a worktree `/home/jvbat/projetos/lotus` (main), `fix-frontend`
voltou limpa, e planejamento e execução acontecem no main tree.

**Rota direta a `ready_for_planning`, sem Context Packet — por ausência medida de fonte externa,
não por pressa.** Os três blocos anteriores passaram por `context_required` porque tinham tasks no
Notion com sinais de aceite próprios e gatilhos de staleness a reconciliar. **Este item não tem
task Notion** (o backlog registra isso na primeira linha) e não tem documento no Drive: as três
gerações de packet de 2026-08-03/04 confirmaram, cada uma por busca dirigida, que o V2 não tem
documento que delimite hardening estrutural, e este bloco é ainda mais interno — nasceu de um
review de arquitetura sobre o próprio repositório. **Todo fato que o bloco precisa é medível aqui**,
e o brainstorming mede em vez de reconciliar. Um packet gerado agora só transcreveria repositório,
que é a parte que o contrato do `lotus-context-packet` menos protege. Se o João preferir o packet
mesmo assim, o estado volta a `context_required` sem custo.

**Brainstorming de 2026-08-05 — as duas decisões abertas fecharam, e a medição mudou três coisas
antes do desenho** (sexta ocorrência da lição 13 no projeto):

1. **`Cast` é o lado errado do `spatie/laravel-data`.** `Cast::cast()` roda na criação; quem
   transforma na saída é `Transformer::transform()`. Os 8 DTOs constroem por `fromModel` explícito e
   os `::from([...])` do repositório recebem array, nunca model — um cast jamais dispararia. O
   backlog escreveu "cast"; o mecanismo é `#[WithTransformer]`, escolhido pelo João entre três
   opções (transformer, accessor no model, módulo de assinatura estático).
2. **`TurmaData::fromModel` tem 4 call sites, não 2** — 2 no `TurmaController` e 2 em teste. É a
   mesma forma que mordeu no H.4.6, onde a spec media 4 e existiam 6. O João manteve o serviço por
   parâmetro, com o mesmo argumento que fechou a D9 como sinal 1.
3. **`useTurmaConfigForm` não roda sobre `createCrudResource`** (a turma nasce em rota aninhada), e
   por isso sai da lista de migração do sinal 1, que cai de 5 para 4.

**A guarda do `mapped` não pode ser lint, e isso é medido:** `mapped` mora no JSX do diálogo e
`toPayload` no hook — arquivos diferentes, e ESLint é por arquivo. O João escolheu subir `mapped`
para junto do `toPayload` e pôr a invariante dentro do `useCrudForm`, provada em dois níveis. **A
ordem ficou A (backend) antes de B (frontend)**, para o checkpoint visual ficar adjacente ao gate.

**Duas decisões novas nasceram no desenho e estão na spec:** os métodos `UploadFileAction::temporaryUrl`
e `UserPhotoService::urlFor` **morrem** (D5 — só têm esses 7 chamadores em produção), e a leitura em
PHP da propriedade que passa a carregar path vira **mecanismo**, não docblock (D6).

**A escrita do plano achou dois defeitos na spec aprovada, e os dois foram corrigidos antes da
primeira task** (`eb7c702`, `b12eee7`):

1. **A guarda do `mapped` estava com a direção invertida e reprovaria código correto.**
   `FormErrorSummary` renderiza exatamente as chaves que **não** estão em `mapped` — logo chave fora
   de `mapped` é a que **aparece**. A regra herdada do backlog acusaria `permissions` no `RoleDialog`,
   ou seja, **o primeiro hook do piloto**, e o conserto que ela induz (pôr a chave em `mapped`) é a
   supressão silenciosa que a D11 existe para impedir. Nasceu `summaryOnly`: toda chave de payload
   tem de estar em uma das três caixas.
2. **A lista de migração do sinal 1 caiu de 4 para 3.** `useRedatorForm` monta o create com
   `new FormData()` — a catraca de um da regra `no-restricted-syntax` — e `toPayload` devolvendo
   objeto não modela multipart. Medido junto: **só 6 dos 9 diálogos têm `FormErrorSummary`**;
   `StudentDialog` e `RedatorDialog` não têm, e no aluno isso significa que um 422 em `phone` hoje
   **não aparece em lugar nenhum**. O aluno migra assim mesmo, porque a classificação obrigatória
   expõe a chave sem mudar a tela; construir o resumo que falta é débito.

**Plano em 12 tasks** (0 baseline · 1 transformer com TDD · 2 os 3 `download_url` · 3 os 4
`photo_url` · 4 guarda de leitura · 5 `TurmaData` · 6 `useCrudForm` · 7 piloto · 8 leitura do sinal ·
9 os 3 restantes · 10 checkpoint visual do João · 11 gate). O placar do backend **cai** na Task 3 e
fecha em 378/1368, com o caminho declarado — 2 testes são apagados de propósito junto do método morto,
e um placar que sobe 1 esconderia isso.

**A auto-revisão do plano corrigiu cinco coisas nele mesmo:** o teste do transformer exercitava
`transform()` na mão fabricando um `DataProperty`, e passou a exercitar **pela serialização**, que é
como a produção o alcança; a migração dos 2 testes de `urlFor` era um "decida e reporte" dentro de
uma task delegada ao Codex, e virou instrução determinística; três chamadas de Pint montavam a lista
por `git diff` com `&&`/`||` numa linha só, que mascara falha do Pint além de arriscar lista vazia
(lição 9); e os placares intermediários estavam inconsistentes entre tasks.

**`executor: misto`.** **Tasks 2, 3 e 5 vão ao Codex** — substituição literal, alvos que saem de
`grep`, verificação que decide sozinha e 14 paths fechados. **Tasks 0, 1, 4, 6, 7, 8, 9 e 11 ficam
com Claude**; a **10 é do João**.

**O que já está decidido e não se reabre** (grilling de 2026-08-04, respostas explícitas do João):
o cast para os 7 sítios de URL assinada e o parâmetro para o oitavo (`TurmaData`); `toPayload`
recebendo o modo; `mapped` à mão com guarda, **não** derivado do payload; piloto de 2
(`useRoleForm`, `useStaffUserForm`) com três sinais de saída; o trio da foto fora do corte; e a
posição 1 na fila.

**Gate (Task 11) fechado em 2026-08-05, commit `09118eb`.** Sinal 1 confirmado na Task 8 —
`useStudentForm`, `useBudgetForm` e `useClientForm` migraram (Task 9), sem parar no piloto. Task 10
(checkpoint visual, não delegável) aprovada pelo João, incluindo D15 em `useBudgetForm` sem
regressão visível — fica migrado, sem reversão. E2e com sessão Sanctum real provou `download_url` e
`photo_url` como URL assinada de verdade (200, `Content-Type` do objeto, não string plausível); as
duas guardas de mecanismo (D6 leitura de propriedade, classificação obrigatória do `useCrudForm`)
provadas reprovando com sonda fresca e voltando a passar. Placar final: backend 378 passed (1368
assertions, caminho declarado no ledger), frontend 34 passed. Build/lint/Pint verdes, código morto
zerado, leis §5 intactas. Detalhe task a task em `.superpowers/sdd/progress.md`. Pendências de
fechamento (backlog, débitos técnicos, D10 do bloco anterior) ficam para o `/fechar-sprint` — não
foram tratadas aqui.

**Review em 2026-08-05 (`/revisar-sprint`, ALTO RISCO** — domínio §5.3, documentos de peso legal e
`executor: misto` com as Tasks 2/3/5 no Codex; lente Claude **+** revisão independente do Codex,
`mcp__codex__codex` read-only). **Gate reconferido do zero, não aceito por relatório:** backend
**378 passed (1368 assertions)**, frontend **34 passed**, `pnpm lint` e `pnpm build` verdes, Pint
`--test` `passed` nos **17** `.php` tocados, `generated.ts`/`locales/`/`backend/database/` sem diff.
Órfãos: nenhum no backend — `->temporaryUrl(`, `->urlFor(`, `URL_MINUTES` e `FilesystemAdapter` sem
uma ocorrência sobrevivente, `publicDiskFor()` e `disk()` ainda com chamador, `TurmaData::fromModel`
em exatamente 4 call sites, `SignedUrlTransformer` em 7 DTOs. **Leis §5 intactas.**

**A classificação foi conferida diálogo a diálogo, não aceita da spec:** `StudentDialog` passa
`error=` nos 4 campos que declara em `mapped`, `BudgetDialog` nos 2, e os 4 `FormErrorSummary`
recebem por `{...errorSummary}` exatamente o `mapped`/`excludePrefixes` que tinham à mão antes —
zero mudança no que aparece na tela.

**4 achados, nenhum 🔴. O João aprovou apenas o Q-1.**

**Q-1 🟡 — o módulo devolvia `setForm`, e os 5 hooks devolvem o módulo inteiro.** `return crud` /
`{ ...crud, toggle }` / `{ ...crud, addr, ... }`: qualquer chave dentro de `crud` chega ao diálogo
por spread. Com isso `RoleDialog`, `StaffUserDialog`, `StudentDialog`, `BudgetDialog` e
`ClientDialog` ganharam um setter que **nenhum deles tinha antes** (medido: zero uso em
`features/*/components/`, antes e depois) — e a `frontend-fsliced.md` nomeia o
`patchContact(setForm, ...)` do `ClientDialog` como contra-exemplo, não molde. Antes cada hook
curava o próprio retorno; `useCourseForm` e `useRedatorForm`, que não migraram, seguem curando. O
guardrail que existia por construção morreria justo no módulo desenhado para ser adotado por 9
hooks. **Corrigido em `577751b`:** `useCrudForm` devolve `{ crud, setForm }`; quem só consome o
formulário escreve `const { crud } = ...`, e `useClientForm` — único com coleção nested — nomeia
`setForm` no destructuring. Fora do objeto, nenhum spread o carrega por acidente. **Provado nos dois
sentidos:** diálogo tentando consumir `setForm` reprova no `tsc` (`TS2339`), e devolver a chave para
dentro de `crud` reprova a asserção nova do teste do módulo. Sondas removidas, árvore limpa.
Frontend passa a **35 passed** (34 + a asserção do Q-1); backend não foi tocado pelo fix
(`git diff 09118eb..577751b -- backend/` vazio), então o placar 378/1368 não pode ter mexido.

**Q-2, Q-3 e Q-4 não foram aprovados** e ficam registrados aqui, sem virar trabalho: **Q-2 🟢** — o
barrel `shared/hooks/index.ts` exporta `unclassifiedPayloadKeys`, `MutableResource` e
`CrudFormOptions` sem um consumidor (o teste importa por caminho relativo), e o primeiro é a válvula
que a D12 existe para fechar. **Q-3 🟢** — chave declarada em `mapped` **e** `summaryOnly` ao mesmo
tempo passa na guarda sem conflito, e `summaryOnly` é a única das três caixas sem consequência
mecânica, logo a de custo zero para calar o mecanismo. **Q-4 🟢** — o fato medido em 2026-08-01
(`PUT` com `photo_url` devolve 200 porque a promoção no construtor do `ClientData` desvia do
`CannotSetComputedValue`) foi apagado junto do `submit` do `useClientForm` e não reapareceu, num
bloco que **aumentou a aposta**: a propriedade deixou de carregar URL e passa a carregar path.
Candidatos a §Débitos técnicos do `backlog.md` no `/fechar-sprint`, se o João quiser.

**Divergência entre revisores: nenhuma.** O Codex fechou com zero achado e declarou limpas as cinco
áreas que recebeu — leis §5, contrato JSON (`photo_url: null`, TTL 10/60, disco público), mutations e
a inversão D15, escape de path interno, privilégio/422 e código morto. Os quatro achados são de
convenção e superfície: abaixo do corte dele, dentro do gabarito deste projeto.

**Sujeira de árvore que não é do bloco, reportada e não tocada:** `backend/resources/views/welcome.blade.php`
apareceu modificado durante a sessão de review (a árvore estava limpa no início) com um codemod de
classes Tailwind na página stock do Laravel — `max-w-[335px]` → `max-w-83.75`, `leading-[20px]` →
`leading-5`, `w-[438px]` → `w-109.5`. Não entrou em commit nenhum; decidir o destino é do João.

**Gate de fechamento (2026-08-05).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o bloco jura que nenhum comportamento observável muda enquanto troca *quem* assina a URL, então a
prova é *URL assinada de verdade contra a API real*, não suíte verde. **E2e com sessão Sanctum**
(lição 12 — `Origin` + `Accept` + `X-XSRF-TOKEN`; login `admin@lotus.cl`): `photo_url` baixou **200
`image/png`** (70 bytes) e `download_url` **200 `application/pdf`** (596 bytes) — objeto real, não
string plausível, que é o modo de falhar quando o disco está errado e nenhum teste unitário vê. **Os
dois TTLs preservados e medidos na própria URL:** `X-Amz-Expires=3600` na foto e `600` no documento,
exatamente os 60 e 10 minutos que `UserPhotoService::URL_MINUTES` e `UploadFileAction::temporaryUrl`
tinham antes de morrer. Assinadas contra `localhost:9000`, **não** `minio:9000` — o achado de
2026-07-31 sobrevive à mudança de mecanismo. `photo_url` segue `null` para os 2 usuários sem foto
(`TransformedDataResolver:102` curto-circuita antes do transformer). `habilitada` e
`missing_document_types` presentes nas **8** turmas com valores reais (invariante 4). **E o nível 3
do aninhamento saiu assinado** — `budget > quote > file` com `X-Amz-Expires=600` —, que é exatamente
o que "serviço por parâmetro" não alcançava e o motivo medido de o mecanismo ser transformer e não
threading.

**Automático:** backend **378 passed (1368 assertions)** com o caminho declarado (`+2/+3` da Task 1,
`−2/−3` da Task 3 apagando os 2 testes do `urlFor` morto, `+1/+1` da Task 4 — o placar **cai** de
propósito no meio do bloco, e um número que só subisse 1 esconderia isso); frontend **35 passed**
(34 do gate + a asserção do Q-1); `pnpm build` e `pnpm lint` verdes; Pint (`--test`) `passed` nos
**17** `.php` tocados, com a guarda de lista vazia (lição 9); `generated.ts`, `locales/*.json` e
`backend/database/` **sem diff** — `typescript:transform` rodou porque 8 DTOs mudaram, e o diff
vazio é a invariante 1: o mecanismo trocou quem preenche o campo, não o tipo que o front lê.

**O warning do `typescript:transform` foi medido, não suposto** (lição 13). `Tried replacing
reference to class Spatie\\LaravelData\\Optional ... but it was not found in the transformed types`
aparece na saída, e `UserData` — arquivo que este bloco tocou — está entre os citados. Conferido
trocando o `UserData` pela versão anterior ao bloco e rodando de novo: são **80 ocorrências em ~14
DTOs**, a maioria que o bloco nunca tocou (`QuoteData`, `CourseData`, `RoleData`, `EnrollmentData`,
`ClientAddressData`…). Quirk pré-existente do `laravel-typescript-transformer` com `Optional`, sem
relação com o bloco. Árvore restaurada.

**Código morto: nenhum.** `->temporaryUrl(`, `->urlFor(`, `URL_MINUTES` e `FilesystemAdapter` com
zero ocorrência; `publicDiskFor()` e `UserPhotoService::disk()` seguem com chamador; o
`SignedUrlTransformer` tem 7 DTOs consumidores e o `useCrudForm`, 5 hooks. **Exceção declarada:** os
3 exports órfãos do barrel (Q-2) ficam, porque o João não aprovou o achado — registrados em
§Débitos técnicos do `backlog.md`. **Leis §5: sem violação** — zero `primereact` em `features/`, zero
`@features/` em `shared/`, `generated.ts` nunca tocado pela sprint, nenhum `abort(422)` novo, nenhum
Repository, nenhuma migration.

**Pendências: nenhuma venceu, nenhuma fechou, nenhuma nasceu.** P-04 vence 2026-08-15; P-25, P-26 e
P-23 revisam 2026-09-30; P-03 ganhou mais uma confirmação silenciosa (o bloco tocou `backend/` e
rodou no main tree sem atrito), mas o gatilho dela é *dois blocos de backend em paralelo*, que não
ocorreu. O que nasceu é débito de código e foi para o `backlog.md`, não para `pendencias.md`.

**A D10 do bloco `hardening-guardrails-e-transportes` fechou** — "a família que assina URL segue com
o container de propósito" deixou de descrever o repositório, porque a família não existe mais.
Registrado aqui e na linha do `progress.md`, que é a saída que a própria D10 previa.

**Item 1 do backlog (“Profundidade de module · formulário CRUD e hidratação de DTO”) fechou por
inteiro e saiu da fila** — A e B entregues, sem resto. Os itens 2–5 foram renumerados para 1–4. Três
débitos novos entraram em §Débitos técnicos: os 4 hooks que ficaram fora do `useCrudForm` com o
critério de cada um, os 2 diálogos sem `FormErrorSummary` (com a chave `phone` do aluno medida), e os
três achados 🟢 não aprovados (Q-2, Q-3, Q-4).

Arquivado: `plans/archive/2026-08-05-profundidade-form-crud-e-hidratacao-dto.md` ·
`specs/archive/2026-08-05-profundidade-form-crud-e-hidratacao-dto-design.md` (não compartilhada por
outro work item). Entrega registrada em `progress.md`; a mais antiga (`Identidade visual ·
Foto/avatar das entidades + contatos do cliente`, 2026-08-01) migrou para `progress-archive.md` para
manter o teto de dez.

**Aberto, registrado, não resolvido:** os 3 débitos novos acima; o trio da foto e as 2 tabelas com
dropdown (§Débitos técnicos); Q-2 e Q-4 do review de guardrails, a catraca do `max-lines` (4
legados), B-7, Q-16, Q-6; P-26; P-04 para §5.1/§5.2 (reavaliar 2026-08-15); P-25; e o
`backend/resources/views/welcome.blade.php` sujo na árvore, que não é do bloco e não entrou em commit
nenhum. **Nenhum item foi promovido** — a escolha do próximo é do João.

## Antepenúltimo item fechado — 2026-08-04 (`hardening-tabela-e-testes-pre-sprint-4`)

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-04** (`/planejar-bloco`
com o escopo nomeado no argumento — "Hardening pré-Sprint 4" — e o estado em `idle`; o comando não
promove item sozinho). É o **terceiro e último recorte** do mesmo item que dois blocos de 2026-08-04
fecharam parcialmente: entregues H.4.1–H.4.3 pelo `hardening-estrutural-pre-sprint-4` e H.3.1,
H.4.6, H.4.7, H.4.8 pelo `hardening-guardrails-e-transportes-pre-sprint-4`. Abertos: **H.4.4, H.4.5
e H.4.9**. O backlog já registra esse recorte desde `3d7aca5`, então nenhuma edição dele acompanha
esta transição.

**O id não promete o item inteiro.** `hardening-tabela-e-testes-pre-sprint-4` descreve o conteúdo
das três tasks (moldura de tabela + aliases de página; builders de teste no backend), não a posição
na fila. Escolhido pelo João junto da seleção; renomeável na revisão da spec se o corte mudar, como
ocorreu no bloco anterior.

**Rota `context_required`, por gatilho de staleness — não por rotina.** O packet de 2026-08-04
(`context-packets/hardening-guardrails-e-transportes-pre-sprint-4.md`, `status: ready`,
`base_commit` `7419c32`) cobre as 7 tasks daquele recorte, inclusive as 3 restantes, com os sinais
de aceite de cada uma. **Ele está stale por dois dos seus próprios gatilhos declarados**
(§Staleness triggers):

1. **Mudança semântica no item do backlog** — H.3.1, H.4.6, H.4.7 e H.4.8 saíram da lista, e o item
   passou a carregar a conclusão técnica do H.4.5, escrita no fechamento.
2. **Decisão posterior do João sobre H.4.5 ou sobre o corte** — H.4.5 foi retirado do corte na
   revisão da spec de 2026-08-04, e a conclusão técnica registrada **contradiz o sinal de aceite
   externo que o próprio packet transcreve**: o packet diz "aliases sem valor são eliminados ou
   justificados"; o backlog diz que **eliminar é a resposta errada**, porque `useCrudPage` chama
   `resource.useList()` por dentro e matar os aliases moveria a query para as quatro páginas,
   regredindo a fronteira zerada em 2026-08-03 — e **passaria no lint**, porque o seletor casa
   `budgetsApi.useList()` e não `useCrudPage(budgetsApi)`.

Some-se a isso que `base_commit` está 8 commits atrás do `HEAD` (`e7884c3`). Logo o packet **não é
reaproveitado como está**; o Codex gera um novo, para as 3 tasks restantes.

**Ponto de partida que o novo packet precisa reconciliar, não redescobrir:** o Drive V2 segue sem
documento que delimite este hardening (confirmado duas vezes — buscas dirigidas voltaram só ADRs,
Certification e setup); a contradição do H.4.5 acima é a divergência a registrar, **não a decidir** —
o corte é do brainstorming, e o mérito técnico já está resolvido no backlog.

**Dependências Notion, atualizadas pelo que os dois blocos entregaram:** H.4.4 dependia de H.4.3 —
**satisfeita** (vitest desde 2026-08-04). H.4.9 dependia de H.4.6 — **satisfeita** desde o bloco de
guardrails. Resta **uma interna ao bloco**: H.4.5 → H.4.4. Nenhuma task restante está bloqueada por
algo fora deste bloco.

**Context Packet gerado pelo Codex em 2026-08-04** (`lotus-context-packet`, `mcp__codex__codex`
sandbox read-only), `base_commit` `ce2d2e4`, `status: ready` — 10 fontes, **nenhuma `unavailable`**:
as 3 tasks Notion buscadas uma a uma pela base canônica por ID, 2 alvos do Drive revalidados de
forma dirigida (sem busca ampla) e 5 chaves de repositório.

**Validação do contrato, conferida e não aceita por relatório:** markers exatos sem prosa fora
deles, frontmatter completo com `plan_*`/`spec_*` em `null` (os ponteiros do estado são nulos, e o
contrato proíbe inventá-los), 7 key facts (teto 8), `RECOMMENDED_TRANSITION: ready_for_planning`,
todo fato externo citando chave do registro, e nenhum gatilho de staleness citando hash de
provenance, a transição promotora ou edição de campo de workflow. **Os 18 blob SHAs do packet foram
recalculados aqui com `git hash-object` e batem todos** — `state.md`, `progress.md`, `backlog.md`,
packet anterior, `package.json`, `RedatoresTable.tsx`, `StudentsTable.tsx`, `useTableFilter.ts`,
`AppCard.tsx`, `AppDataTable.tsx`, `useCrudPage.ts`, os 7 aliases e `eslint.config.js`,
`TestCase.php`.

**O packet excedeu o teto de 5 artefatos externos** (6), declarando o motivo no próprio registro:
as 3 páginas eram obrigatórias e a revalidação da ausência no Drive exigiu os 2 inventários mais o
ADR. Aceito — o excesso está justificado, como a SKILL permite.

**Três afirmações do packet sobre o repositório foram medidas aqui, não aceitas por leitura**
(lição 13): os **7** aliases `useXPage` são delegação pura de **6 linhas** cada
(`return useCrudPage(<x>Api)`, sem orquestração nenhuma) — o que sustenta a conclusão técnica do
H.4.5; `TestCase.php` centraliza **só autenticação** (`actingAsAdmin`/`actingAsSuperadmin` +
header `Referer` do Sanctum), sem factory de agregados, que é a superfície do H.4.9; e são **78**
arquivos de teste em `backend/tests/`. `RedatoresTable` (96 linhas) e `StudentsTable` (98) estão
ambas abaixo da régua de 150 do `max-lines` — o H.4.4 é repetição de moldura, não arquivo inchado.

**A divergência do H.4.5 ficou registrada e não decidida**, como pedido: o packet põe na tabela de
divergências o enunciado externo ("eliminados ou justificados") contra a decisão interna posterior
("eliminar é a resposta errada"), com a base de resolução medida no código. O corte segue sendo
decisão do brainstorming.

**Débitos técnicos vizinhos, registrados e fora do corte até decisão contrária:** a catraca do
`max-lines` cita `StudentDialog` (189) e `RedatorDialog` (189), que são telas de tabela/diálogo na
mesma vizinhança do H.4.4; e Q-2 (guardrail de rota escapa com parâmetro não tipado) e Q-4 (teste do
`postMultipart` mocka o axios inteiro) seguem em §Débitos técnicos do `backlog.md`.

**Corte decidido no brainstorming de 2026-08-04, pelo João: as 3 tasks entram** (H.4.4, H.4.5,
H.4.9), e com elas o item 1 do backlog fecha por inteiro. Critério explicitamente diferente dos dois
blocos anteriores ("fechar o barato, isolar o refactor grande"): o refactor grande é o que sobrou, e
adiá-lo de novo não fecha o item. Alcances decididos na mesma sessão: **H.4.4 nas 5 tabelas busca-só**
(não nas 2 nomeadas nem nas 7), **H.4.5 pelo argumento** (`<hook>(xxxApi)`, não pelo nome
`useCrudPage`), **H.4.9 por trait** (não factories) e **só nos 2 padrões campeões**.

**A medição do repositório mudou três coisas antes de o corte ser feito** — quinta ocorrência da
lição 13 no projeto:

1. **A dependência `H.4.5 → H.4.4` declarada no Notion não vale.** O que resta do H.4.5 é lint sobre
   `features/*/hooks/`; o H.4.4 é markup em `features/*/components/`. Não se tocam; a ordem é livre.
2. **H.4.4 não são "9 tabelas equivalentes".** São 3 grupos: **5** busca-só estruturalmente idênticas
   (diff só em `searchable`, ícone, 3 chaves i18n e `footerCount`), **2** com dropdown
   (`BudgetsTable`, `TurmasTable`) e **2** fora do padrão (`RolesTable` sem busca, `EnrollmentTable`
   sem toolbar). Nenhuma passa da régua de 150 — a maior é `TurmasTable`, 148. Repetição entre
   arquivos, não arquivo inchado.
3. **H.4.9 é maior e mais limpo do que a task sugere.** União de **49 arquivos** (43 com o bloco
   cliente+usuário, 34 com curso descartável, 28 em ambos), **20 helpers privados locais** morrem —
   14 do bloco cliente com **4 nomes divergentes** (`client`, `clientId`, `makeClient`,
   `makeClientWithPrimary`) e 6 `actingAdmin` que são repasse puro para o `actingAsAdmin()` do
   `TestCase` (usado 132 vezes), dois deles declarando `: User` e quatro `: void` — a divergência de
   assinatura prova que ninguém os lê como contrato.

**A decisão de desenho mais importante — `shared/ui` continua apresentacional puro.** `shared/ui` e
`shared/hooks` **não se importam em nenhuma direção hoje** (medido: zero import nos dois sentidos), e
a moldura poderia ter criado a primeira aresta `ui → hooks` do projeto. Em vez disso ela recebe o
`TableFilter<T>` já construído: a feature mantém uma linha, a `searchable` (vocabulário de domínio)
fica onde já estava, e os 34 wrappers seguem todos da mesma natureza. O P-25 já registra tensão na
direção inversa.

**Spec escrita e aprovada pelo João em 2026-08-04**, 3 tasks, 14 decisões (D1–D14), 7 invariantes de
comportamento e gate com item 0 próprio. **Com checkpoint visual** — diferente do bloco anterior: o
H.4.4 muda markup de 5 telas de produção, duas delas de Personas (cadastro de peso legal).

**Auto-review da spec achou dois defeitos nela mesma, corrigidos antes do commit:** o gate citava o
grep de `pnpm test` com a justificativa "senão os testes deste bloco nascem órfãos", e este bloco
**não cria teste novo em runner nenhum** — H.4.9 reescreve setup de teste existente, e é por isso
que o placar tem de ficar idêntico; e faltava dizer como se concilia `TableFilter<T>` (paramétrico no
item) com o `T extends DataTableValueArray` que o `AppDataTable` exige, lacuna que a execução
resolveria inventando.

**Plano em 7 tasks** (0 branch · 1 moldura + as 2 tabelas nomeadas · 2 as outras 3 · 3 H.4.5 ·
4 H.4.9 · 5 checkpoint visual do João · 6 gate), TDD onde há mecanismo: na Task 3 a sonda entra
**antes** do seletor e é vista **passando** — a prova de que o buraco existe hoje — e só então o
seletor entra e ela reprova.

**A escrita do plano refinou a D3 e ficou melhor que a spec.** A spec dizia que a moldura recebe o
`TableFilter<T>`; importar esse tipo criaria justamente a aresta `shared/ui → shared/hooks` que a D3
existe para evitar — de tipo, mas aresta. O plano declara `SearchableTableState<T>`
**estruturalmente compatível**, sem import, seguindo o precedente do próprio `AppDataTable`, cujo
`error` aceita `ProblemDetails` sem depender de `shared/api`.

**Auto-review do plano achou uma lacuna própria:** as colunas mudam de pai nas 5 tabelas e nada
provava que não mudaram de conteúdo. Entrou um passo que compara a contagem de `<AppColumn` de cada
arquivo contra `main` — divergência **para** a task, porque coluna que some ou nasce é mudança de
comportamento, não extração.

**`executor: misto`.** **Task 4 (H.4.9) vai ao Codex** — migração mecânica, paths fechados
(`backend/tests/**`), verificação que decide sozinha (o placar 376/1366) e alvos que saem de `grep`,
não de julgamento. **Tasks 0, 1, 2, 3 e 6 ficam com Claude:** a 1 e a 2 mudam 5 telas de produção com
prova visual, a 3 toca o `eslint.config.js` do repositório inteiro (a colisão de flat config já
mordeu duas vezes), a 0 julga árvore suja e baseline divergente, a 6 julga o placar. **A 5 é do
João.**

**Regras de parada da delegação:** placar diferente de 376/1366 **para** e o arquivo é revertido, não
o número esperado ajustado; diff em `backend/app/` ou `backend/database/` **para**; arquivo onde a
extração exigiria mexer numa asserção fica **de fora**, com a razão reportada. Nenhum commit é feito
pelo Codex sem diff revisado por Claude antes.

**Duas pendências de fechamento registradas no plano, fora das tasks:** editar o item 1 do
`backlog.md` (com as três entregues ele fecha por inteiro e sai da fila) e decidir se as 2 tabelas
com dropdown ganham gatilho registrado para adotar a moldura quando houver slot de filtro.

**Execução em 2026-08-04, `/executar-bloco` + `subagent-driven-development` (argumento explícito do
João), `executor: misto`.** Branch `hardening/tabela-e-testes` a partir do `main`, sem worktree
(D1/P-03 — toca `backend/tests/`), 5 commits de conteúdo (`2653dff`..`c140e53`) + 1 de correção de
review (`0e7ec59`). Baseline da Task 0: backend **376 passed (1366 assertions)**, frontend
**21 passed** — batendo com o plano.

**Task 4 (H.4.9) no Codex** (`mcp__codex__codex`, paths fechados em `backend/tests/**`). Nenhum commit
feito pelo Codex — report + diff revisados por Claude, que rodou a verificação do plano do zero antes
de aceitar. Tasks 0, 1, 2, 3 e 6 por Claude; a **5 foi do João** (checkpoint visual das 5 telas,
aprovado).

**A moldura nasceu melhor que a spec, e o plano tinha razão:** `SearchableTableState<T>` é declarado
**estruturalmente compatível** com o `TableFilter<T>` do `useTableFilter`, sem import — importar o tipo
criaria a primeira aresta `shared/ui → shared/hooks` do projeto (D3), que é de tipo mas é aresta. As 5
tabelas mantêm a linha do `useTableFilter` e entregam o estado pronto.

**Review em 2026-08-04 (`/revisar-sprint`, ALTO RISCO** — `executor: misto` com a Task 4 no Codex;
lente Claude **+** revisão independente do Codex, `mcp__codex__codex` read-only). Gate reconferido do
zero, não aceito por relatório. **4 achados, todos aprovados pelo João:**

**Q-1 🔴 — a moldura recalculava a pergunta que o hook já respondia.** O empty state era escolhido por
`term === ''` em vez do `filtering` do `useTableFilter`, que mede o **efeito** do `where` e não a
presença do termo. É **o mesmo defeito** que `BudgetsTable` e `TurmasTable` cometeram juntas em
2026-08-03 (o `Dropdown` do PrimeReact devolve o **objeto** da opção quando `option.value` é vazio):
a moldura nasceria errada por construção para qualquer adotante com filtro. `filtering` entrou na
interface. A bifurcação de **redação** do vazio (`common.noResultsFiltered` / `common.clearFilters`)
**não** foi construída — não há consumidor com `where` hoje (lição 3), e o que falta está escrito no
docblock da moldura.

**Q-2 🔴 — o guardrail novo reproduzia o buraco que existe para fechar.** O seletor casava só
`arguments.0`, então `useEntityForm(mode, clientsApi)` escapava exatamente como `useCrudPage(budgetsApi)`
escapava do seletor antigo. Corrigido para `CallExpression > Identifier.arguments[name=/Api$/]`, que
casa qualquer posição. **Provado com sonda nas 4 direções:** argumento em posição 0 reprova, em posição
1 reprova, o seletor antigo de `xxxApi.useAlgo()` **continua** disparando no mesmo arquivo (prova de que
a colisão de merge raso do flat config não voltou) e `{ queryKey: clientsApi.keys.all }` **não** dá
falso positivo, porque é `MemberExpression`.

**Q-3 🟡 (achado do Codex, verificado no código antes de aceito) — o placar é cego a escopo de
permissão.** A D12 tratou os 6 `actingAdmin` como repasse puro; um não era. `PendingQuotesTest` tinha um
user com **exatamente** `operation.turma.create`, a permissão que gateia a rota, e a migração o trocou
por `actingAsAdmin()`, que tem todas — trocar a permissão exigida na rota passaria verde. **O placar
376/1366 não se moveu**, porque setup não é asserção. O user voltou, e nasceu a guarda
`test_permissao_vizinha_de_turma_nao_abre_a_rota`.

**Q-4 🟡 — 11 sítios remendavam o `rut` depois de criar.** `$client->user()->update([...])` é mass update
no query builder: **não dispara evento** em model `Auditable` (ADR-08, lição 5) e ainda fazia o `User`
nascer com `rut` nulo. O trait ganhou `$userOverrides` e a criação voltou a ser atômica nos 11.

**Divergência entre revisores, mostrada e não resolvida em silêncio:** o Codex declarou H.4.4 e H.4.5
**limpos** onde a lente Claude achou Q-1 e Q-2 — o Q-2 provado com sonda executada, o Q-1 lendo a
interface contra o `useTableFilter`. Q-3 nasceu no Codex e só foi aceito depois de conferir os 6
`actingAdmin` por `git show`; Q-4 as duas lentes acharam.

**Gate de fechamento (2026-08-04).** **Item 0 — critério de aceite do bloco, não higiene genérica:**
o bloco extrai markup e setup sem mudar comportamento, então a prova é *comportamento idêntico contra
dado real* e *mecanismo visto reprovando*, não suíte verde. **Prova e2e contra a API real com sessão
Sanctum** (lição 12 — `Origin` + `Accept` + `X-XSRF-TOKEN`; login `admin@lotus.cl`): os **5** endpoints
de lista que as tabelas migradas consomem responderam **200** com dado real (`courses` 3, `clients` 4,
`users` 3, `redatores` 7, `students` 59) e **todos os campos `searchable` presentes no payload** —
`name`/`technical_name`, `legal_name`/`rut`, `name`/`email`, `name`/`rut`, `name`/`rut`. A contagem de
`<AppColumn` de cada uma das 5 bate com `main` (5, 6, 4, 5, 5): coluna que some ou nasce é mudança de
comportamento, não extração. **Sonda fresca do H.4.5** em `catalog` (feature e recurso diferentes das
sondas da Task 3 e do plano, de propósito) reprovou nas **duas** posições de argumento, com a mensagem
do seletor novo; removida, árvore limpa.

**O placar mudou de propósito, por decisão explícita do João:** backend **377 passed (1367 assertions)**
contra a baseline 376/1366 — a asserção a mais é a guarda do Q-3, **vista reprovando** com
`operation.turma.create` antes de virar verde (lição 10), provada sem tocar `backend/app/` (D14, e o
classificador bloqueia o caminho de qualquer forma). Registrado na D13 da spec: sem essa nota, quem
reler concluiria que a extração comeu asserção. `pnpm test` **21 passed**, `pnpm build` e `pnpm lint`
verdes; Pint (`--test`) `passed` nos **51** arquivos `.php` tocados, com a guarda de lista vazia
(lição 9); `backend/app/`, `backend/database/`, `generated.ts` e `locales/*.json` **sem diff** —
`typescript:transform` não rodou porque nenhum DTO foi tocado. Código morto: nenhum — o trait tem **48**
arquivos consumidores, a moldura **5**, e os **20** helpers privados locais que morreram não deixaram
órfão (`makeClient`, `clientId`, `makeClientWithPrimary`, `actingAdmin`: zero ocorrências). Leis §5: sem
violação — o bloco não toca DDD, auth, RBAC, migration ou financeiro; reforça a §5.6 com o seletor por
argumento e o Q-4 **desfez** 11 mass updates que contrariavam a §5.2/ADR-08 dentro dos testes.

**Pendências:** nenhuma nasceu. **P-25 ganhou a segunda ocorrência medida, na direção inversa** — a D3
manteve `shared/ui` sem importar tipo de `shared/hooks`, mesmo princípio do constraint ausente em
`useFilePreview`; são dois casos no código e **nenhuma linha na rule**, e o bloco tocou a
`frontend-fsliced.md` no parágrafo de query-em-componente, não no de fronteira de tipo. Nenhum gatilho
venceu — P-04 é o mais próximo (2026-08-15).

**Item 1 do backlog (“Hardening estrutural pré-Sprint 4”) fechou por inteiro e saiu da fila** — as 10
tasks do conjunto Notion saíram em 3 blocos de 2026-08-04. Os itens 2–5 foram renumerados para 1–4. A
segunda pendência de fechamento do plano virou **débito técnico registrado, por decisão do João**: as 2
tabelas com dropdown adotam a moldura quando alguém as tocar, e o commit que adotar paga junto a
bifurcação de redação do empty state.

**Sobreviveu e não foi tocado, para o João decidir:** o item 4 do backlog (“Hardening — ownership em
rotas nested e política de retenção documental”) promete metade do que o `hardening-guardrails-e-transportes`
já entregou em H.3.1; a outra metade é a P-02, aberta. Editar item alheio não é remoção do item
concluído, então ficou como está, reportado.

Arquivado: `plans/archive/2026-08-04-hardening-tabela-e-testes-pre-sprint-4.md` ·
`specs/archive/2026-08-04-hardening-tabela-e-testes-pre-sprint-4-design.md` (não compartilhada por
outro work item). Entrega registrada em `progress.md`; a mais antiga
(`Hardening · Upload e visualização de arquivos`, 2026-07-31) migrou para `progress-archive.md` para
manter o teto de dez.

**Aberto, registrado, não resolvido:** Q-2 e Q-4 do review de guardrails, a catraca do `max-lines`
(4 legados), B-7, Q-16, Q-6 e as 2 tabelas com dropdown (§Débitos técnicos do `backlog.md`); P-26;
P-04 para §5.1/§5.2 (reavaliar 2026-08-15); P-25; **o `Status` das tasks H.4.4/H.4.5/H.4.9 no Notion
não foi mexido** — o plano não previa write externo neste bloco, e mudar status é escopo que o João não
autorizou (mesma decisão do fechamento anterior).
