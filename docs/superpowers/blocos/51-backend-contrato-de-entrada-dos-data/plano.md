# Bloco 51 — contrato de entrada dos Data — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar a P-51 (omissão preserva `type` e `payment_terms`; defaults mortos saem), tirar a escrita de orçamento do controller, marcar as saídas sem marca, renomear os Data de query string para `*QueryData` e criar a catraca de default literal.

**Architecture:** mudanças de DTO (laravel-data) e uma Action nova no padrão DDD-lite; o renome é mecânico mas move o `generated.ts`; a catraca é um teste de reflexão ao lado das leis do `PersistenceLawsTest`, com alcance = Data que recebem request.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit (sqlite `:memory:`), React 19 + TS (Vite, vitest).

**Spec:** `docs/superpowers/blocos/51-backend-contrato-de-entrada-dos-data/spec.md` — a §2.1 é o gabarito da classificação; leia-a antes da Task 5.

## Global Constraints

- `generated.ts` só por `docker compose exec -T app php artisan typescript:transform`; nunca à mão (lei §5.3). Task que regenera ajusta os consumidores no mesmo commit.
- Backend no container da lane (`docker compose up -d` na raiz da lane, offset +1). Pint no host, de `backend/`, **sempre com arquivos explícitos**.
- Regressão vista vermelha contra o código antigo — **sem `git stash`** (pilha compartilhada entre lanes): o vermelho vem do teste escrito antes do conserto; sonda de catraca se faz editando e revertendo o arquivo, com cópia em scratchpad.
- Erro sobe ao handler RFC 7807; nenhum `abort(422)`.
- Nomes: `PageQueryData`, `TurmaPageQueryData`, `CertificatePageQueryData`, `EmissionPanelQueryData` (spec D6). Parâmetro: `$query`.
- `CreateClientAction` grava `'client'` quando `type` chega `Optional` (spec D1).
- Defeito real novo fora da §2.1 da spec → **PARE e consulte o João** (spec D5).

## Review Focus

1. `PUT /api/clients/{id}` com `type: null` explícito — `type` não é anulável: 422, não grava `null` (Task 2).
2. `PUT /api/courses/{id}` com `redator_ids` no corpo — vira 422 pelo `ComputedFields::rejected`; o SPA não manda, mas teste ou chamador que mande quebra (Task 4).
3. `GET` de turma continua devolvendo `redatores` preenchido depois das marcas — marca de saída não pode esvaziar a saída (Task 4).
4. Query string de lista paginada depois do renome: `per_page` acima de 100 segue 422 e `sort` fora da allowlist segue 422 (Task 1, via `PageQueryDataTest` e `ListQueryBudgetTest`).
5. Entrada da `ISENTAS` que a catraca não alcança (classe renomeada ou removida) reprova como isenção vencida — sem isso a lista apodrece (Task 5).

---

### Task 1: Renome dos Data de query string e `PageQueryData` tipado

**Files:**
- Move: `backend/app/Shared/Pagination/PageRequest.php` → `PageQueryData.php`; `backend/app/Domains/Operation/Data/TurmaPageRequest.php` → `TurmaPageQueryData.php`; `backend/app/Domains/Certification/Data/CertificatePageRequest.php` → `CertificatePageQueryData.php`; `backend/app/Domains/Certification/Data/EmissionPanelRequest.php` → `EmissionPanelQueryData.php`
- Modify: `backend/app/Shared/Pagination/Paginates.php:47,66`; `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:18,59,109`; `backend/app/Domains/Identity/Http/Controllers/StudentController.php:15,40,45`; `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:12-13,57,90`; `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php:34` (docblock)
- Move test: `backend/tests/Unit/Shared/PageRequestTest.php` → `PageQueryDataTest.php`
- Regenerate: `frontend/src/shared/types/generated.ts`, `frontend/src/shared/types/typescript-transformer-manifest.json`
- Modify front: `frontend/src/shared/api/page.ts:17-24`, `frontend/src/shared/hooks/useServerTable.ts`, `frontend/src/features/operation/hooks/useTurmasPage.ts`
- Docs: `.claude/rules/backend-ddd.md:158-159`, `docs/estrutura-monolito.md:75`, `docs/adrs.md` (ADR-22: uma linha de emenda datada 2026-11-03 com o renome; corpo intacto)

**Interfaces:**
- Produces: `App\Shared\Pagination\PageQueryData` (`#[TypeScript]`, mesmas constantes `PER_PAGE_DEFAULT`, `PER_PAGE_MAX`, `Q_MAX`); `Paginates::page(PageQueryData $query, Closure $present, ?Closure $filter = null, ?Closure $meta = null): PageData` e `slice(PageQueryData $query, …)`; TS `PageQueryData` em `generated.ts`; `PageQuery` em `page.ts` derivado de `PageQueryData`.

- [ ] **Step 1:** `git mv` dos quatro Data e do teste; renomeie classe, `use` e parâmetros (`$request` → `$query` onde o tipo é um destes). Adicione `#[TypeScript]` só ao `PageQueryData`.
- [ ] **Step 2:** `grep -rn 'PageRequest\|EmissionPanelRequest' backend/app backend/tests frontend/src .claude/rules docs/estrutura-monolito.md` — esperado: vazio.
- [ ] **Step 3:** `docker compose exec -T app php artisan test --filter='PageQueryDataTest|ListQueryBudgetTest|Turma|Certificate|Student'` — esperado: PASS (inclui `per_page` > 100 e `sort` fora da allowlist → 422).
- [ ] **Step 4:** regenere; `generated.ts` ganha `PageQueryData` (com `q: string | null`, `sort: string | null`). Em `page.ts`, `PageQuery` passa a ser derivado do gerado — ex.: `Pick<PageQueryData, 'page' | 'per_page'> & Partial<Pick<PageQueryData, 'q' | 'sort'>>` com os filtros por `Record` como hoje; a forma exata é do builder, desde que não sobre campo de paginação escrito à mão.
- [ ] **Step 5:** de `frontend/`: `pnpm build && pnpm lint && pnpm test` — esperado: verde.
- [ ] **Step 6:** Pint nos PHP tocados; commit `refactor(51): Data de query string viram *QueryData`.

### Task 2: `ClientData::$type` sem default — omissão preserva

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php:47-48`, `backend/app/Domains/Commercial/Actions/CreateClientAction.php:58`
- Regenerate: `generated.ts` (+ manifest)
- Modify front: consumidores que o `pnpm build` acusar (provável `frontend/src/features/commercial/hooks/useClientForm.ts`, `components/Client/*`)
- Test: `backend/tests/Feature/Cadastros/ClientAndCoursePutOmissionTest.php`, `backend/tests/Feature/Cadastros/ClientCrudTest.php`

**Interfaces:**
- Consumes: nada das outras tasks (só o `generated.ts` já regenerado pela Task 1).
- Produces: `public string|Optional $type` (com `#[In('client','provider','other')]`); TS `type` com `undefined`.

- [ ] **Step 1: testes que falham.** Em `ClientAndCoursePutOmissionTest`:
  - `test_put_de_cliente_sem_type_preserva_o_tipo`: cliente com `type => 'provider'`; `PUT /api/clients/{id}` com `name, rut, email, legal_name` e **sem** `type` → `assertOk()`; `refresh()`; `assertSame('provider', $client->type)`.
  - `test_put_de_cliente_com_type_null_e_422`: mesmo payload com `'type' => null` → `assertStatus(422)->assertJsonValidationErrors('type')`; `type` no banco segue `provider`.
  Em `ClientCrudTest`: `test_post_de_cliente_sem_type_cria_client` → `assertCreated()` e `type === 'client'` no banco (use o payload mínimo válido que o arquivo já usa).
- [ ] **Step 2:** rode os três — esperado: o primeiro FAIL (`'client'` ≠ `'provider'`); os outros dois podem passar já (caracterização; anote no commit).
- [ ] **Step 3:** `ClientData::$type` → `string|Optional` sem default; `CreateClientAction` grava `$data->type instanceof Optional ? 'client' : $data->type`. `UpdateClientAction:48` já passa por `WritableAttributes::from()` — não mexa.
- [ ] **Step 4:** rode `--filter='Client'` — esperado: PASS.
- [ ] **Step 5:** regenere; ajuste os consumidores TS até `pnpm build && pnpm lint && pnpm test` ficarem verdes (o form sempre manda `type`; estreite com `?? 'client'` onde o tipo vier `undefined`).
- [ ] **Step 6:** Pint; commit `fix(51): PUT de cliente sem type preserva o tipo`.

### Task 3: `payment_terms` sem default e `UpdateBudgetAction`

**Files:**
- Create: `backend/app/Domains/Commercial/Actions/UpdateBudgetAction.php`
- Modify: `backend/app/Domains/Commercial/Data/BudgetData.php:44`, `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php:5-8,74-82`
- Test: `backend/tests/Feature/Comercial/BudgetCrudTest.php`

**Interfaces:**
- Produces: `UpdateBudgetAction::execute(Budget $budget, BudgetData $data): Budget` — `DB::transaction`; grava `payment_terms` por `WritableAttributes::from([...])` (pula `Optional`; `null` explícito apaga); `code`/`client_id` imutáveis. `BudgetController::update(BudgetData $data, Budget $budget, UpdateBudgetAction $action, BudgetSummaryService $summary): BudgetData`.

- [ ] **Step 1: testes que falham** em `BudgetCrudTest`:
  - `test_put_de_orcamento_sem_payment_terms_preserva`: orçamento com `payment_terms => '30 días'`; `PUT /api/budgets/{id}` com `client_id` e sem `payment_terms` → `assertOk()`; banco segue `'30 días'`.
  - `test_put_de_orcamento_com_payment_terms_null_apaga`: `'payment_terms' => null` → `assertOk()`; banco `null`.
- [ ] **Step 2:** rode — esperado: o primeiro FAIL (banco `null`).
- [ ] **Step 3:** `BudgetData::$payment_terms` sem default; crie a Action; controller injeta e devolve `BudgetData::fromModel(...)` como hoje (mesmo `$summary`). `CreateBudgetAction:21` **fica** como está (spec D1). Remova o `use Optional` do controller se ficar órfão.
- [ ] **Step 4:** `--filter='Budget'` — esperado: PASS; `grep -n 'update(\[' backend/app/Domains/Commercial/Http/Controllers/BudgetController.php` vazio.
- [ ] **Step 5:** Pint; commit `fix(51): escrita de orçamento sai do controller e preserva payment_terms`.

### Task 4: Defaults mortos e saídas sem marca

**Files:**
- Modify: `backend/app/Domains/Catalog/Data/CourseData.php:38-44` (+ `rules()`), `backend/app/Domains/Identity/Data/RoleData.php:34`, `backend/app/Domains/Operation/Data/TurmaData.php:45-46`
- Test: `backend/tests/Feature/Cadastros/ClientAndCoursePutOmissionTest.php` (seção de curso), `backend/tests/Feature/Identity/RolePermissionCrudTest.php`, `backend/tests/Feature/Operation/` (o teste de leitura de turma que já asserta `redatores`; se nenhum, adicione um ao `TurmaCrudTest` ou equivalente)

**Interfaces:**
- Produces: `CourseData::$workload_hours` sem default (segue `#[Required]`); `CourseData::$redator_ids` com `#[Computed]` e `...ComputedFields::rejected('redator_ids')` no `rules()`; `RoleData::$permissions` sem default (segue `present`); `TurmaData::$redatores` com `#[DataCollectionOf(TurmaRedatorData::class)]` + `#[ReadOnlyCollection]`.

- [ ] **Step 1: testes.**
  - `test_put_de_curso_sem_workload_hours_e_422_e_preserva`: curso com `workload_hours => 40`; PUT sem a chave → 422 com erro em `workload_hours`; banco 40. *(Caracterização: passa antes — anote.)*
  - `test_put_de_curso_com_redator_ids_e_422`: PUT com payload válido + `'redator_ids' => [1]` → 422 em `redator_ids`. **Este é o vermelho da task** (hoje 200).
  - `test_put_de_curso_com_payload_do_spa_segue_ok`: as chaves que o `useCourseForm` manda (`name, technical_name, description, workload_hours, modules`) → `assertOk()`.
  - Em `RolePermissionCrudTest`: `PUT /api/roles/{id}` sem `permissions` → 422 (caracterização); com `'permissions' => []` → 200 e role sem permissões.
  - Turma: `GET` de uma turma com redator designado → `assertJsonPath('redatores.0.id', …)`.
- [ ] **Step 2:** rode — esperado: só `..._com_redator_ids_e_422` FAIL.
- [ ] **Step 3:** aplique as quatro mudanças de **Produces**.
- [ ] **Step 4:** `--filter='Course|Role|Turma|Habilitacao|PersistenceLaws'` — esperado: PASS. Se algum teste existente mandava `redator_ids` no PUT de curso, ele estava errado pelo contrato (docblock do `CourseData`): ajuste o payload e anote.
- [ ] **Step 5: sonda da D4.** Tire o `#[ReadOnlyCollection]` de `TurmaData::$redatores` (cópia do arquivo no scratchpad antes), rode `--filter=test_colecao_nested_read_write_nasce_optional` — esperado: FAIL citando `TurmaData::$redatores`; restaure e confirme PASS. Registre a saída na mensagem do commit.
- [ ] **Step 6:** Pint; commit `fix(51): defaults mortos saem e saídas ganham marca`. **Não** regenere aqui (o default não entra no tipo; a Task 5 confirma).

### Task 5: Catraca de default literal

**Files:**
- Create: `backend/tests/Feature/Shared/InputDataDefaultsTest.php`
- Modify: `.claude/rules/backend-ddd.md` (§ coleção nested: um parágrafo citando a catraca nova), `.claude/rules/generated-types.md` (troca a linha vencida do `ClientContactData.is_primary` pela regra + guarda nova)

**Interfaces:**
- Consumes: os nomes da Task 1 (`*QueryData`), o estado final de `ClientData`/`BudgetData` (Tasks 2–3) e de `CourseData`/`RoleData`/`TurmaData` (Task 4).
- Produces: `InputDataDefaultsTest::test_data_de_entrada_nao_tem_default_literal()` e `test_isentas_sao_alcancadas()`; constante `private const ISENTAS = [Classe::class => 'motivo', …]`.

- [ ] **Step 1: alcance.** Conjunto de entrada = (a) tipos `Spatie\LaravelData\Data` dos parâmetros dos métodos públicos de toda classe em `app/Domains/*/Http/Controllers/` (por `ReflectionMethod`, não regex — `DashboardController` quebra a assinatura em linhas); (b) classes citadas como `X::validateAndCreate(` ou `X::from($request…` em `app/`; (c) fecho transitivo: propriedade tipada como Data ou com `#[DataCollectionOf]`, **exceto** as com `#[ReadOnlyCollection]` ou `#[Computed]`. O conjunto tem de conter, no mínimo, toda classe da §2.1 da spec que não seja "fora do alcance" — afirme isso no teste com a lista da §2.1.
- [ ] **Step 2: regra.** Para cada classe do conjunto fora da `ISENTAS`, todo parâmetro promovido com default reprova, salvo default `new Optional` ou atributo `#[Computed]`/`#[ReadOnlyCollection]`. Mensagem: `"{$classe}::\${$nome} tem default literal — use X|Optional sem default (ausente nao e o default), marque #[Computed]/#[ReadOnlyCollection] se e saida, ou isente a classe com motivo"`.
- [ ] **Step 3: `ISENTAS`** = exatamente a linha "ISENTAS com motivo" da §2.1 da spec, um motivo verdadeiro por classe (query string; upload que só cria/substitui; item de coleção recriada; linha de importação, revisitada pelo item 53). `test_isentas_sao_alcancadas`: toda chave da `ISENTAS` pertence ao conjunto de entrada — senão reprova como isenção vencida.
- [ ] **Step 4:** rode `--filter=InputDataDefaultsTest` — esperado: PASS. Qualquer reprovação fora da §2.1 é o "defeito real novo": **pare e consulte o João**, não isente.
- [ ] **Step 5: sonda.** Com cópia no scratchpad, restaure `= 'client'` em `ClientData::$type` → FAIL nomeando `ClientData::$type`; restaure o arquivo → PASS. Repita tirando `DashboardFilterData` do alcance (renomeie a chave da `ISENTAS` para uma classe inexistente) → `test_isentas_sao_alcancadas` FAIL. Registre as duas saídas no commit.
- [ ] **Step 6:** regenere o `generated.ts` — esperado: **sem diff** além do que as Tasks 1–2 já commitaram (prova que a Task 4 não moveu tipo). Se houver diff, pare: alguma marca mudou a saída TS.
- [ ] **Step 7:** suíte inteira `docker compose exec -T app php artisan test` e, de `frontend/`, `pnpm build && pnpm lint && pnpm test` — esperado: verde.
- [ ] **Step 8:** Pint; commit `test(51): catraca de default literal em Data de entrada`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4 | sim (Budget\* + `BudgetCrudTest` × Course/Role/Turma Data + `ClientAndCoursePutOmissionTest` + `RolePermissionCrudTest` + teste de turma) | nenhuma entre elas; nenhuma das duas regenera o `generated.ts` |

Task fora de grupo executa e revisa uma a uma. Ordem: 1 → 2 → G1 {3, 4} → 5. As Tasks 1 e 2 regeneram o `generated.ts` e por isso são seriais; a 5 consome todas.

## Handoff de execução

- **executor:** `claude`. O bloco toca a lei §5.3 (`generated.ts` regenerado duas vezes, consumidores no mesmo commit) e a Task 5 é desenho de catraca com julgamento de alcance e de motivo de isenção — fora de "mecânico com paths fechados".
- **Sessão:** `opus`, esforço `xhigh`.
- **Papéis (`.claude/papeis.md`):**
  - `implementador-integracao`: todas (1–5) — nenhuma tem código pronto em 1–2 arquivos; a 4 toca três Data e três testes;
  - `revisor-task`: toda task;
  - `re-revisor`: rodadas de correção;
  - `corretor-tardio`: rodadas 4–5, se houver;
  - `revisor-branch`: fim da SDD.
- **Stack:** suíte sqlite no container da lane (`docker compose up -d`, offset +1: API 8081, Vite 5174). Os DoD 1–4 são provados pelos testes de feature contra a API; nenhum passo exige navegador.
