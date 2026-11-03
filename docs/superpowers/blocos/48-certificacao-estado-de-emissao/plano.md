# Bloco 48 — Estado de emissão da matrícula — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar um dono único ao estado de emissão da matrícula, fazer o Dashboard contar o revogado como pendência, fechar a corrida emissão × correção com prova em MySQL, corrigir o texto da conclusão e liberar documento de turma concluída só ao superadmin.

**Architecture:** Um enum de três estados e um serviço em `Domains/Certification` concentram o único `where status = Emitido` e oferecem escopo SQL sobre matrículas e classificação PHP, amarrados por teste de paridade. O resolver de vigência, o `scopeEmitidos` e a `CertificationMetricsQuery` passam a perguntar a ele. A emissão e a correção de resultado relêem a matrícula com `lockForUpdate` (matrícula, depois certificado). Documento de turma concluída ganha permissão exclusiva do superadmin.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-permission, PHPUnit (sqlite `:memory:` + sonda MySQL), React 19 + vitest, i18next.

**Spec:** `docs/superpowers/blocos/48-certificacao-estado-de-emissao/spec.md`

## Global Constraints

- "Vigente" = certificado com `status = Emitido`; nenhuma mudança de comportamento em porta 3, painel de emissão e `ResultLock` (spec §6).
- Ao fim: nenhum `where('status', CertificateStatus::Emitido)` em `app/Domains/Certification` nem em `CertificationMetricsQuery` fora do serviço novo (spec §8.1).
- Ordem de lock: **matrícula, depois certificado**, na emissão e na correção (spec D5).
- Mensagem ao usuário só de `lang/`, três locales (`en`, `es_CL`, `pt_BR`) no backend; três locales (`es-CL`, `pt-BR`, `en`) no front, chaves idênticas.
- Textos de `operation.conclusion.confirmBody` e `operation.detail.lock.concluida`: literais do spec §5.
- Rótulo `perm.*` novo não casa `/Flujo|Fluxo|Flow|RN-\d|soft delete/` (catraca da lane 49, `perm-labels.test.ts`).
- Teste de regressão: ver reprovar contra o código antigo copiando o arquivo antigo para o scratchpad e restaurando — **nunca `git stash`**.
- Backend: `docker compose exec -T app php artisan test ...` na lane (stack de offset +1: `docker compose up -d` na raiz da lane). MySQL: `docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=<Teste>`.
- Pint no host, de `backend/`, só com os arquivos tocados: `./vendor/bin/pint <arquivos>`.

## Review Focus

1. Matrícula com certificado revogado **e** um emitido depois: é vigente, não pendente, e a porta 3 segue recusando — pinado no `EnrollmentEmissionStateParityTest` (Task 1) e no `CertificationMetricsQueryTest` (Task 2).
2. Turma concluída cuja matrícula revogada está **reprovada**: não é pendência (o filtro de aprovação vem antes do estado) — Task 2.
3. Emissão em lote com o lock novo: um item que a correção reprovou no meio não derruba os outros — `BatchIssueTest` segue verde sem edição (Task 3, Step 6).
4. Turma **em andamento**: redator e superadmin continuam subindo e removendo documento; o admin segue 403 — Task 4.
5. Tela da turma concluída para quem não tem a permissão nova: upload e remoção continuam desabilitados, e o motivo exibido não muda — Task 4 (teste do hook).

---

### Task 1: Módulo do estado de emissão + paridade

**Files:**
- Create: `backend/app/Domains/Certification/Enums/EnrollmentEmissionState.php`
- Create: `backend/app/Domains/Certification/Services/EmissionStateResolver.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateVigenciaResolver.php:85-91` (`vigentes()`)
- Modify: `backend/app/Domains/Certification/Models/Certificate.php:55-67` (`scopeEmitidos`)
- Modify: `docs/estrutura-monolito.md` (linha de `Certification/Enums` e `Services` com os dois arquivos novos)
- Test: `backend/tests/Feature/Certification/EnrollmentEmissionStateParityTest.php`

**Interfaces:**
- Consumes: —
- Produces:
  - `enum EnrollmentEmissionState: string { case Vigente = 'vigente'; case RevogadoReemissivel = 'revogado_reemissivel'; case NuncaEmitido = 'nunca_emitido'; }`
  - `EmissionStateResolver::whereVigente(\Illuminate\Contracts\Database\Query\Builder $certificates, string $table = 'certificates'): void` — **estático**; o único `where {$table}.status = Emitido` do bloco.
  - `EmissionStateResolver::whereState(Builder<Enrollment> $enrollments, EnrollmentEmissionState $state): Builder<Enrollment>` — `whereExists`/`whereNotExists` correlacionados em `certificates.enrollment_id = enrollments.id`, sem `JOIN`.
  - `EmissionStateResolver::whereNotVigente(Builder<Enrollment> $enrollments): Builder<Enrollment>` — `whereNotExists` de certificado vigente (= revogado‑reemissível ∪ nunca emitido).
  - `EmissionStateResolver::classify(list<int> $enrollmentIds): array<int, EnrollmentEmissionState>` — uma consulta a `certificates` para o lote; id sem certificado → `NuncaEmitido`; todo id recebido aparece na saída, arquivado ou não.

- [ ] **Step 1: Escrever o teste de paridade.** `EnrollmentEmissionStateParityTest` (`RefreshDatabase`, cenário por `IssuableEnrollmentBuilder`/`CreatesDomainRecords`, certificados criados direto com `Certificate::create`). Cenário, uma matrícula por linha: (a) sem certificado; (b) um `Revocado`; (c) dois `Revocado`; (d) `Revocado` + `Emitido`; (e) um `Emitido`; (f) `Reprobado` com um `Revocado`; (g) arquivada (`delete()`) com um `Emitido`. Testes:
  - `test_escopo_sql_e_classificacao_php_devolvem_os_mesmos_conjuntos`: para cada `EnrollmentEmissionState::cases()`, `whereState(Enrollment::query(), $s)->pluck('id')->sort()->values()` é igual aos ids que `classify($idsNaoArquivados)` põe em `$s`. Esperado explícito: `NuncaEmitido = [a]`, `RevogadoReemissivel = [b, c, f]`, `Vigente = [d, e]`.
  - `test_nao_vigente_e_a_uniao_de_revogado_e_nunca_emitido`: `whereNotVigente` = `[a, b, c, f]`.
  - `test_arquivada_fica_fora_do_escopo_e_classifica_pelos_certificados`: (g) ausente de todo `whereState`; `classify([g])` = `[g => Vigente]`.
  - `test_where_vigente_qualifica_a_tabela`: `Certificate::query()->from('certificates as c')` com `whereVigente($q, 'c')` conta 3 (d, e, g — o predicado é sobre certificados e não filtra matrícula arquivada).
- [ ] **Step 2: Rodar e ver falhar.** `docker compose exec -T app php artisan test --filter=EnrollmentEmissionStateParityTest` → FAIL (classe inexistente).
- [ ] **Step 3: Implementar o enum e o `EmissionStateResolver`** com as assinaturas de Produces. Docblock do serviço: dono do critério, por que existe (as duas "fontes únicas" e a cópia do Dashboard, achado 0.3), e que validade (`valido_ate`) não entra aqui (spec §3).
- [ ] **Step 4: Delegar.** `CertificateVigenciaResolver::vigentes()` monta `Certificate::query()` e aplica `EmissionStateResolver::whereVigente`; `Certificate::scopeEmitidos()` chama `EmissionStateResolver::whereVigente($query)`. Docblocks dos dois passam a apontar o dono. API pública e `implements ResultLock` intactos.
- [ ] **Step 5: Rodar paridade + regressão de Certification.** `docker compose exec -T app php artisan test --filter='EnrollmentEmissionStateParityTest|CertificateEligibilityTest|EmissionPanel|EnrollmentResultAfterConclusionTest|BatchIssueTest|StudentCertificateHistoryTest'` → PASS, sem editar asserção existente.
- [ ] **Step 6: Grep do anti-objetivo (parcial).** `grep -rn "CertificateStatus::Emitido" backend/app/Domains/Certification | grep -v "EmissionStateResolver\|IssueCertificateAction\|StudentCertificateHistory\|Enums/"` → vazio. (`IssueCertificateAction` grava o status, não filtra; `StudentCertificateHistory:57` escolhe o atual numa coleção já carregada, em memória, e fica — reescrever como consulta pagaria uma ida ao banco por aluno; ganha um comentário apontando o `EmissionStateResolver` como dono do critério.)
- [ ] **Step 7: Pint + estrutura-monolito + commit.** `git commit -m "feat(48): estado de emissao da matricula com paridade SQL x PHP"`.

### Task 2: Pendência do Dashboard conta o revogado (achado 0.3)

**Files:**
- Modify: `backend/app/Domains/Dashboard/Services/CertificationMetricsQuery.php:53-96`
- Test: `backend/tests/Feature/Dashboard/CertificationMetricsQueryTest.php`

**Interfaces:**
- Consumes: `EmissionStateResolver::whereNotVigente`, `EmissionStateResolver::whereVigente` (Task 1).
- Produces: —

- [ ] **Step 1: Inverter o teste.** Renomear `test_conta_aprovados_sem_qualquer_certificado_e_nao_reabre_revogado` para `test_conta_aprovados_sem_certificado_vigente_e_reabre_revogado`; mesmo cenário; `assertSame(2, $query->certificadosAEmitir())`; `pendencias()` = uma linha da turma. Docblock cita achado 0.3 e a decisão do João (2026-11-02).
- [ ] **Step 2: Novos casos.** `test_revogado_seguido_de_emitido_nao_e_pendencia` (matrícula aprovada com `Revocado` + `Emitido` → `certificadosAEmitir()` = 0, `pendencias()` = `[]`) e `test_revogado_de_matricula_reprovada_nao_e_pendencia` (`Reprobado` + `Revocado` → 0).
- [ ] **Step 3: Ver falhar.** `--filter=CertificationMetricsQueryTest` → FAIL no teste invertido (conta 1).
- [ ] **Step 4: Implementar.** `pendingEnrollmentQuery()` troca o `whereNotIn('id', Certificate::query()->select('enrollment_id'))` por `EmissionStateResolver::whereNotVigente(...)`; `alertas()` troca o `where('status', Emitido)` por `EmissionStateResolver::whereVigente`. Remover imports órfãos.
- [ ] **Step 5: Rodar.** `--filter='CertificationMetricsQueryTest|Dashboard'` → PASS.
- [ ] **Step 6: Pint + commit.** `git commit -m "fix(48): dashboard conta matricula revogada como pendencia"`.

### Task 3: Emissão e correção travam a matrícula (P-103)

**Files:**
- Modify: `backend/app/Domains/Certification/Actions/IssueCertificateAction.php:26-65`
- Modify: `backend/app/Domains/Operation/Actions/RecordEnrollmentResultAction.php:13-63` (docblock e corpo)
- Test: `backend/tests/Feature/Certification/EmissionResultRaceTest.php`

**Interfaces:**
- Consumes: —
- Produces: — (assinaturas públicas de `IssueCertificateAction::execute(Enrollment, Redator): Certificate` e `RecordEnrollmentResultAction::execute(Enrollment, EnrollmentResultData, User): Enrollment` **não mudam**).

- [ ] **Step 1: Escrever o teste MySQL.** `EmissionResultRaceTest` com `ProbesMysqlConcurrency`; cada teste começa por `skipUnlessMysql()`. Molde do cenário visível aos filhos: `PrimaryConcurrencyTest` (os filhos não enxergam a transação do `RefreshDatabase`).
  - `test_emissao_espera_a_correcao_e_ve_o_resultado_novo`: gate (`mysqlGateConnection`) abre transação, `SELECT ... FROM enrollments WHERE id = ? FOR UPDATE` e `UPDATE enrollments SET approval_status = 'reprobado'` sem commit; filho roda `IssueCertificateAction::execute` para a matrícula; `waitUntilProcessesAreWaitingForMysqlLock($gate, [$filho], 1, 'enrollments')`; gate commita; o filho termina com `ValidationException` cuja mensagem é `__('certification.eligibility.enrollment_not_approved')` (imprimir a mensagem no stdout e asserir); `certificates` sem linha da matrícula.
  - `test_correcao_espera_a_emissao_e_recebe_result_locked`: gate segura `FOR UPDATE` na matrícula e insere certificado `Emitido` sem commit (simula a emissão em curso); filho roda `RecordEnrollmentResultAction::execute` como admin; espera em `enrollments`; gate commita; filho recebe `__('operation.enrollment.result_locked')`.
- [ ] **Step 2: Ver falhar contra o código de hoje.** MySQL: `docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=EmissionResultRaceTest` → FAIL ("MySQL não registrou 1 processo(s) esperando pelo lock de `enrollments`"). Em sqlite o mesmo filtro → SKIPPED.
- [ ] **Step 3: `IssueCertificateAction`.** Primeira linha da transação: `$enrollment = Enrollment::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();`, com o eager-load que portas e snapshot leem (conferir em `CertificateEligibility` e `CertificateSnapshotBuilder`; `preventLazyLoading` acusa o que faltar). Portas e snapshot recebem a relida. Comentário: P-103, ordem de lock.
- [ ] **Step 4: `RecordEnrollmentResultAction`.** Dentro da transação, antes do `ResultLock`: relê a matrícula pelo id com `lockForUpdate()` (com `turma`), e o `fill()->save()->refresh()` opera na relida. Docblock reescrito: a janela fechou, os dois lados travam a matrícula primeiro.
- [ ] **Step 5: Ver passar.** O comando MySQL do Step 2 → PASS (2 testes).
- [ ] **Step 6: Regressão sqlite.** `docker compose exec -T app php artisan test --filter='Certification|EnrollmentResult|BatchIssueTest'` → PASS sem editar asserção.
- [ ] **Step 7: Pint + commit.** `git commit -m "fix(48): emissao e correcao travam a matricula (P-103)"`.

### Task 4: Documento de turma concluída só pelo superadmin

**Files:**
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php` (entrada nova ao lado de `operation.turma.submit_docs`)
- Modify: `backend/database/seeders/RolePermissionSeeder.php:53-60` (excluir do admin, comentário "exclusivo do superadmin")
- Create: `backend/database/migrations/2026_11_02_000001_add_turma_concluded_docs_permission.php` (molde `2026_10_29_000002_add_certification_settings_permission.php`, só `superadmin`)
- Modify: `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`
- Modify: `backend/app/Domains/Operation/Actions/DeleteTurmaDocumentAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php:41-59` (passa `$request->user()`)
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json` (bloco `perm`, uma chave)
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts:42-60`
- Test: `backend/tests/Feature/Operation/TurmaDocumentActionsTest.php`, `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`
- Test: `frontend/src/features/operation/hooks/useTurmaDocsSection.test.tsx` (criar)

**Interfaces:**
- Consumes: —
- Produces:
  - permissão `operation.turma.manage_concluded_docs` (rótulo `perm.operation_turma_manage_concluded_docs`);
  - `StoreTurmaDocumentAction::execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file, User $actor): File`;
  - `DeleteTurmaDocumentAction::execute(Turma $turma, File $file, User $actor): void`.

- [ ] **Step 1: Testes backend.** Em `TurmaDocumentActionsTest`, substituir `test_rn15_store_bloqueado_pos_conclusao`/`test_rn15_delete_bloqueado_pos_conclusao` por: `test_store_pos_conclusao_recusa_quem_nao_tem_a_permissao` e `test_delete_pos_conclusao_recusa_quem_nao_tem_a_permissao` (redator → `ValidationException` com `__('operation.turma.concluded_locked')`), e `test_superadmin_sobe_e_remove_pos_conclusao` (grava/soft-deleta, gera audit). Em `TurmaDocumentApiTest`, matriz em turma concluída: superadmin `POST` 201 e `DELETE` 204; redator 422 nos dois; admin 403 nos dois; e em turma em andamento: redator e superadmin 201/204, admin 403 (Review Focus 4).
- [ ] **Step 2: Ver falhar.** `--filter='TurmaDocument'` → FAIL (assinatura/permissão inexistentes).
- [ ] **Step 3: Permissão.** Catálogo (descrição sem "Fluxo"/"RN-"), seeder (fora da lista do admin; o redator não recebe), migration (idempotente, só `superadmin`, `forgetCachedPermissions`, `down()` apaga). Rótulos front:
  - es-CL: `"operation_turma_manage_concluded_docs": "Subir y quitar documentos de una turma concluida"`
  - pt-BR: `"operation_turma_manage_concluded_docs": "Subir e remover documentos de turma concluída"`
  - en: `"operation_turma_manage_concluded_docs": "Upload and remove documents of a concluded class"`
- [ ] **Step 4: Actions + controller.** Nas duas Actions: turma em andamento → segue como hoje; turma concluída → passa se `$actor->can('operation.turma.manage_concluded_docs')`, senão `$turma->assertAcademicallyWritable()` (que recusa com a mesma chave de hoje). O middleware do controller não muda.
- [ ] **Step 5: Ver passar.** `--filter='TurmaDocument|PermissionI18nParityTest|RolePermission|LocaleParityTest'` → PASS.
- [ ] **Step 6: Front.** `useTurmaDocsSection`: `canSubmit = hasPermission && (!concluida || can('operation.turma.manage_concluded_docs'))`; `lockReason` inalterado. Teste do hook (molde `useConclusionSection.test.tsx`): concluída sem a permissão nova → `canSubmit === false`; concluída com `submit_docs` + a nova → `true`; em andamento com `submit_docs` → `true`. `pnpm vitest run src/features/operation/hooks/useTurmaDocsSection.test.tsx src/shared/config/locales` → PASS.
- [ ] **Step 7: Pint + `pnpm lint` + commit.** `git commit -m "feat(48): superadmin sobe e remove documento de turma concluida"`.

### Task 5: Texto da conclusão (P-104)

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json:747,925`, `pt-BR.json:747,925`, `en.json:747,925` (`operation.detail.lock.concluida`, `operation.conclusion.confirmBody`)

**Interfaces:**
- Consumes: — (roda depois da Task 4: as duas tocam as três locales).
- Produces: —

- [ ] **Step 1: Trocar os seis valores** pelos literais do spec §5, sem mudar chave nem posição.
- [ ] **Step 2: Conferir literalidade.** De `frontend/`: `node -e 'for (const l of ["es-CL","pt-BR","en"]) { const j = require("./src/shared/config/locales/"+l+".json"); console.log(l, "|", j.operation.conclusion.confirmBody, "|", j.operation.detail.lock.concluida) }'` → as seis frases idênticas às do spec §5, caractere a caractere.
- [ ] **Step 3: Rodar.** `pnpm vitest run src/shared/config/locales src/features/operation` e `pnpm build` → PASS (`TurmaDetailPage.test.tsx` e `ConcludePanel.test.tsx` usam a chave, não o texto).
- [ ] **Step 4: Commit.** `git commit -m "fix(48): texto da conclusao diz o que de fato tranca (P-104)"`.

### Task 6: Pendência P-112 para o bloco 50

**Files:**
- Modify: `docs/superpowers/pendencias/abertas.md` (ficha `## P-112`, no fim)
- Modify: `docs/superpowers/pendencias/README.md` (linha da tabela)

**Interfaces:**
- Consumes: —
- Produces: —

- [ ] **Step 1: Ficha P-112.** Título: "cotação ligada a turma: só o valor UF fica editável, e a cotação ganha a tag do status da turma". Cabeçalho no formato das vizinhas (**Bloco:** item 50 · **Quem decide:** João (decidido 2026-11-02) · **Gatilho:** brainstorming do 50 · Revisar em 2026-11-16). Corpo: os três itens de spec D9, literais, com `RejectQuoteAction` e `QuoteApprovalTest.php:77-85` citados.
- [ ] **Step 2: Índice.** Linha `| P-112 | ... | 50 | brainstorming do 50; revisar 2026-11-16 |` na tabela de abertas.
- [ ] **Step 3: Commit.** `git commit -m "docs(48): P-112 registra decisao do Joao para o bloco 50"`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 3, 6 | sim | nenhuma entre elas |
| G2 | 2, 4 | sim | nenhuma entre elas (a 2 consome a 1, que fecha no G1) |

Task fora de grupo executa e revisa uma a uma. A 5 vem depois da 4, porque as duas tocam as três locales do front.

Conferência por par. G1: a 1 toca `Certification/Enums/EnrollmentEmissionState.php`, `Certification/Services/EmissionStateResolver.php`, `CertificateVigenciaResolver.php`, `Certificate.php`, `docs/estrutura-monolito.md` e o teste de paridade; a 3 toca `IssueCertificateAction.php`, `RecordEnrollmentResultAction.php` e `EmissionResultRaceTest.php`; a 6 toca `pendencias/abertas.md` e `pendencias/README.md`. Nenhuma interseção. G2: a 2 toca `CertificationMetricsQuery.php` e o teste dela; a 4 toca catálogo, seeder, migration nova, as duas Actions de documento, o controller, os dois testes de documento, as três locales e o hook do front. Nenhuma interseção, e nenhuma consome o que a outra produz.

**Cruzamento com a lane 49.** O `lane.sh conferir 48` acusa as três locales do front em comum com o plano da 49 (bloco `common` e `perm` lá; `perm` e `operation` aqui). Decisão do João (2026-11-02): segue normal, e quem mesclar por segundo resolve o conflito de texto nos JSON. O rótulo novo da Task 4 já respeita o `perm-labels.test.ts` da 49.

## Handoff de execução

- **executor:** `claude` — o bloco toca peso legal (estado de certificado), lock de concorrência e RBAC; a Task 3 exige julgamento sobre o cenário MySQL.
- **Sessão:** `opus`, esforço `high`.
- **Papéis (`.claude/papeis.md`):** `implementador-integracao` (Tasks 1, 3, 4), `implementador-mecanico` (Tasks 2, 5, 6), `revisor-task` (toda task), `re-revisor` (rodadas de correção), `corretor-tardio` (rodadas 4–5, se houver), `revisor-branch` (fim da SDD).
- **Stack:** a Task 3 precisa do stack da lane no ar (`docker compose up -d`) e do banco `lotus_test` no MySQL dele; as demais rodam na suíte sqlite do container.
