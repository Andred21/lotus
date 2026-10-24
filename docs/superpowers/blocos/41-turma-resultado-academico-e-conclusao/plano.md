# Bloco 41 — `turma-resultado-academico-e-conclusao` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a regra mínima (nota ≥ 4,0 e presença ≥ 70 %) sugere o status no diálogo de resultado e
avisa na divergência; nota e presença aparecem na tabela de alunos; o admin corrige o resultado
depois da conclusão enquanto não há certificado emitido; a conclusão bloqueia por documentos,
redator e configuração e lista quem está sem nota ou presença.

**Architecture:** o backend é dono dos números da regra (`ApprovalRule`, exposto no `TurmaData`) e
do gate de conclusão (`HabilitacaoStatus` passa a carregar requisitos além de documentos). A
pergunta "a matrícula tem certificado vigente?" atravessa domínios por uma porta de Operation
(`ResultLock`) implementada por Certification (`CertificateVigenciaResolver`), sem Operation
importar Certification. O frontend só sugere e avisa — a escrita continua declarada.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit
(sqlite `:memory:`); React 19 + TS, TanStack Query, Vitest, PrimeReact via `shared/ui`.

**Spec:** `docs/superpowers/blocos/41-turma-resultado-academico-e-conclusao/spec.md`

## Global Constraints

- Regra: nota final ≥ **4,0** (escala 1,0–7,0) **e** presença ≥ **70 %**. Os dois números existem
  só em `App\Domains\Operation\Services\ApprovalRule`; o frontend os lê de `TurmaData.approval_rule`.
- Lei 3: `frontend/src/shared/types/generated.ts` só muda por
  `docker compose exec -T app php artisan typescript:transform`. Task que regenera corrige os
  consumidores TS (fixtures de teste incluídas) no mesmo commit, com `pnpm build` verde.
- Lei 6: feature não importa PrimeReact nem outra feature; peças novas de UI vêm de `shared/ui`.
- Lei 2: auditoria só na aplicação; `Enrollment` já é `Auditable`.
- Operation não importa classe de Certification (`DomainDependencyTest`). Certification → Operation
  pode, com a aresta declarada em `DomainDependencyTest::ALLOWED`.
- Mensagem de API sai de `backend/lang/{pt_BR,es_CL,en}/operation.php` (`MensagemLiteralTest`,
  `LocaleParityTest`). Backend: pt_BR "redator/turma", es_CL "relator/clase", en "instructor/class".
- Frontend: as 3 locales com chaves idênticas (`parity.test.ts`); `operation.*` em `en` nunca diz
  editor/writer/instructor (`copy.test.ts`); nenhum "(RN-xx)" em texto de tela.
- Componente em `features/*/components/**` ≤ 150 linhas e sem query direta (lint).
- Aviso de divergência = a mesma marcação do `hoursMismatch` de `ModuleFields.tsx`:
  `<p className="rounded-control px-3 py-2 text-sm" style={{ background: warningSurface, color: warningText }}>`
  com os tokens de `@shared/styles/tokens`. Nunca bloqueia o salvar.
- Pint só nos arquivos tocados: `cd backend && ./vendor/bin/pint <arquivos>`.
- Teste de regressão é visto reprovando contra o código antigo antes do fix: cópia do arquivo de
  produção no scratchpad e `git checkout HEAD -- <arquivo>` / cópia de volta. **Nunca `git stash`.**
- Commits em pt-BR, `feat(41): …`/`test(41): …`, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Lista de matrículas não carregada quando o diálogo de conclusão abre:** a lista de incompletos
   simplesmente não aparece; nada afirma "todos completos". Teste no `useConclusionSection` (Task 6).
2. **Nota digitada com espaço, vírgula, ponto ou fora da escala** ("  6,4 ", "6.4", "35", "0"):
   leitura robusta; fora de 1,0–7,0 não sugere. Teste no `approvalRule.test.ts` (Task 5).
3. **Nota apagada depois de sugerir:** sugestão vira `null` e o status fica como estava (não volta a
   `pendiente`). Teste no `useRegisterResult.test.tsx` (Task 5).
4. **`local_aplicacao` só com espaços** (dado legado) numa presencial: conta como faltante, e o SQL
   do filtro concorda com o domínio. Caso no `TurmaStatusParityTest` (Task 2).
5. **Emissão e correção concorrentes:** a correção lê a vigência com `lockForUpdate` (mesma leitura
   da porta 3 da emissão), o que serializa as duas em MySQL. Em sqlite o lock é no-op e não há
   teste; o docblock da Action declara isso.

---

## Preparação (antes da Task 1, uma vez)

Na raiz da lane (`/home/jvbat/projetos/lotus-41-turma-resultado-academico-e-conclusao`, offset +1):

```bash
docker compose up -d
docker compose exec -T app composer install
docker compose exec -T app php artisan test --filter='EnrollmentResultTest|ConcludeTurmaTest'
```
Esperado: verde (linha de base). `pnpm` não está no PATH do shell do agente; use
`/home/jvbat/.nvm/versions/node/v24.19.0/bin/pnpm -C frontend <script>`.

---

### Task 1: Regra de aprovação no contrato da turma

**Files:**
- Create: `backend/app/Domains/Operation/Services/ApprovalRule.php`
- Create: `backend/app/Domains/Operation/Data/ApprovalRuleData.php`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php`
- Modify: `backend/app/Domains/Operation/Services/AcademicResult.php` (só docblock)
- Create: `backend/tests/Feature/Operation/ApprovalRuleTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado)
- Modify (fixtures `TurmaData` que o `tsc -b` acusar): `frontend/src/features/operation/components/Turma/TurmaDetailPage.test.tsx`, `TurmasTable.test.tsx`, `TurmaConfigCard.test.tsx`, `TurmaRowActions.test.tsx`

**Interfaces:**
- Produces: `ApprovalRule` (`final readonly`, `public float $minGrade`, `public float $minAttendancePct`, `const MIN_GRADE = 4.0`, `const MIN_ATTENDANCE_PCT = 70.0`, `static forTurma(Turma $turma): self`); `ApprovalRuleData` (`#[TypeScript]`, `float $min_grade`, `float $min_attendance_pct`, `static fromRule(ApprovalRule $rule): self`); `TurmaData::$approval_rule` (`ApprovalRuleData|Optional = new Optional`, saída). TS: `ApprovalRuleData = { min_grade: number, min_attendance_pct: number }`, `TurmaData.approval_rule: undefined | ApprovalRuleData`.

- [ ] **Step 1: Teste que falha** — `ApprovalRuleTest`:
  - `test_a_regra_vale_4_e_70`: `ApprovalRule::forTurma($turma)` tem `minGrade === 4.0` e `minAttendancePct === 70.0`.
  - `test_turma_data_expoe_a_regra`: `actingAsAdmin()`, `GET /api/turmas/{id}` → `assertJsonPath('approval_rule.min_grade', 4)` e `('approval_rule.min_attendance_pct', 70)` (o JSON de float inteiro sai `4`/`70` ou `4.0`/`70.0` conforme o encoder; asserir com `assertEquals` sobre `json('approval_rule')` = `['min_grade' => 4.0, 'min_attendance_pct' => 70.0]`).
  - Cenário: `IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel()`.
- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=ApprovalRuleTest` → FAIL (classe inexistente).
- [ ] **Step 3: Implementar.** `forTurma()` devolve as constantes; docblock diz que é o ponto único
  que amanhã lê `courses.note_min`/`presence_min` (fora deste bloco) e que o backend não recusa
  divergência (aprovação declarada, D4). `TurmaData::fromModel` preenche
  `approval_rule: ApprovalRuleData::fromRule(ApprovalRule::forTurma($turma))`; o parâmetro entra
  antes de `client_photo_url`. Docblock do `AcademicResult`: "declarada pelo admin, com sugestão
  pela regra mínima (`ApprovalRule`); o backend não recusa divergência".
- [ ] **Step 4:** teste passa; `docker compose exec -T app php artisan test --filter='Turma'` verde.
- [ ] **Step 5:** `docker compose exec -T app php artisan typescript:transform`; corrigir os
  literais `TurmaData` que o `pnpm -C frontend build` acusar (acrescentar `approval_rule:
  { min_grade: 4, min_attendance_pct: 70 }`). `pnpm build` e `pnpm test` verdes.
- [ ] **Step 6:** Pint nos PHP tocados; commit `feat(41): regra de aprovação no contrato da turma`.

### Task 2: Gate de conclusão — documentos, redator e configuração

**Files:**
- Create: `backend/app/Domains/Operation/Enums/TurmaRequirement.php`
- Modify: `backend/app/Domains/Operation/Services/HabilitacaoStatus.php`
- Modify: `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php`
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php` (`whereDisplayStatus`)
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php`
- Modify: `backend/lang/pt_BR/operation.php`, `backend/lang/es_CL/operation.php`, `backend/lang/en/operation.php`
- Modify: `backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php`, `ConcludeTurmaTest.php`, `TurmaStatusParityTest.php`
- Modify (só se o gate novo quebrar a fixture): `backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php`, `PipelineQueryTest.php`, `backend/tests/Feature/Operation/TurmaPaginationTest.php`, `TurmaQueryBuilderTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado) e os mesmos 4 testes TS da Task 1

**Interfaces:**
- Consumes: `TurmaData` da Task 1.
- Produces: `enum TurmaRequirement: string { case Redator = 'redator'; case LocalAplicacao = 'local_aplicacao'; }`; `HabilitacaoStatus::__construct(TurmaStatus $status, array $missingTypes, array $missingRequirements)` (terceiro parâmetro obrigatório), `missingRequirements(): array<TurmaRequirement>`, `isHabilitada()` = em andamento **e** sem documento faltante **e** sem requisito faltante; `TurmaData::$missing_requirements` (`/** @var TurmaRequirement[]|Optional */ array|Optional`, logo após `missing_document_types`). TS: `TurmaRequirement = 'redator' | 'local_aplicacao'`, `TurmaData.missing_requirements: TurmaRequirement[] | undefined`. 422 do concluir: chave `requirements` com `__('operation.turma.requirements_incomplete', ['itens' => …])`, ao lado da `documents` de hoje (as duas juntas quando faltam as duas).

- [ ] **Step 1: Testes que falham.**
  - `TurmaHabilitacaoServiceTest`: o `setUp` passa a designar um redator (`User::factory()->redator()->create()`, `->redator()->create([])`, `$this->turma->redatores()->attach(...)`) para os casos de documento seguirem isolados. Novos: `test_sem_redator_lista_requisito_e_nao_habilita` (3 docs, sem redator → `missingRequirements() === [TurmaRequirement::Redator]`, `isHabilitada()` false); `test_presencial_sem_local_lista_requisito` (presencial, `local_aplicacao` null → `[LocalAplicacao]`); `test_presencial_com_local_so_espacos_lista_requisito` (`'   '`); `test_online_sem_local_nao_e_requisito`; `test_redator_arquivado_designado_conta` (redator soft-deletado continua no pivot → sem requisito, mesma leitura do `EmissionPanelQuery`).
  - `ConcludeTurmaTest`: `setUp` designa redator. Novos: `test_concluir_sem_redator_422_com_requirements` (3 docs, sem redator → 422, `errors.requirements.0` = `__('operation.turma.requirements_incomplete', ['itens' => __('operation.requirement.redator')])`, status segue `em_andamento`); `test_concluir_presencial_sem_local_422` (mesma forma, item `local_aplicacao`); `test_faltando_docs_e_redator_devolve_as_duas_chaves`; `test_turma_data_expoe_missing_requirements` (`GET` → `missing_requirements` `['redator']` sem redator, `[]` com); `test_conclui_com_aluno_sem_nota_e_presenca` (matrícula via `EnrollStudentAction`, sem resultado, 3 docs, redator → 200).
  - `TurmaStatusParityTest`: o helper `turma()` ganha `bool $redator = true` e `?string $local = 'Santiago'` (com `semRedator()` do builder quando false; `local_aplicacao` do override). Fixture da lista ativa acrescenta: 3 docs sem redator; 3 docs presencial com `local` null; 3 docs presencial com `'   '`. As asserções existentes cobrem a paridade.
- [ ] **Step 2:** `php artisan test --filter='TurmaHabilitacaoServiceTest|ConcludeTurmaTest|TurmaStatusParityTest'` → FAIL nos novos.
- [ ] **Step 3: Implementar.**
  - `TurmaHabilitacaoService::for()`: `Redator` quando `$turma->redatores->isEmpty()`; `LocalAplicacao` quando `modalidade === Presencial` e `blank($turma->local_aplicacao)`; ordem do enum.
  - `TurmaQueryBuilder::whereDisplayStatus()`: `Habilitada` acrescenta `whereHas('redatores')` e `(modalidade <> presencial OR trim(coalesce(local_aplicacao,'')) <> '')`; `EmAndamento` acrescenta `orWhereDoesntHave('redatores')` e `orWhere(presencial AND trim(coalesce(local_aplicacao,'')) = '')` dentro do grupo OR existente. Vale com e sem `asOfArchiving` (o pivot não é cascateado). Docblock atualizado.
  - `ConcludeTurmaAction`: carga fresca `$turma->load(['documentacaoObrigatoria', 'redatores'])`; monta `$messages` com `documents` e/ou `requirements`; lança uma `ValidationException::withMessages($messages)` só se não-vazio.
  - Lang (3 locales):
    - `turma.requirements_incomplete` — pt_BR `Falta para concluir a turma: :itens.` · es_CL `Falta para concluir la clase: :itens.` · en `Missing to conclude the class: :itens.`
    - `requirement.redator` — pt_BR `redator designado` · es_CL `relator designado` · en `assigned instructor`
    - `requirement.local_aplicacao` — pt_BR `local de aplicação (turma presencial)` · es_CL `lugar de aplicación (clase presencial)` · en `venue (in-person class)`
  - `TurmaData::fromModel`: `missing_requirements: $habilitacaoStatus->missingRequirements()`.
- [ ] **Step 4:** os três testes passam; suíte inteira `php artisan test` verde. Fixture de Dashboard
  ou paginação que dependia de "habilitada sem redator" ganha redator designado — nunca se afrouxa
  a asserção.
- [ ] **Step 5:** `typescript:transform`; literais `TurmaData` ganham `missing_requirements: []`;
  `pnpm build` e `pnpm test` verdes.
- [ ] **Step 6:** Pint; commit `feat(41): conclusão exige redator e configuração completa`.

### Task 3: Correção do resultado depois da conclusão (backend)

**Files:**
- Create: `backend/app/Domains/Operation/Services/ResultLock.php`
- Modify: `backend/app/Domains/Certification/Services/CertificateVigenciaResolver.php`
- Modify: `backend/app/Providers/AppServiceProvider.php` (binding)
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (aresta `Certification` → `Operation\Services\ResultLock`, com comentário)
- Modify: `backend/app/Domains/Operation/Models/Enrollment.php`
- Modify: `backend/app/Domains/Operation/QueryBuilders/EnrollmentQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Data/EnrollmentData.php`
- Modify: `backend/app/Domains/Operation/Actions/RecordEnrollmentResultAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php`
- Modify: `backend/lang/{pt_BR,es_CL,en}/operation.php`
- Modify: `backend/tests/Feature/Operation/EnrollmentResultTest.php`
- Create: `backend/tests/Feature/Operation/EnrollmentResultAfterConclusionTest.php`
- Modify: `frontend/src/shared/types/generated.ts` (regenerado) e fixtures `EnrollmentData`: `frontend/src/features/operation/components/Enrollment/{EnrollmentTable,EnrollmentSection,ArchivedEnrollmentsList}.test.tsx`, `frontend/src/features/operation/hooks/useRegisterResult.test.tsx`

**Interfaces:**
- Produces:
  - `interface ResultLock { /** @param list<int> $enrollmentIds @return list<int> */ public function lockedAmong(array $enrollmentIds): array; public function isLockedForUpdate(int $enrollmentId): bool; }` — "trancado" = certificado vigente (`emitido`); revogado não tranca.
  - `CertificateVigenciaResolver implements ResultLock`: `lockedAmong` = `vigentes()->whereIn(...)->pluck('enrollment_id')` sem repetição; `isLockedForUpdate` delega a `existeVigenteForUpdate`. Binding `ResultLock::class → CertificateVigenciaResolver::class` no `AppServiceProvider`.
  - `Enrollment`: propriedade PHP privada `?bool $resultLocked = null` (não é atributo Eloquent — não pode ir para o `save()`); `markResultLocked(bool $locked): void`; `resultLocked(): bool` (lança `LogicException` se a projeção não marcou); `static markResultLocks(Collection $enrollments): void` (UMA chamada a `lockedAmong`); `loadListingData()` passa a marcar a própria instância.
  - `EnrollmentQueryBuilder::withListingData()` marca a coleção depois da consulta (`afterQuery`, se o Eloquent Builder do Laravel 13 aplicá-lo aos models hidratados; se não aplicar em relação/`onlyTrashed`, marcar explicitamente nos dois pontos do `EnrollmentController` que listam e registrar a escolha no docblock).
  - `EnrollmentData::$result_locked` (`bool|Optional`, saída; `fromModel` usa `$e->resultLocked()`). TS: `result_locked: boolean | undefined`.
  - `RecordEnrollmentResultAction::__construct(ResultLock $resultLock)`; `execute(Enrollment $enrollment, EnrollmentResultData $data, User $actor): Enrollment`.
  - 422 novo: chave `enrollment`, `__('operation.enrollment.result_locked')`.

- [ ] **Step 1: Testes que falham** — `EnrollmentResultAfterConclusionTest` (cenário `IssuableEnrollmentBuilder::make()->create()`: turma concluída, matrícula aprovada, redator designado):
  - `test_admin_corrige_resultado_sem_certificado_e_gera_audit`: `actingAsAdmin()`, `PUT .../resultado` com `grades.final = '5,5'`, `attendance_pct = '80'`, `approval_status = 'aprobado'` → 200; a última audit da matrícula tem `new_values.grades` com `final = '5,5'`.
  - `test_redator_nao_corrige_turma_concluida`: usuário do redator da turma (role `redator`, `RolePermissionSeeder`) → 422 `errors.turma.0` = `__('operation.turma.concluded_locked')`.
  - `test_certificado_emitido_tranca`: `app(IssueCertificateAction::class)->execute($enrollment, $redator)` e depois PUT do admin → 422 `errors.enrollment.0` = `__('operation.enrollment.result_locked')`; matrícula inalterada.
  - `test_certificado_revogado_destrava`: emitir, depois `$certificado->update(['status' => CertificateStatus::Revocado, 'revoked_at' => now(), 'revocation_reason' => 'erro'])` → PUT 200.
  - `test_listagem_expoe_result_locked`: duas matrículas na turma concluída, uma com certificado emitido → `GET /api/turmas/{id}/alunos` traz `result_locked` true só nela.
  - `test_matricular_e_remover_em_turma_concluida_seguem_422`.
  - `test_fromModel_sem_projecao_recusa`: `EnrollmentData::fromModel(Enrollment::query()->first())` lança `LogicException`.
  - `EnrollmentResultTest`: `test_turma_concluida_recusa_resultado_com_rn15` vira o caso do **redator** (admin agora corrige); `test_result_nao_lazy_loada_apos_refresh` passa o `Request` com usuário ao `result()` do controller.
- [ ] **Step 2:** `php artisan test --filter='EnrollmentResult'` → FAIL nos novos.
- [ ] **Step 3: Implementar.**
  - Action, dentro da transação: se `$turma->status !== TurmaStatus::EmAndamento` e
    `! $actor->can('operation.enrollment.manage')`, chama `$turma->assertAcademicallyWritable()`
    (mantém a recusa de hoje para o redator); depois, `isLockedForUpdate($enrollment->id)` → 422
    `enrollment`. Docblock: turma arquivada já sai 404 no binding; o `lockForUpdate` serializa com a
    porta 3 da emissão em MySQL e é no-op em sqlite. Matricular/importar/remover/restaurar seguem
    com `assertAcademicallyWritable()` sem mudança.
  - Controller `result(..., Request $request)`: `$action->execute($enrollment, $data, $request->user())`.
  - Lang `enrollment.result_locked` — pt_BR `Esta matrícula já tem certificado emitido: o resultado não pode mais ser alterado.` · es_CL `Esta matrícula ya tiene certificado emitido: el resultado ya no se puede modificar.` · en `This enrollment already has an issued certificate: its result can no longer be changed.`
- [ ] **Step 4:** testes passam; `php artisan test --filter='DomainDependencyTest|ListQueryBudgetTest|SoftDeletedRelationProjectionTest|PersistenceLawsTest'` verde (a listagem de alunos custa a mesma contagem com N=2 e N=20); suíte inteira verde.
- [ ] **Step 5:** `typescript:transform`; fixtures `EnrollmentData` ganham `result_locked: false`; `pnpm build`/`pnpm test` verdes.
- [ ] **Step 6:** Pint; commit `feat(41): admin corrige resultado de turma concluída sem certificado`.

### Task 4: Nota e presença na tabela; ação de correção na turma concluída

**Files:**
- Create: `frontend/src/features/operation/lib/enrollmentResult.ts`, `enrollmentResult.test.ts`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx`, `enrollmentColumns.ts`, `EnrollmentRowActions.tsx`, `EnrollmentTable.test.tsx`
- Modify: `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`

**Interfaces:**
- Consumes: `EnrollmentData.result_locked` (Task 3).
- Produces: `finalGradeOf(e: EnrollmentData): string | null` (lê `grades.final`; vazio/ausente → null; número vira `String(n)`); `formatGrade(raw: string, locale: string): string` (numérico com vírgula ou ponto → `Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 })`; texto não numérico sai como veio); `formatAttendance(pct: string, locale: string): string` (`Intl.NumberFormat(locale, { maximumFractionDigits: 2 })` + `' %'`). `EnrollmentRowActions` troca `canManage` por `canResult: boolean` e `canRemove: boolean`.

- [ ] **Step 1: Testes que falham.**
  - `enrollmentResult.test.ts`: `formatGrade('6.2','es-CL') === '6,2'`; `formatGrade('6,4','pt-BR') === '6,4'`; `formatGrade('7','en') === '7.0'`; `formatGrade('aprobado con distinción','es-CL')` devolve o texto; `formatAttendance('87.50','es-CL') === '87,5 %'`; `formatAttendance('100.00','en') === '100 %'`; `finalGradeOf` com `grades` null, `{}`, `{ final: '' }` → null; `{ final: 6.2 }` → `'6.2'`.
  - `EnrollmentTable.test.tsx` (mock de i18n em `es-CL`): matrícula com `grades: { final: '6,4' }`, `attendance_pct: '87.50'` mostra `6,4` e `87,5 %`; nulos mostram `—`; turma concluída + `operation.enrollment.manage`: linha com `result_locked: false` tem o botão `certificate.result.action` e não tem `operation.enrollment.remove`; linha com `result_locked: true` não tem botão; concluída sem `manage`: sem coluna de ações (último `th` é o de status); piso `--table-narrow-floor` = `40rem` (atualiza o caso de `31.5rem`).
- [ ] **Step 2:** `pnpm -C frontend test -- enrollmentResult EnrollmentTable` → FAIL.
- [ ] **Step 3: Implementar.** Colunas NOTA e PRESENÇA entre RUT e status, valor em
  `technicalDataClass`, travessão em texto normal; `enrollmentWidths(actions)` =
  `tableWidths({ name: COL.identity, rut: COL.rut, grade: COL.count, attendance: COL.tag, status: COL.tag }, { actions })`;
  a coluna de ações existe quando `!registroBloqueado || canManage`; na concluída,
  `canResult = canManage && !e.result_locked` e `canRemove = false`; aberta, como hoje
  (`canResult = canManage`, `canRemove = true`). `narrowFloorTablePt('40rem')`. Locales:
  - `operation.enrollment.table.grade` — `NOTA` · `NOTA` · `GRADE`
  - `operation.enrollment.table.attendance` — `PRESENÇA` · `ASISTENCIA` · `ATTENDANCE`
  - `operation.detail.lock.concluida` — pt-BR `A turma está concluída: só a nota, a presença e o status de alunos ainda sem certificado podem ser corrigidos.` · es-CL `La turma está concluida: solo se pueden corregir la nota, la asistencia y el estado de alumnos aún sin certificado.` · en `The class is concluded: only the grade, attendance and status of students without a certificate can still be corrected.`
- [ ] **Step 4:** `pnpm -C frontend test`, `lint`, `build` verdes.
- [ ] **Step 5:** commit `feat(41): nota e presença na tabela de alunos`.

### Task 5: Sugestão de status e aviso de divergência no diálogo

**Files:**
- Create: `frontend/src/features/operation/lib/approvalRule.ts`, `approvalRule.test.ts`
- Modify: `frontend/src/features/operation/hooks/useRegisterResult.ts`, `useRegisterResult.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/RegisterResultDialog.tsx`, `EnrollmentTable.tsx`, `EnrollmentSection.tsx`
- Modify: `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`

**Interfaces:**
- Consumes: `TurmaData.approval_rule` (Task 1).
- Produces: `parseGrade(raw: string): number | null` (trim; `^\d+([.,]\d+)?$`; fora de 1–7 → null); `parseAttendance(raw: string): number | null` (mesma forma; fora de 0–100 → null); `suggestedStatus(finalGrade: string, attendance: string, rule: ApprovalRuleData | undefined): 'aprobado' | 'reprobado' | null`. `useRegisterResult(turmaId, enrollment, visible, rule: ApprovalRuleData | undefined)` expõe também `ruleWarning: string | null`. `RegisterResultDialog` e `EnrollmentTable` ganham a prop `approvalRule?: ApprovalRuleData`; `EnrollmentSection` passa `turma.approval_rule`.

- [ ] **Step 1: Testes que falham.**
  - `approvalRule.test.ts` (regra `{ min_grade: 4, min_attendance_pct: 70 }`): `('4,0','70')` → aprobado; `('3,9','100')` → reprobado; `('7','69.9')` → reprobado; `(' 6,4 ','80')` → aprobado; `('6.4','80')` → aprobado; `('','80')`, `('6','')`, `('bueno','80')`, `('35','80')`, `('0','80')`, `('6','101')` → null; regra `undefined` → null.
  - `useRegisterResult.test.tsx`: digitar nota `5` e presença `80` → `form.approval_status === 'aprobado'`; `setStatus('reprobado')` → `ruleWarning` não-nulo e o PUT envia `reprobado`; depois `setFinalGrade('6')` → volta a `aprobado`; matrícula salva `pendiente` com `{ final: '5' }`/`'80'` abre sem mudar o status e com `ruleWarning` não-nulo; editar presença para `85` → `aprobado`; apagar a nota depois de sugerir mantém o status; sem regra, nada muda sozinho.
- [ ] **Step 2:** `pnpm -C frontend test -- approvalRule useRegisterResult` → FAIL.
- [ ] **Step 3: Implementar.** `setFinalGrade`/`setAttendance` recalculam a sugestão sobre o form
  novo e, se não-nula, gravam-na em `approval_status`; abrir/resetar o form não recalcula.
  `ruleWarning` = sugestão não-nula ≠ status do form → `t('certificate.result.ruleSuggestsApproved' | 'ruleSuggestsFailed', { grade, attendance, minGrade, minAttendance })`, com `grade`/`attendance` como digitados (trim) e os mínimos em `Intl.NumberFormat(i18n.language)` (`minGrade` com uma casa: `4,0`/`4.0`; `minAttendance` sem casas). O diálogo mostra o aviso logo acima dos botões com a marcação do Global Constraints. Locales:
  - `certificate.result.ruleSuggestsApproved` — pt-BR `Nota {{grade}} e presença {{attendance}} % atingem o mínimo ({{minGrade}} e {{minAttendance}} %): a regra indica Aprovado. Você pode salvar assim mesmo.` · es-CL `Nota {{grade}} y asistencia {{attendance}} % alcanzan el mínimo ({{minGrade}} y {{minAttendance}} %): la regla indica Aprobado. Puedes guardar de todas formas.` · en `Grade {{grade}} and attendance {{attendance}} % meet the minimum ({{minGrade}} and {{minAttendance}} %): the rule indicates Approved. You can save anyway.`
  - `certificate.result.ruleSuggestsFailed` — pt-BR `Nota {{grade}} ou presença {{attendance}} % abaixo do mínimo ({{minGrade}} e {{minAttendance}} %): a regra indica Reprovado. Você pode salvar assim mesmo.` · es-CL `Nota {{grade}} o asistencia {{attendance}} % bajo el mínimo ({{minGrade}} y {{minAttendance}} %): la regla indica Reprobado. Puedes guardar de todas formas.` · en `Grade {{grade}} or attendance {{attendance}} % below the minimum ({{minGrade}} and {{minAttendance}} %): the rule indicates Failed. You can save anyway.`
- [ ] **Step 4:** `pnpm -C frontend test`, `lint`, `build` verdes.
- [ ] **Step 5:** commit `feat(41): status sugerido pela regra mínima, com aviso de divergência`.

### Task 6: Painel e confirmação da conclusão

**Files:**
- Modify: `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx`, `ConfirmDialog.test.tsx`
- Modify: `frontend/src/features/operation/lib/enrollmentResult.ts`, `enrollmentResult.test.ts`
- Modify: `frontend/src/features/operation/hooks/useConclusionSection.ts`
- Create: `frontend/src/features/operation/hooks/useConclusionSection.test.tsx`
- Create: `frontend/src/features/operation/components/Document/IncompleteResultsList.tsx`, `IncompleteResultsList.test.tsx`
- Modify: `frontend/src/features/operation/components/Document/ConcludePanel.tsx`
- Create: `frontend/src/features/operation/components/Document/ConcludePanel.test.tsx`
- Modify: `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`

**Interfaces:**
- Consumes: `TurmaData.missing_requirements` (Task 2), `finalGradeOf` (Task 4), `useEnrollments` (`features/operation/api/useEnrollments.ts`).
- Produces: `ConfirmDialog` aceita `children?: ReactNode`, renderizado depois da mensagem; `missingResultFields(e: EnrollmentData): Array<'grade' | 'attendance'>` (nota por `finalGradeOf`, presença `attendance_pct` nulo/vazio); `useConclusionSection(turma)` expõe também `missingRequirements: TurmaRequirement[]` e `incompleteStudents: { name: string; missing: Array<'grade' | 'attendance'> }[]` (só das matrículas ativas carregadas; lista vazia se a consulta falhou ou não carregou); `IncompleteResultsList({ students })`.

- [ ] **Step 1: Testes que falham.**
  - `ConfirmDialog.test.tsx`: `children` aparece no corpo junto da mensagem.
  - `enrollmentResult.test.ts`: `missingResultFields` → `[]`, `['grade']`, `['attendance']`, `['grade','attendance']`.
  - `useConclusionSection.test.tsx` (axios mockado como em `useRegisterResult.test.tsx`): GET de alunos com três matrículas (completa; sem nota; sem nota e sem presença) → `incompleteStudents` nas duas últimas, na ordem da lista; GET falhando → `[]`; `missingRequirements` repassa `turma.missing_requirements`.
  - `IncompleteResultsList.test.tsx`: título `operation.conclusion.incomplete.title`, um `li` por aluno, lista com `role="list"`.
  - `ConcludePanel.test.tsx` (hook mockado): `habilitada=false` com `missingRequirements=['redator']` lista `operation.conclusion.requirement.redator` no card de pendências; habilitada com `incompleteStudents` não-vazio → abrir a confirmação mostra a lista e o confirmar segue habilitado; sem incompletos a lista não aparece.
- [ ] **Step 2:** `pnpm -C frontend test -- ConfirmDialog enrollmentResult useConclusionSection IncompleteResultsList ConcludePanel` → FAIL.
- [ ] **Step 3: Implementar.** `IncompleteResultsList` copia a voz da lista "movidos" do
  `ImportResultSummary`: `<div className="space-y-1 text-sm">`, `<p className="font-medium">` com o
  título, `<ul role="list" className="list-disc pl-5" style={{ color: 'var(--text-color-secondary)' }}>`,
  item `t('operation.conclusion.incomplete.row', { name, missing })`, e uma linha final com
  `operation.conclusion.incomplete.hint`. `ConcludePanel`: o card de pendências lista documentos e
  requisitos sob `missingTitle`; a `ConfirmDialog` recebe a lista como `children` quando houver
  incompletos. Locales:
  - `operation.conclusion.missingTitle` — `Falta para concluir a turma:` · `Falta para concluir la turma:` · `Missing to conclude the class:`
  - `operation.conclusion.requirement.redator` — `Redator designado` · `Redactor designado` · `Assigned redator`
  - `operation.conclusion.requirement.local_aplicacao` — `Local de aplicação (turma presencial)` · `Lugar de aplicación (turma presencial)` · `Venue (in-person class)`
  - `operation.conclusion.warning` — pt-BR `Ao confirmar, os certificados dos alunos aprovados passam a estar disponíveis para emissão. Depois disso, só o administrador corrige nota, presença e status, e só de alunos ainda sem certificado. A ação não pode ser desfeita.` · es-CL `Al confirmar, los certificados de los alumnos aprobados pasan a estar disponibles para emisión. Después, solo el administrador corrige nota, asistencia y estado, y solo de alumnos aún sin certificado. La acción no se puede deshacer.` · en `On confirmation, certificates for approved students become available for issuing. After that, only an administrator can correct grade, attendance and status, and only for students without a certificate. This action cannot be undone.`
  - `operation.conclusion.incomplete.title` — `Alunos sem nota ou presença:` · `Alumnos sin nota o asistencia:` · `Students without grade or attendance:`
  - `operation.conclusion.incomplete.row` — `{{name}} — {{missing}}` nas três
  - `operation.conclusion.incomplete.grade` — `sem nota` · `sin nota` · `no grade`
  - `operation.conclusion.incomplete.attendance` — `sem presença` · `sin asistencia` · `no attendance`
  - `operation.conclusion.incomplete.both` — `sem nota e presença` · `sin nota ni asistencia` · `no grade or attendance`
  - `operation.conclusion.incomplete.hint` — `Eles não bloqueiam a conclusão; o resultado pode ser corrigido depois, enquanto não houver certificado.` · `No bloquean la conclusión; el resultado se puede corregir después, mientras no haya certificado.` · `They do not block the conclusion; the result can be corrected later, while there is no certificate.`
- [ ] **Step 4:** `pnpm -C frontend test`, `lint`, `build` verdes.
- [ ] **Step 5:** commit `feat(41): conclusão lista pendências e alunos sem nota ou presença`.

### Task 7: Verificação no navegador e gate completo

**Files:**
- Create: `docs/superpowers/blocos/41-turma-resultado-academico-e-conclusao/smoke.md`

- [ ] **Step 1:** gate fresco: `docker compose exec -T app php artisan test` (suíte inteira),
  `pnpm -C frontend lint`, `pnpm -C frontend test`, `pnpm -C frontend build`. Tudo verde.
- [ ] **Step 2:** stack da lane: `docker compose exec -T app php artisan migrate:fresh --seed --force`,
  Vite em background (`pnpm -C frontend dev`, porta 5174), login `admin@lotus.cl` / `senha123`.
  Navegador por `playwright-cli` com `--config` apontando o Chromium de
  `/home/jvbat/.cache/ms-playwright/`; abrir sempre `http://localhost:5174`.
- [ ] **Step 3:** conferir e capturar (scratchpad, caminho absoluto):
  1. aba Alunos da turma concluída do seed: colunas NOTA e PRESENÇA com valores;
  2. diálogo de resultado de turma em andamento: nota 5 + presença 80 → Aprovado; trocar para
     Reprovado → aviso amarelo; salvar passa;
  3. turma concluída: aluno sem certificado mostra a ação e salva a correção; emitir o certificado
     de um aluno pela Conclusão/Emissão e ver a ação sumir da linha dele;
  4. turma sem redator (CGE do seed): painel lista "Redator designado" e o botão fica desabilitado;
  5. turma pronta com aluno sem nota: o diálogo de confirmação lista o aluno e conclui.
  Medir a tabela de alunos a 390 px e a 1440 px; se o piso de `40rem` sobrar ou faltar, ajustar e
  reportar o número medido (e o teste do piso junto).
- [ ] **Step 4:** registrar no `smoke.md` o que foi visto em cada item, com o caminho das capturas;
  commit `docs(41): smoke no navegador`.

---

## Grupos paralelos

Nenhum grupo. Toda task toca `generated.ts` ou as três locales do frontend (as Tasks 1, 2 e 3
regeneram o `generated.ts` e editam as mesmas fixtures TS; as Tasks 4, 5 e 6 editam os mesmos três
JSON de locale e a 4 e a 5 tocam `EnrollmentTable.tsx`), então nenhum par tem `Files:` disjuntos.

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- **executor:** `claude`. O bloco toca as leis 2, 3 e 6, abre aresta nova entre domínios e muda o
  gate de uma escrita terminal; não é mecânico com paths fechados.
- **Sessão:** modelo `opus`, esforço da sessão, na lane
  `/home/jvbat/projetos/lotus-41-turma-resultado-academico-e-conclusao` (offset +1).
- **Papéis** (`.claude/papeis.md`):
  - `implementador-integracao` nas Tasks 1 a 6 (todas multi-arquivo);
  - `revisor-task` por task, `re-revisor` nas rodadas de correção e `corretor-tardio` nas rodadas
    4 e 5;
  - `revisor-branch` ao fim.
  - A Task 7 roda na própria sessão: precisa do stack e do navegador.
- **paths_autorizados:** não se aplica (`executor: claude`).
