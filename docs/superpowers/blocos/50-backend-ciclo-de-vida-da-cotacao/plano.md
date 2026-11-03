# Bloco 50 — Ciclo de vida da cotação — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As transições da cotação passam por um guardião único sob `Quote::lockRow`. Recusar com turma viva dá 422. A aprovada fica editável só pelo superadmin (só UF com turma). Restaurar turma confere a cotação. A P-49 fecha com `Budget::lockForWrite`. A tag da turma aparece na cotação e no orçamento.

**Architecture:** `Domains/Commercial/Services/QuoteLifecycle` concentra a matriz da D2: cada método estático trava a cotação, recusa a arquivada, confere origem e turma e devolve a linha travada. As quatro Actions da cotação continuam como porta do controller: cada uma abre `DB::transaction`, chama o guardião e grava. O `QuoteData` ganha `turma_status`, só de saída, e o front lê dele a tag e a visibilidade das ações.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit (sqlite `:memory:`), React 19 + TS, Vitest, i18next.

**Spec:** `docs/superpowers/blocos/50-backend-ciclo-de-vida-da-cotacao/spec.md`

## Global Constraints

- DDD-lite sem Repository. Erro de domínio é `ValidationException::withMessages([...])` (handler RFC 7807), nunca `abort(422)`.
- "Só superadmin" = `$user->can('commercial.quote.approve')`. Nenhuma permissão nova.
- "Tem turma" = `Quote::turma()` (hasOne sem `withTrashed`): turma arquivada não conta (D1).
- Ordem de lock: orçamento → cotação; turma → cotação. Nenhum sítio trava cotação → orçamento (D4).
- `generated.ts` só por `docker compose exec -T app php artisan typescript:transform`.
- Toda mensagem nova nos três locales do backend (`es_CL`, `pt_BR`, `en`), com textos distintos entre si (`MensagemComercialLocalizadaTest`).
- Front: features importam só de `shared/ui` e de si mesmas; tag pelo `AppTag`.
- `Model::preventLazyLoading()` está ligado: toda carga que alimenta `QuoteData::fromModel` precisa trazer `turma`, ou a suíte estoura.
- Testes PHP: `docker compose exec -T app php artisan test --filter=<Nome>` (stack da lane no ar). Pint: `cd backend && ./vendor/bin/pint <arquivos>`. Front: de `frontend/`, `pnpm test <arquivo>`, `pnpm lint`, `pnpm build`.

## Review Focus

1. **Cotação arquivada entre o binding e o lock.** Por exemplo, o orçamento foi arquivado em paralelo e a cascata levou a cotação. Aprovar, recusar, editar ou arquivar dá 422 `commercial.quote.archived` e não grava. Teste na Task 1 (Action chamada direto com a cotação já `delete()`ada).
2. **Aprovar × arquivar orçamento.** `DeleteBudgetAction` trava as cotações do orçamento (`lockForUpdate`) depois do `Budget::lockRow` e decide "há aprovada?" sobre elas. Sem isso, um aprovar concorrente passa e a cascata arquiva uma cotação aprovada. Em sqlite não há prova de lock: a Task 3 traz o teste de regra, e o revisor confere a ordem no código.
3. **Formulário inteiro reenviado sem mudança.** O superadmin manda o `PUT` com todos os campos iguais ao gravado e só o UF novo, em aprovada com turma. Deve dar 200. As datas chegam `"2026-11-10"` contra `date` gravado, e `purchase_order` chega `null` contra `null`. Teste na Task 2.
4. **Turma arquivada dos dois lados.** Aprovada com turma arquivada aceita recusa e edição de curso (D1). Restaurar essa turma depois dá 422 e ela continua arquivada (D10). Testes nas Tasks 1, 2 e 4.
5. **Listagens de arquivados com turma.** `GET /api/budgets/archived` e `GET /api/budgets/{id}/quotes/archived` com cotação que tem turma não estouram lazy loading e trazem `turma_status`. Teste na Task 5.

---

### Task 1: Guardião `QuoteLifecycle` + aprovar, recusar e arquivar

**Files:**
- Create: `backend/app/Domains/Commercial/Services/QuoteLifecycle.php`
- Modify: `backend/app/Domains/Commercial/Actions/ApproveQuoteAction.php`, `RejectQuoteAction.php`, `DeleteQuoteAction.php`
- Modify: `backend/lang/es_CL/commercial.php`, `backend/lang/pt_BR/commercial.php`, `backend/lang/en/commercial.php`
- Modify: `backend/tests/Feature/Commercial/MensagemComercialLocalizadaTest.php` (as chaves novas entram em `CHAVES`)
- Test: `backend/tests/Feature/Comercial/QuoteTransitionMatrixTest.php` (novo)

**Interfaces:**
- Produces (todos chamados DENTRO de `DB::transaction`, travam com `Quote::lockRow($id)` e lançam `ValidationException`):
  - `QuoteLifecycle::lockToApprove(int $quoteId): Quote`
  - `QuoteLifecycle::lockToReject(int $quoteId): Quote`
  - `QuoteLifecycle::lockToArchive(int $quoteId): Quote`
  - `QuoteLifecycle::temTurma(Quote $locked): bool`, ou seja, `$locked->turma()->exists()`, para a Task 2 reusar.
- Chaves novas em `commercial.quote` (es_CL fixado aqui; pt_BR e en no tom dos vizinhos):
  - `archived` → `'Esta cotización fue archivada.'` (chave de erro `quote`)
  - `already_approved` → `'La cotización ya está aprobada.'` (chave `status`)
  - `already_rejected` → `'La cotización ya está rechazada.'` (chave `status`)
  - `turma_exists_cannot_reject` → `'La cotización tiene una turma activa o concluida: no puede rechazarse.'` (chave `status`)

- [ ] **Step 1: Escrever os testes que falham**

O `QuoteTransitionMatrixTest` monta, num helper `cenario(string $status, ?string $turma)`, um orçamento, uma cotação `forceCreate` no status pedido e, quando `$turma` for `'em_andamento'`, `'concluida'` ou `'arquivada'`, uma turma `Turma::create([...])` no molde de `TurmaArchiveEndpointTest.php:89-96`. Na `arquivada`, a turma é criada e depois recebe `delete()`. Os testes, todos como superadmin pela API:

- `test_recusar_com_turma_em_andamento_da_422`: `POST /reject` → 422, `errors.status`; o status gravado continua `approved` e o `approved_at` não é nulo.
- `test_recusar_com_turma_concluida_da_422`: idem.
- `test_recusar_com_turma_arquivada_passa`: 200, status `rejected`, `approved_at` nulo.
- `test_recusar_aprovada_sem_turma_passa`: 200, `rejected`.
- `test_recusar_recusada_da_422`: 422, `errors.status`.
- `test_aprovar_pendente_e_recusada_passa`: um data provider com `pending` e `rejected` → 200, `approved`, `approved_at` preenchido.
- `test_aprovar_aprovada_da_422`: 422; o `approved_at` gravado não muda.
- `test_arquivar_aprovada_da_422_e_pendente_passa`: o comportamento de hoje continua.
- `test_transicao_sobre_cotacao_arquivada_depois_do_binding_da_422` (Review Focus 1): carrega `$quote`, faz `Quote::whereKey($id)->first()->delete()` e chama `app(ApproveQuoteAction::class)->execute($quote)`; espera `ValidationException` com a chave `quote`. Repete com `RejectQuoteAction` e `DeleteQuoteAction`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=QuoteTransitionMatrixTest`
Expected: FAIL. Hoje recusar com turma dá 200, e aprovar aprovada também.

- [ ] **Step 3: Implementar `QuoteLifecycle` e reescrever as três Actions**

O guardião recusa a cotação travada que estiver `trashed()` (com `archived`) antes de qualquer outra regra. Depois aplica a coluna da D2:

- aprovar: recusa `Approved` com `already_approved`;
- recusar: recusa `Rejected` com `already_rejected`, e recusa quando `temTurma` com `turma_exists_cannot_reject`;
- arquivar: recusa `Approved` com o `approved_cannot_delete` de hoje.

Cada Action vira `DB::transaction(fn () => ...)`: chama o guardião e grava sobre a linha **travada**:

- aprovar: `status` e `approved_at => now()`;
- recusar: `status` e `approved_at => null`;
- arquivar: `delete()`.

A Action devolve a cotação travada. O docblock de classe do guardião diz que ele é o dono da matriz da D2, cita a ordem de lock da D4 e diz que o lock é no-op em sqlite.

- [ ] **Step 4: Rodar e ver passar, com a vizinhança**

Run: `docker compose exec -T app php artisan test --filter='QuoteTransitionMatrixTest|QuoteApprovalTest|QuoteCrudTest|QuoteArchiveEndpointTest|MensagemComercialLocalizadaTest'`
Expected: PASS. O `QuoteApprovalTest:77` (recusa aprovada sem turma e apaga) continua verde.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Services/QuoteLifecycle.php app/Domains/Commercial/Actions/ApproveQuoteAction.php app/Domains/Commercial/Actions/RejectQuoteAction.php app/Domains/Commercial/Actions/DeleteQuoteAction.php tests/Feature/Comercial/QuoteTransitionMatrixTest.php tests/Feature/Commercial/MensagemComercialLocalizadaTest.php && cd ..
git add backend/app/Domains/Commercial backend/lang backend/tests
git commit -m "fix(50): guardião das transições da cotação sob lock"
```

---

### Task 2: Edição da cotação pelo guardião

**Files:**
- Modify: `backend/app/Domains/Commercial/Services/QuoteLifecycle.php` (método novo)
- Modify: `backend/app/Domains/Commercial/Actions/UpdateQuoteAction.php`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteController.php` (`update` passa o ator)
- Modify: `backend/lang/{es_CL,pt_BR,en}/commercial.php`, `backend/tests/Feature/Commercial/MensagemComercialLocalizadaTest.php`
- Test: `backend/tests/Feature/Comercial/QuoteTransitionMatrixTest.php` (casos de edição)

**Interfaces:**
- Consumes: `QuoteLifecycle::temTurma(Quote $locked): bool` e o padrão de lock da Task 1.
- Produces:
  - `QuoteLifecycle::lockToEdit(int $quoteId, QuoteData $data, bool $podeGerirAprovada): Quote`;
  - `UpdateQuoteAction::execute(Quote $quote, QuoteData $data, bool $podeGerirAprovada): Quote`;
  - o controller chama com `$request->user()->can('commercial.quote.approve')`.
- Chave nova `commercial.quote.turma_locks_field` → `'La cotización tiene una turma: solo el valor UF puede cambiar.'`. A chave do erro é o **nome do campo** recusado.

- [ ] **Step 1: Escrever os testes que falham** (no mesmo `QuoteTransitionMatrixTest`)

- `test_superadmin_edita_aprovada_sem_turma_inclusive_curso_e_ela_continua_aprovada`: `PUT` com outro `course_id`, `student_count` 20 e UF novo → 200. No banco: os campos novos, `status` `approved` e `approved_at` igual ao de antes.
- `test_superadmin_edita_aprovada_com_turma_arquivada_inclusive_curso` (Review Focus 4): 200.
- `test_superadmin_muda_so_o_uf_de_aprovada_com_turma` (Review Focus 3): o payload repete `course_id`, `student_count`, `purchase_order` (`null` sobre `null`) e as datas como string `Y-m-d`, iguais ao gravado, e traz `value_uf` novo → 200 com o UF novo.
- `test_superadmin_muda_outro_campo_de_aprovada_com_turma_da_422`: um data provider com `course_id`, `student_count`, `purchase_order` (`'OC-9'` sobre `null`) e `planned_start_date` → 422 com `errors.<campo>`; nada gravado.
- `test_null_sobre_valor_gravado_conta_como_mudanca`: `purchase_order` `'OC-1'` gravado, payload `null` → 422 `errors.purchase_order`.
- `test_admin_editando_aprovada_da_422_status`: admin, com e sem turma → 422 `errors.status`, com a mensagem `approved_cannot_edit`.
- `test_edicao_de_pendente_e_recusada_segue_como_hoje`: a pendente fica `pending`, a recusada vira `pending` (admin).

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=QuoteTransitionMatrixTest`
Expected: FAIL nos casos de edição. Hoje a aprovada sempre dá 422, e a edição força `pending`.

- [ ] **Step 3: Implementar `lockToEdit` e a nova `UpdateQuoteAction`**

Regras do `lockToEdit`, nesta ordem:

1. Recusa a cotação arquivada (`archived`).
2. Se a cotação é `Approved`:
   - sem `$podeGerirAprovada`, recusa com `status`/`approved_cannot_edit`;
   - com turma, compara cada campo do `QuoteData` menos `value_uf` com o gravado, e o primeiro diferente recusa com `turma_locks_field` na chave do campo. Comparação da D2: `Optional` = não mudou; `null` sobre valor = mudou; datas por `toDateString()`; `course_id` e `student_count` como `int`.

A Action, dentro da transação, grava com `WritableAttributes::from([...])` como hoje. O `status` só entra no array quando a origem **não** é `Approved`: reabre a recusada e mantém a pendente. A aprovada fica aprovada, e o `approved_at` não é tocado. Reescreva o docblock da Action (a frase "Cotação aprovada é imutável" deixa de ser verdade).

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='QuoteTransitionMatrixTest|QuoteCrudTest|QuotePutOmissionTest|MensagemComercialLocalizadaTest'`
Expected: PASS. O `QuoteCrudTest::test_update_de_cotacao_aprovada_bloqueado` (admin) continua verde.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Services/QuoteLifecycle.php app/Domains/Commercial/Actions/UpdateQuoteAction.php app/Domains/Commercial/Http/Controllers/QuoteController.php tests/Feature/Comercial/QuoteTransitionMatrixTest.php tests/Feature/Commercial/MensagemComercialLocalizadaTest.php && cd ..
git add backend/app/Domains/Commercial backend/lang backend/tests
git commit -m "fix(50): aprovada editável só pelo superadmin, só UF com turma"
```

---

### Task 3: P-49 — lock do orçamento dos dois lados

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Budget.php` (`lockRow`, `lockForWrite`)
- Modify: `backend/app/Domains/Commercial/Actions/DeleteBudgetAction.php`, `RestoreQuoteAction.php`, `CreateQuoteAction.php`
- Test: `backend/tests/Feature/Comercial/BudgetQuoteLockTest.php` (novo)

**Interfaces:**
- Produces:
  - `Budget::lockRow(int $budgetId): static`, ou seja, `withTrashed()->whereKey()->lockForUpdate()->firstOrFail()`, sem julgar estado;
  - `Budget::lockForWrite(int $budgetId): static`, que trava e lança `ValidationException` `['budget' => __('commercial.quote.budget_archived')]` se o orçamento estiver arquivado. Reusa a mensagem existente; nenhuma chave nova.

  Molde e docblocks: `Client.php:139-166`.

- [ ] **Step 1: Escrever os testes que falham**

- `test_criar_cotacao_em_orcamento_arquivado_depois_do_binding_da_422`: carrega `$budget`, faz `Budget::whereKey()->first()->delete()` e chama `app(CreateQuoteAction::class)->execute($budget, $data)`; espera `ValidationException` com a chave `budget`, e nenhuma cotação criada.
- `test_restaurar_cotacao_sob_orcamento_arquivado_segue_422`: o caminho de hoje pela API (`POST /quotes/{id}/restore`) continua 422 com `errors.quote` = `budget_archived`.
- `test_arquivar_orcamento_com_aprovada_segue_422_e_sem_aprovada_passa`: regra de hoje, agora decidida dentro da transação.
- `test_actions_do_eixo_tomam_o_lock_do_orcamento_dentro_da_transacao`: ratchet de fonte no molde de `ParentLockOnChildWriteTest::test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao` (trait `ScansPhpSource`). Ele afirma três coisas:
  - `CreateQuoteAction` contém `Budget::lockForWrite(`;
  - `DeleteBudgetAction` e `RestoreQuoteAction` contêm `Budget::lockRow(`;
  - as três contêm `DB::transaction`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=BudgetQuoteLockTest`
Expected: FAIL. Criar cotação em orçamento arquivado passa hoje, e o ratchet não acha os locks.

- [ ] **Step 3: Implementar**

**`DeleteBudgetAction`** abre a transação, toma `Budget::lockRow($budget->id)` e trava as cotações do orçamento com `$locked->quotes()->lockForUpdate()->get()` (Review Focus 2). Decide "há aprovada?" sobre elas, recusa com a mensagem de hoje e só então chama `delete()`.

**`RestoreQuoteAction`**:
- troca a leitura `$quote->budget->trashed()` por `$budget = Budget::lockRow($quote->budget_id)`, tomado **antes** de qualquer lock da cotação, e mantém a checagem própria `$budget->trashed()` com a chave `quote`. O contrato `errors.quote` está fixado em `QuoteArchiveEndpointTest.php:138` e não muda;
- reescreve o parágrafo "SEM lock sobre o orçamento" do docblock, que passa a dizer quem trava o quê e citar a D4.

**`CreateQuoteAction`** toma `Budget::lockForWrite($budget->id)` como primeira linha da transação, antes do `max(seq_in_budget)`.

- [ ] **Step 4: Rodar e ver passar, com a vizinhança**

Run: `docker compose exec -T app php artisan test --filter='BudgetQuoteLockTest|BudgetCrudTest|BudgetArchiveCascadeTest|BudgetArchiveEndpointTest|QuoteArchiveEndpointTest|QuoteCrudTest|QuoteApprovalTest'`
Expected: PASS.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Models/Budget.php app/Domains/Commercial/Actions/DeleteBudgetAction.php app/Domains/Commercial/Actions/RestoreQuoteAction.php app/Domains/Commercial/Actions/CreateQuoteAction.php tests/Feature/Comercial/BudgetQuoteLockTest.php && cd ..
git add backend/app/Domains/Commercial backend/tests/Feature/Comercial/BudgetQuoteLockTest.php
git commit -m "fix(50): lock do orçamento nos dois lados do eixo cotação (P-49)"
```

---

### Task 4: Restaurar turma confere a cotação (D10) + docblocks do achado 0.5

**Files:**
- Modify: `backend/app/Domains/Operation/Actions/RestoreTurmaAction.php`
- Modify: `backend/lang/{es_CL,pt_BR,en}/operation.php`
- Modify: `backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php` (docblock, linhas ~15-23)
- Modify: `backend/app/Domains/Operation/Models/Turma.php` (comentário da cascata, linhas ~73-79)
- Test: `backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php`

**Interfaces:**
- Chaves novas em `operation.turma` (es_CL fixado aqui; chave de erro `turma`):
  - `restore_quote_not_approved` → `'La cotización de esta turma no está aprobada: apruébala antes de restaurar la turma.'`
  - `restore_course_changed` → `'El curso de la cotización cambió: esta turma ya no corresponde a ella.'`

- [ ] **Step 1: Escrever os testes que falham** (em `TurmaArchiveEndpointTest`)

- `test_restore_com_cotacao_recusada_da_422_e_a_turma_segue_arquivada`: arquiva a turma (pela API), recusa a cotação (pela API, já liberada pela Task 1 ou por `forceFill` direto se a Task 1 ainda não fechou) e chama `POST /api/turmas/{id}/restore` → 422 com `operation.turma.restore_quote_not_approved`; `assertSoftDeleted`.
- `test_restore_com_curso_trocado_na_cotacao_da_422`: arquiva a turma, troca o `course_id` da cotação por `forceFill()->saveQuietly()` e restaura → 422 com `restore_course_changed`; a turma continua arquivada.
- O `test_restore_devolve_200_e_traz_as_matriculas_de_volta` de hoje continua verde: cotação aprovada e mesmo curso.

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=TurmaArchiveEndpointTest`
Expected: FAIL nos dois casos novos (hoje dá 200).

- [ ] **Step 3: Implementar**

Logo depois de `$cotacao = Quote::lockRow(...)` e da checagem `restore_conflict` existente:
- recusa quando `$cotacao->status !== QuoteStatus::Approved`;
- recusa quando `$cotacao->course_id !== $locked->course_id`.

Um parágrafo novo no docblock diz que este é o terceiro gate (D10 da spec 50) e por que existe.

Nos dois docblocks do achado 0.5, **leia antes quais escritores tomam `lockForWrite`**: `ParentLockOnChildWriteTest::TOMAM_LOCK` é a lista viva. Depois reescreva as frases "ainda não tomam … (pendência P-47)" para dizer que os escritores de filho tomam `Redator::lockForWrite()` / `Turma::lockForWrite()` desde 2026-08-23, e nomeie a guarda `ParentLockOnChildWriteTest`.

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter='TurmaArchiveEndpointTest|ParentLockOnChildWriteTest'`
Expected: PASS.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Actions/RestoreTurmaAction.php app/Domains/Identity/Actions/ArchiveRedatorAction.php app/Domains/Operation/Models/Turma.php tests/Feature/Operation/TurmaArchiveEndpointTest.php && cd ..
git add backend/app/Domains/Operation backend/app/Domains/Identity/Actions/ArchiveRedatorAction.php backend/lang backend/tests/Feature/Operation/TurmaArchiveEndpointTest.php
git commit -m "fix(50): restaurar turma confere a cotação; docblocks do achado 0.5"
```

---

### Task 5: `turma_status` no `QuoteData`

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/QuoteData.php`
- Modify: `backend/app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php` (`LISTING` e a carga de arquivados)
- Modify: `backend/app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php` (`LISTING` e a carga de arquivados)
- Modify: `frontend/src/shared/types/generated.ts` (regenerado, nunca à mão)
- Test: `backend/tests/Feature/Comercial/QuoteTurmaStatusTest.php` (novo)

**Interfaces:**
- Produces:
  - `QuoteData::$turma_status`, declarado `public TurmaStatus|Optional|null $turma_status = new Optional`, preenchido em `fromModel` com `$quote->turma?->status` (`null` sem turma viva);
  - no TS, `turma_status?: TurmaStatus | null` em `QuoteData`.

  As regras de entrada **não** ganham o campo: só saída, como `status`.

- [ ] **Step 1: Escrever os testes que falham**

- `test_get_da_cotacao_traz_turma_status`: um data provider com sem turma → `null`, `em_andamento`, `concluida` e arquivada → `null`, via `GET /api/quotes/{id}` e `assertJsonPath('turma_status', ...)`.
- `test_get_do_orcamento_traz_turma_status_em_cada_cotacao`: `GET /api/budgets/{id}` e `GET /api/budgets` com duas cotações aprovadas, uma com turma e outra sem.
- `test_listagens_de_arquivados_com_turma_nao_estouram_lazy_loading` (Review Focus 5): duas checagens, com uma cotação que tem turma.
  - `GET /api/budgets/archived` responde 200 depois de arquivar o orçamento. A cotação **recusada** com turma arquivada tem de vir antes, porque orçamento com aprovada não arquiva.
  - `GET /api/budgets/{id}/quotes/archived` responde 200 com a cotação pendente arquivada.

  As duas respostas trazem a chave `turma_status`.
- `PUT`/`POST` com `turma_status` no payload não muda nada (campo ignorado na entrada).

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter=QuoteTurmaStatusTest`
Expected: FAIL (`turma_status` ausente).

- [ ] **Step 3: Implementar e regenerar**

Para o `turma_status`:
- acrescente o campo e o `fromModel`;
- ponha `'turma'` em `QuoteQueryBuilder::LISTING` e `'quotes.turma'` em `BudgetQueryBuilder::LISTING`;
- nas cargas de arquivados (`withArchivedListingData`), acrescente `turma` / `quotes.turma` sem o `asOfArchiving`, porque a turma não é filha da cascata da cotação.

Rode `docker compose exec -T app php artisan typescript:transform`. Confira com `git diff frontend/src/shared/types/generated.ts`: só muda o `QuoteData`.

- [ ] **Step 4: Rodar e ver passar, com a suíte do domínio**

Run: `docker compose exec -T app php artisan test --filter='QuoteTurmaStatusTest|Comercial|ArchivedListingTest|SoftDeletedRelationProjectionTest|DtoTest'`
Expected: PASS, sem `LazyLoadingViolationException`.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/QuoteData.php app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php app/Domains/Commercial/QueryBuilders/BudgetQueryBuilder.php tests/Feature/Comercial/QuoteTurmaStatusTest.php && cd ..
git add backend/app/Domains/Commercial backend/tests/Feature/Comercial/QuoteTurmaStatusTest.php frontend/src/shared/types/generated.ts
git commit -m "feat(50): QuoteData expõe turma_status"
```

---

### Task 6: Tag da turma na cotação e na tabela de orçamentos

**Files:**
- Create: `frontend/src/features/commercial/lib/turmaTag.ts` + `turmaTag.test.ts`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx`, `BudgetsTable.tsx`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (bloco `quote`)
- Test: `frontend/src/features/commercial/components/Budget/QuoteRow.test.tsx`, `BudgetsTable.test.tsx`

**Interfaces:**
- Consumes: `QuoteData.turma_status?: TurmaStatus | null` (Task 5).
- Produces: `turmaTag(quote: QuoteData): 'pending' | 'em_andamento' | 'concluida' | null`. Devolve `null` quando `quote.status !== 'approved'`; `'pending'` quando a cotação está aprovada e `turma_status` é `null`/ausente; senão o próprio `turma_status`.
- Chaves `quote.turmaTag.pending`, `quote.turmaTag.em_andamento` e `quote.turmaTag.concluida`. O prefixo "Turma:" vem dentro do texto, nos três idiomas (decisão do João, P-112):
  - es-CL: `"Turma: A configurar"`, `"Turma: En curso"`, `"Turma: Concluida"`;
  - pt-BR: `"Turma: A configurar"`, `"Turma: Em curso"`, `"Turma: Concluída"`;
  - en: `"Turma: To be set up"`, `"Turma: In progress"`, `"Turma: Concluded"`.

- [ ] **Step 1: Escrever os testes que falham**

- `turmaTag.test.ts`: um caso por linha da tabela: pendente → `null`; recusada com `turma_status` qualquer → `null`; aprovada sem `turma_status` → `'pending'`; aprovada `em_andamento` → `'em_andamento'`; aprovada `concluida` → `'concluida'`.
- `QuoteRow.test.tsx`: `it('cotação aprovada mostra a tag da turma ao lado do status')` afirma o texto `quote.turmaTag.em_andamento`. O `it('pendente e recusada não têm tag de turma')` afirma a ausência de qualquer `quote.turmaTag.*`.
- `BudgetsTable.test.tsx`: `it('abaixo do status aprovado, uma tag por cotação aprovada com o código dela')`. O orçamento tem `status: 'approved'` e duas cotações aprovadas (`code` `'Scap 1 - Cot 1'` com `turma_status: 'em_andamento'` e `'Scap 1 - Cot 2'` sem turma), além de uma pendente. A célula de status mostra duas tags extras, cada uma contendo o `code` da cotação e o texto da tag; a pendente não gera tag.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/features/commercial/lib/turmaTag.test.ts src/features/commercial/components/Budget/QuoteRow.test.tsx src/features/commercial/components/Budget/BudgetsTable.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`QuoteRow` pinta um `AppTag` com `t(\`quote.turmaTag.${tag}\`)` ao lado da tag de status quando `turmaTag(quote)` não é `null`. A severidade é escolha do builder: neutra para `pending`, alinhada ao `operation.status` para as outras. A célula de status da `BudgetsTable` empilha, abaixo da tag de status, uma tag por cotação de `b.quotes` com `turmaTag` não nula, no texto `` `${code} · ${t(...)}` `` (o `code` vem do `QuoteData`). A pilha não estoura `largura.status` a 1024 px: o builder pode quebrar linha, ou ajustar a fatia em `budgetColumns.ts` se precisar (então o arquivo entra no commit).

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test src/features/commercial && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial frontend/src/shared/config/locales
git commit -m "feat(50): tag da turma na cotação aprovada e na tabela de orçamentos"
```

---

### Task 7: Ações da cotação seguem a matriz no front

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx`, `QuotesList.tsx`, `BudgetQuotesCard.tsx`, `BudgetOverlays.tsx` (se for ele que monta o wizard), `QuoteWizard.tsx`, `DataStep.tsx`, `CourseStep.tsx`
- Modify: `frontend/src/features/commercial/hooks/useBudgetDetail.ts`
- Test: `QuoteRow.test.tsx`, `QuotesList.test.tsx`, um teste novo `QuoteWizard.onlyUf.test.tsx`

**Interfaces:**
- Consumes: `turma_status` (Task 5); `canApprove` de `useBudgetDetail.ts:28`; a regra de backend das Tasks 1 e 2.
- Produces:
  - prop nova `canManageApproved: boolean` em `QuoteRow`, que passa por `QuotesList` e `BudgetQuotesCard`;
  - prop nova `onlyUf: boolean` em `QuoteWizard`, verdadeira quando a cotação editada está `approved` e tem `turma_status` não nulo;
  - prop `onlyUf?: boolean` em `DataStep` e `disabled?: boolean` (ou equivalente) em `CourseStep`.

- [ ] **Step 1: Escrever os testes que falham**

- `QuoteRow.test.tsx`:
  - `it('Recusar some quando a cotação tem turma')`: aprovada com `turma_status: 'em_andamento'` e com `onReject` → não há botão `quote.reject`. Aprovada sem turma → o botão existe;
  - `it('Editar aparece na aprovada só com canManageApproved')`: `true` → existe botão `common.edit`; `false` → não existe;
  - `it('a lixeira continua escondida na aprovada')`.
- `QuoteWizard.onlyUf.test.tsx`: com `onlyUf`, os campos `student_count`, `purchase_order`, `planned_start_date` e `planned_end_date` estão `disabled`, o curso não é selecionável e o `value_uf` está habilitado. Sem `onlyUf`, nada fica desabilitado.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test src/features/commercial/components/Budget`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**

Na `QuoteRow`:
- "Recusar" exige `quote.status !== 'rejected' && !quote.turma_status`;
- "Editar" aparece quando `quote.status !== 'approved' || canManageApproved`;
- a lixeira fica como está.

O `useBudgetDetail` expõe `canApprove` até a `QuoteRow`. O wizard, ao editar uma aprovada com turma, recebe `onlyUf`. O jeito de travar o passo do curso (abrir direto no passo 2 com o curso só leitura, ou o `CourseStep` desabilitado) é escolha do builder, desde que o teste prove que o curso não muda.

- [ ] **Step 4: Rodar e ver passar, e o gate do front**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial
git commit -m "feat(50): ações e edição da cotação seguem a matriz da turma"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 3, 4, 5 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma. A Task 2 vem depois da 1, porque consome `QuoteLifecycle` e toca os mesmos arquivos de lang e de teste. A 6 vem depois da 5, porque consome `turma_status`, e a 7 vem depois da 6, porque as duas tocam `QuoteRow.tsx` e a 7 consome a regra das Tasks 1 e 2.

Conferência por par do G1:
- **Task 1:** `Commercial/Services/QuoteLifecycle.php`, `Approve/Reject/DeleteQuoteAction.php`, `lang/*/commercial.php`, `MensagemComercialLocalizadaTest.php`, `QuoteTransitionMatrixTest.php`.
- **Task 3:** `Budget.php`, `DeleteBudgetAction.php`, `RestoreQuoteAction.php`, `CreateQuoteAction.php`, `BudgetQuoteLockTest.php`.
- **Task 4:** `RestoreTurmaAction.php`, `lang/*/operation.php`, `ArchiveRedatorAction.php`, `Turma.php`, `TurmaArchiveEndpointTest.php`.
- **Task 5:** `QuoteData.php`, `QuoteQueryBuilder.php`, `BudgetQueryBuilder.php`, `generated.ts`, `QuoteTurmaStatusTest.php`.

Nenhuma interseção, e nenhuma consome o que outra produz. A Task 3 reusa a chave existente `commercial.quote.budget_archived` justamente para não tocar `lang/*/commercial.php`. Um ponto para a Task 4: se a 1 ainda não fechou, o teste dela recusa a cotação por `forceFill` e não pela API, para não criar aresta.

## Handoff de execução

- **executor:** `claude`. O bloco toca RBAC (o "só superadmin" pela `commercial.quote.approve`), lock de concorrência e dado com peso legal (turma concluída com certificado), e a Task 7 pede julgamento de UI.
- **Sessão:** `opus`, esforço `high`.
- **Papéis (`.claude/papeis.md`):**
  - `implementador-integracao`: Tasks 1, 2, 3, 5 e 7;
  - `implementador-mecanico`: Tasks 4 e 6;
  - `revisor-task`: toda task;
  - `re-revisor`: rodadas de correção;
  - `corretor-tardio`: rodadas 4–5, se houver;
  - `revisor-branch`: fim da SDD.
- **Stack:** todas as tasks de backend rodam na suíte sqlite do container (`docker compose up -d` na lane, offset +1). A prova no navegador do DoD 4 usa o stack da lane (Vite 5174, API 8081).
