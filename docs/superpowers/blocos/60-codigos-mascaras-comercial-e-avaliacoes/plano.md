# Bloco 60 — Códigos, máscaras, Comercial e evaluaciones: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar os sete ajustes da Lotus de 2026-11-21: código `C-<n>` e SENCE no curso,
`Scap x - R y`, Presupuestos como primeira aba, orçamentos no diálogo do cliente, quadro de
evaluaciones (só Manual e Instructor bloqueiam) e máscaras de RUT, telefone e e-mail.

**Architecture:** são três frentes que se tocam pouco.
- **Catálogo e Comercial:** colunas novas em `courses`, uma troca de formato calculado
  (`Quote::code()`) e telas.
- **Evaluaciones:** muda a pergunta "o que bloqueia a conclusão" num dono só, o
  `TurmaDocumentType`, e propaga a resposta para a habilitação (PHP e SQL), a conclusão, o upload
  por tipo e os dashboards.
- **Máscaras:** componentes em `shared/ui`, com o backend como única autoridade de validação. O
  telefone é normalizado para E.164 num ponto por tabela.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data, spatie/laravel-permission,
owen-it/laravel-auditing, `giggsey/libphonenumber-for-php` (nova), React 19 + TS, PrimeReact via
`shared/ui`, `libphonenumber-js` (nova), `flag-icons` (já instalada), Vitest, PHPUnit (sqlite
`:memory:`).

**Spec:** `docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/spec.md`

## Global Constraints

Valem para toda task, mesmo quando a task não repete.

**Formatos e textos fixados pela spec**
- Código do curso: `C-{id}`. Na tela, `C-12 · Nome`.
- Código SENCE: só dígitos, até 20, opcional, único quando preenchido. Não vai para o certificado.
- Código da cotação: `Scap {budget_id} - R{seq_in_budget}`, sem espaço entre `R` e o número.
  Forma curta: `R{N}`.
- RUT: gravado como `Rut::parse()->format()`, ou seja `12.345.678-5`. Nada muda na escrita.
- Telefone: gravado em E.164 (`+56912345678`), região padrão `CL`. Na tela, formato internacional
  (`+56 9 1234 5678`).
- E-mail: `trim` e minúsculas só em escrita nova. Nenhum e-mail gravado é reescrito.
- Rótulos dos tipos de evaluación (es-CL): **Instructor**, **Cliente**, **Alumnos**. No código vale
  o nome do domínio: `EVALUACION_REDATOR`, `EVALUACION_CLIENTE`, `EVALUACION_ALUNO`.

**Leis do projeto**
- `generated.ts` nunca se edita à mão. Rode
  `docker compose exec -T app php artisan typescript:transform` depois de mudar um DTO `#[TypeScript]`.
- Dado de produção muda só por model Eloquent, instância a instância, para ser auditado
  (`config/audit.php` tem `'console' => true`). Nada de `UPDATE` pelo query builder em dado com
  peso legal.
- Feature não importa PrimeReact, `app/` nem outra feature. Tudo passa pelo barrel
  `@shared/ui`/`@shared/lib`.
- Componente em `features/*/components/**` com até 150 linhas (`max-lines`). Query e derivação
  moram em hook de `features/<x>/hooks/`.
- Mensagem que chega a resposta HTTP sai de `backend/lang/<locale>/*.php`, com paridade em `en`,
  `es_CL` e `pt_BR`. O front tem paridade em `es-CL`, `pt-BR` e `en` (`locales/parity.test.ts`).

**Migrations e comandos**
- Migration nova usa o prefixo `2026_11_22_0000NN_`, na ordem das tasks.
- Backend roda no container, a partir da raiz da worktree:
  - testes: `docker compose exec -T app php artisan test --filter=<Teste>`;
  - Pint, no host e de dentro de `backend/`: `./vendor/bin/pint <arquivos>`.
- Gate do front, a partir de `frontend/`: `pnpm build && pnpm lint && pnpm test`.

## Decisões do planejamento

Estas decisões não estão na spec. A spec deixou ao executor os nomes e a forma de rodar a
conversão, e o plano as fixa porque várias tasks dependem delas.

- **D-P1. A relação `Turma::documentacaoObrigatoria()` vira `Turma::documentos()`** e cobre os
  quatro tipos. A listagem carrega uma relação só, e a habilitação separa o que bloqueia do que só
  avisa. Com os tipos opcionais dentro, o nome antigo mentiria.
- **D-P2. Telefone e e-mail se normalizam por mutator Eloquent (`Attribute`) em `User` e
  `ClientContact`.** É o único ponto por tabela de verdade: cinco Actions gravam `phone` sem
  passar pelo `UserProvisioner`:
  - `UpdateClientAction.php:41`
  - `UpdateStaffUserAction.php:56`
  - `UpdateRedatorAction.php:57`
  - `UpdateStudentAction.php:28`
  - `UpdateProfileAction.php:24`

  É o primeiro mutator do repositório, e o docblock dele diz por quê. O mutator nunca lança: quem
  recusa é a regra `ValidPhone` no DTO.
- **D-P3. A conversão dos telefones é uma migration de dados.** O deploy roda
  `php artisan migrate --force` (`deploy/bin/deploy.sh:195`) antes de o código novo servir, o que
  cumpre o "antes de o `ValidPhone` entrar, no mesmo deploy". O relatório vai para
  `Log::info('telefones.e164', …)`.
- **D-P4. A conversão `PRUEBAS` → `EVALUACION_ALUNO`** é uma migration que passa pelo model `File`
  e é idempotente. Ela roda sempre: com zero arquivos `PRUEBAS`, não faz nada. A medição da Task 1
  só interrompe o bloco se aparecer um `type` desconhecido.
- **D-P5. A permissão nova se chama `operation.turma.submit_client_evaluation`.** Entra no
  catálogo e numa migration que a entrega a `admin` e `superadmin`, porque o seeder não roda em
  produção (molde: `2026_11_02_000001_add_turma_concluded_docs_permission.php`). O seeder a deriva
  sozinho: o admin recebe tudo fora da lista de exclusão.
- **D-P6. A data de corte dos dashboards** é `App\Domains\Dashboard\Support\CorteDeEvaluaciones::DESDE`,
  uma string `Y-m-d` comparada com `concluded_at` por `FusoDoNegocio::inicioDoDia()`. A Task 17 a
  fixa na data do merge.
- **D-P7. A matriz de quem anexa e quem remove** mora num serviço só, o
  `App\Domains\Operation\Services\TurmaDocumentGate`. O tipo que o papel não pode anexar recebe
  403 por uma exceção de domínio com `TipoDeRecusa::AcaoProibida`, no molde de
  `RedatorOnlyActionException`.

## Review Focus

Cinco casos que nenhum teste das tasks exercita sem ser pedido, do mais provável ao menos provável.
Cada linha tem o teste dela na task dona.

1. **RUT colado com espaço, ponto a mais ou `k` minúsculo, e RUT de 7 dígitos**
   (`1.234.567-8`). Tem de formatar sem duplicar ponto. Teste na Task 14.
2. **Telefone colado já com `+56` e Chile selecionado** não pode virar `+5656…`, e trocar o país
   depois de digitar reformata o número. Teste na Task 16.
3. **Turma concluída.** O redator anexa Alumnos, mas o Manual dele é recusado com a mensagem de
   sempre (`concluded_locked`). Na turma em andamento, o admin tentando o Manual recebe 403. Teste
   na Task 10.
4. **Telefone legado.** Dois números no campo, fixo de Santiago antigo com 7 dígitos, valor já
   E.164 (idempotência) e número estrangeiro já com `+`. Teste na Task 15.
5. **Período "Semana" num domingo e numa segunda-feira**, e orçamento criado às 23h de Santiago,
   que já é o dia seguinte em UTC. Teste na Task 7.

---

### Task 1: Medição de formatos em produção (gate)

O João roda, e o agente confere a saída. Nenhuma linha de código.

**Files:**
- Create: `docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/medicao-producao.md`

**Interfaces:**
- Produces: as contagens de telefone por padrão (alimentam os casos da Task 15) e a contagem de
  `files` de turma por `type` (decide se a Task 9 segue).

- [ ] **Step 1: Pedir ao João que rode o comando do cabeçalho de
  `scripts/medir-formatos-producao.php`** e cole a saída. O auto mode recusa SSH em produção (ver a
  memória `escrita-remota-prod-bloqueada-auto-mode`), então não tente rodar você mesmo.
- [ ] **Step 2: Conferir a saída contra estas regras:**
  - RUT fora de `formatado` em qualquer tipo de usuário é um achado. Registre e siga: há um
    caminho de escrita que escapa do provisioner.
  - `FILES_TURMA` com `type` fora de `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR` → **pare o bloco e
    volte ao João**.
  - `EMAIL.grupos_duplicados_normalizado` diferente de 0 → registre como achado. A Task 15 não
    muda por causa disso.
- [ ] **Step 3: Gravar a saída em `medicao-producao.md`**, com data e só as contagens (o script não
  imprime valor nenhum). Liste quais padrões de telefone apareceram: só dígitos, com `+`, com
  separador e vazio.
- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/medicao-producao.md
git commit -m "docs(60): medição de formatos em produção"
```

### Task 2: Curso — `code` e `sence_code` no backend

**Files:**
- Create: `backend/database/migrations/2026_11_22_000001_add_code_and_sence_code_to_courses.php`
- Modify: `backend/app/Domains/Catalog/Models/Course.php`
- Modify: `backend/app/Domains/Catalog/Actions/CreateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php`
- Modify: `backend/app/Domains/Catalog/Data/CourseData.php`
- Modify: `backend/lang/en/validation.php`
- Modify: `backend/lang/es_CL/validation.php`
- Modify: `backend/lang/pt_BR/validation.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Cadastros/CourseCodeTest.php`

**Interfaces:**
- Produces:
  - `CourseData::$code: string|Optional`, só de saída (`#[Computed]` mais
    `ComputedFields::rejected('code')`);
  - `CourseData::$sence_code: string|Optional|null`, de entrada e de saída;
  - os mesmos dois campos em `CourseData`, no `generated.ts`.

- [ ] **Step 1: Escrever os testes que falham em `CourseCodeTest`:**

```php
public function test_curso_criado_recebe_code_C_id(): void
{
    $id = $this->postJson('/api/courses', $this->payload())->assertCreated()->json('id');
    $this->assertSame("C-{$id}", Course::find($id)->code);
}
public function test_code_no_corpo_de_escrita_e_422(): void
{ $this->postJson('/api/courses', [...$this->payload(), 'code' => 'C-999'])->assertUnprocessable()->assertJsonValidationErrors('code'); }
public function test_sence_code_aceita_so_digitos(): void
{ $this->postJson('/api/courses', [...$this->payload(), 'sence_code' => '12-AB'])->assertJsonValidationErrors('sence_code'); }
public function test_sence_code_unico_inclusive_contra_arquivado(): void
{ /* curso A com '1234567890', arquivado; criar B com o mesmo → 422 em sence_code */ }
public function test_update_mantem_o_proprio_sence_code(): void
{ /* PUT no curso A com o mesmo sence_code → 200 */ }
public function test_backfill_da_migration_preenche_code_dos_existentes(): void
{ /* insere curso sem code, roda a migration (down + up), assertSame("C-{$id}", …) */ }
public function test_code_e_imutavel_no_update(): void
{ /* PUT não muda code */ }
```

- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter=CourseCodeTest`
  Expected: FAIL (coluna `code` inexistente).
- [ ] **Step 3: Migration.**
  - `code`: `string(20)`, `nullable`, `unique`.
  - `sence_code`: `string(20)`, `nullable`, `unique`, sem `deleted_at` no índice (spec §4.2).
  - Backfill no `up()`: o query builder grava `'C-'.id` onde `code` é nulo. É derivado do `id`, não
    dado digitado (spec §4.1).
  - O `down()` derruba as duas colunas.
- [ ] **Step 4: Implementar.**
  - `Course`: `sence_code` em `$fillable` e `$auditInclude`. `code` só em `$auditInclude`, porque
    nenhum DTO o grava.
  - `CreateCourseAction`: depois do `create`, `$course->update(['code' => 'C-'.$course->id])` na
    mesma transação, no molde de `CreateBudgetAction:24`. Para isso, `code` entra no `$fillable`.
  - `UpdateCourseAction` grava `sence_code` quando não for `Optional`.
  - `CourseData`:
    - `sence_code` leva `#[Nullable, Regex('/^\d{1,20}$/')]`, mais `unique` em `courses` que
      enxerga arquivados e ignora o próprio curso no update (`RouteParameterReference('course')`);
    - `code` sai em `fromModel`;
    - `attributes.sence_code` entra nas três `validation.php` (`código SENCE`, `SENCE code`).
- [ ] **Step 5: Regenerar os tipos e rodar.**
  Run: `docker compose exec -T app php artisan typescript:transform && docker compose exec -T app php artisan test --filter='CourseCodeTest|CourseCrudTest|ClientAndCoursePutOmissionTest|InputDataDefaultsTest'`
  Expected: PASS.
- [ ] **Step 6: Commit**: `feat(60): code C-<n> e sence_code no curso`

### Task 3: Curso — telas

**Files:**
- Create: `frontend/src/shared/lib/courseLabel.ts`
- Test: `frontend/src/shared/lib/courseLabel.test.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/features/catalog/components/Course/courseColumns.ts`
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- Modify: `frontend/src/features/catalog/hooks/useCourseForm.ts`
- Modify: `frontend/src/features/commercial/components/Budget/CourseStep.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `CourseData.code`, `CourseData.sence_code` (Task 2).
- Produces: `courseLabel(course: { code?: string | null; name: string }): string`. Devolve
  `C-12 · Nome`, ou só o nome quando não há código.

- [ ] **Step 1: Teste que falha:**

```ts
it('junta código e nome com ponto médio', () => {
  expect(courseLabel({ code: 'C-12', name: 'Altura' })).toBe('C-12 · Altura')
})
it('sem código mostra só o nome', () => {
  expect(courseLabel({ code: null, name: 'Altura' })).toBe('Altura')
})
```

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test courseLabel`. Expected: FAIL.
- [ ] **Step 3: Implementar `courseLabel`, exportar pelo barrel e aplicar nas telas.**
  - Catálogo: uma coluna `code` com `identifierClass`, largura `COL.code`.
  - Detalhe e diálogo do curso: `code` só leitura no cabeçalho ou no modo view, e o campo
    `sence_code` editável com `inputMode="numeric"`, rótulo `catalog.course.senceCode` nas três
    locales (`Código SENCE`).
  - Seletor de curso do `CourseStep`: `optionLabel` passa por `courseLabel`. A busca casa código
    ou nome.
- [ ] **Step 4: Gate.** Run: `pnpm build && pnpm lint && pnpm test`. Expected: verde.
- [ ] **Step 5: Commit**: `feat(60): C-<n> e SENCE nas telas de curso`

### Task 4: Código da cotação `R y` — backend

**Files:**
- Modify: `backend/app/Domains/Commercial/Models/Quote.php:94`
- Modify: `backend/app/Console/CargaInicial/CarregadorDeHistorico.php:129`
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php:110`
- Test: `backend/tests/Feature/Comercial/QuoteCrudTest.php`
- Test: `backend/tests/Feature/CargaInicial/CarregadorDeHistoricoTest.php`
- Test: `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php`
- Test: `backend/tests/Feature/Operation/TurmaShowTest.php`
- Test: `backend/tests/Feature/Comercial/DtoTest.php`

**Interfaces:**
- Produces: `Quote::code(): string`, que devolve `"Scap {$budget_id} - R{$seq_in_budget}"`.

- [ ] **Step 1: Trocar `Cot ` por `R` (sem espaço) nas asserções dos cinco testes.** Exemplo:
  `assertSame('Scap 7 - R2', $quote->code())`.
- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter='QuoteCrudTest|CarregadorDeHistoricoTest|TurmaDataEnrichmentTest|TurmaShowTest|DtoTest'`
  Expected: FAIL com `Scap 7 - Cot 2`.
- [ ] **Step 3: Implementar** o formato novo em `Quote::code()`, na mensagem do carregador e no
  comentário do builder.
- [ ] **Step 4: Rodar de novo.** Expected: PASS. Depois disso, `grep -rn "Cot " backend/app backend/tests`
  não acha nada.
- [ ] **Step 5: Commit**: `feat(60): código da cotação Scap x - R y`

### Task 5: Código da cotação — telas

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetStatusCell.tsx`
- Test: `frontend/src/features/commercial/components/Budget/BudgetsTable.test.tsx`
- Modify: `frontend/src/shared/ui/AppDataTable/columnWidth.ts:42`
- Modify: `frontend/src/features/operation/components/Turma/turmaColumns.ts:14`
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx:77`
- Modify: `frontend/src/features/operation/components/Turma/PendingQuotesPanel.tsx`
- Test: `frontend/src/features/operation/components/Turma/PendingQuotesPanel.test.tsx`

**Interfaces:**
- Consumes: `PendingQuoteData.quote_code`, que já existe no contrato. Nenhum campo novo.

- [ ] **Step 1: Testes que falham.**
  - `BudgetsTable.test.tsx` passa a esperar `R2` onde esperava `Cot 2`.
  - `PendingQuotesPanel.test.tsx` (novo) espera `getByText('Scap 7 - R1')` numa linha com
    `quote_code: 'Scap 7 - R1'`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test BudgetsTable PendingQuotesPanel`.
- [ ] **Step 3: Implementar.**
  - `BudgetStatusCell`: rótulo curto `R${q.seq_in_budget}`.
  - Comentários que citam `Cot` passam a citar `R`.
  - `PendingQuotesPanel`: mostra `q.quote_code` com `identifierClass`, antes do cliente. Quando é
    `null`, mostra o `budget_code`.
  - Conferir Certificación e Dashboard. No levantamento, nenhum dos dois cita cotação
    (`grep -rln "quote" frontend/src/features/certification frontend/src/app/pages/Dashboard`
    volta vazio). Se continuar vazio, registre isso na mensagem do commit.
- [ ] **Step 4: Gate do front.** Expected: verde, e `grep -rn "Cot " frontend/src` não acha nada.
- [ ] **Step 5: Commit**: `feat(60): Scap x - R y nas telas`

### Task 6: Presupuestos como primeira aba

**Files:**
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Test: `frontend/src/features/commercial/components/CommercialPage.test.tsx`

**Interfaces:** nenhuma.

- [ ] **Step 1: Teste que falha.** Monta a página com os hooks mockados e espera que a primeira
  aba tenha `t('budget.tab')`, que o painel visível seja o de orçamentos e que `ClientsTable` não
  esteja montado.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test CommercialPage`.
- [ ] **Step 3: Implementar.** A ordem dos `ModuleTab` se inverte e o `useState(0)` continua
  apontando para a primeira aba, que agora é Presupuestos. Mova os blocos JSX literalmente.
- [ ] **Step 4: Gate.** Expected: verde.
- [ ] **Step 5: Commit**: `feat(60): Presupuestos como primeira aba do Comercial`

### Task 7: `PeriodFilter` em `shared/ui`

**Files:**
- Create: `frontend/src/shared/lib/period.ts`
- Test: `frontend/src/shared/lib/period.test.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Create: `frontend/src/shared/ui/PeriodFilter/PeriodFilter.tsx`
- Create: `frontend/src/shared/ui/PeriodFilter/index.ts`
- Test: `frontend/src/shared/ui/PeriodFilter/PeriodFilter.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`
- Delete: `frontend/src/app/pages/Dashboard/admin/PeriodFilter.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/AdminView.tsx`
- Modify: `frontend/src/app/pages/Dashboard/admin/periodPresets.ts`
- Modify: `frontend/src/app/pages/Dashboard/useDashboard.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces:
  - `type Period = { start: string; end: string }` (datas `yyyy-mm-dd`). `DashboardPeriod` vira
    alias dele.
  - `currentCalendarPeriod(kind: 'week' | 'month' | 'year', today: Date): Period`. A semana começa
    na segunda-feira, e o fim é sempre hoje.
  - `isWithinPeriod(instant: string, period: Period | null): boolean`. `null` significa sem recorte.
    Compara o **dia local** do instante ISO.
  - `PeriodFilter<K extends string>(props: { preset: K; presets: { value: K; label: string }[]; customKey: K; period: Period; onPresetChange: (k: K) => void; onPeriodChange: (p: Period) => void; staleError?: string | null; onRetry?: () => void | Promise<unknown> })`.
    As labels de acessibilidade são `common.period.{label,start,end}`.

- [ ] **Step 1: Testes que falham (`period.test.ts`):**

```ts
it('semana corrente num domingo vai da segunda anterior até hoje', () => {
  expect(currentCalendarPeriod('week', new Date(2026, 10, 22))).toEqual({ start: '2026-11-16', end: '2026-11-22' })
})
it('semana corrente numa segunda começa nela', () => {
  expect(currentCalendarPeriod('week', new Date(2026, 10, 23))).toEqual({ start: '2026-11-23', end: '2026-11-23' })
})
it('mês e ano correntes', () => {
  expect(currentCalendarPeriod('month', new Date(2026, 10, 22)).start).toBe('2026-11-01')
  expect(currentCalendarPeriod('year', new Date(2026, 10, 22)).start).toBe('2026-01-01')
})
it('instante perto da meia-noite compara pelo dia local', () => {
  // process.env.TZ = 'America/Santiago' no setup deste arquivo
  expect(isWithinPeriod('2026-11-23T02:30:00Z', { start: '2026-11-22', end: '2026-11-22' })).toBe(true)
})
it('null não recorta', () => { expect(isWithinPeriod('2001-01-01T00:00:00Z', null)).toBe(true) })
```

  E, em `PeriodFilter.test.tsx`: as opções vêm da prop `presets`; as datas só aparecem com
  `preset === customKey`; o `InlineLoadState` só aparece com `staleError`.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test period PeriodFilter`.
- [ ] **Step 3: Implementar e migrar o Dashboard.**
  - O componente sai do Dashboard por movimento literal, mais as props novas.
  - O Dashboard monta `presets` a partir de `PERIOD_PRESETS`, com `t('dashboard.period.<k>')` e
    `customKey='custom'`. Padrão e comportamento não mudam.
  - Apagar o arquivo antigo.
- [ ] **Step 4: Gate.** Expected: verde, com `useDashboard.test.tsx`, `periodPresets.test.ts` e
  `AdminView.test.tsx` passando sem mudar de asserção.
- [ ] **Step 5: Commit**: `refactor(60): PeriodFilter em shared/ui com presets por prop`

### Task 8: Orçamentos no diálogo do cliente

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/BudgetData.php`
- Test: `backend/tests/Feature/Comercial/DtoTest.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Create: `frontend/src/features/commercial/hooks/useClientBudgets.ts`
- Test: `frontend/src/features/commercial/hooks/useClientBudgets.test.tsx`
- Create: `frontend/src/features/commercial/components/Client/ClientBudgetsSection.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `Period`, `currentCalendarPeriod`, `isWithinPeriod` e `PeriodFilter` (Task 7).
- Produces:
  - `BudgetData::$created_at: string|Optional` (ISO 8601);
  - `useClientBudgets(clientId: number | null)`, que devolve
    `{ rows: BudgetData[]; load: ListSource<BudgetData>; search; setSearch; status: QuoteStatus | null; setStatus; preset: ClientPeriodKey; setPreset; period: Period; setPeriod; clear }`,
    com `ClientPeriodKey = 'all' | 'week' | 'month' | 'year' | 'custom'` e padrão `'all'`.

- [ ] **Step 1: Testes que falham.**
  - Em `DtoTest`, `BudgetData::fromModel($b)->created_at` é igual a
    `$b->created_at->toIso8601String()`.
  - Em `useClientBudgets.test.tsx`, com uma lista de três orçamentos (dois do cliente 1, sendo um
    `approved` criado em 2025 e um `pending` criado hoje, e um do cliente 2):

```ts
expect(result.current.rows.map((b) => b.id)).toEqual([1, 2])            // 'all', só cliente 1
act(() => result.current.setPreset('year'))
expect(result.current.rows.map((b) => b.id)).toEqual([2])               // ano corrente
act(() => { result.current.setPreset('all'); result.current.setStatus('approved') })
expect(result.current.rows.map((b) => b.id)).toEqual([1])
act(() => result.current.setSearch('Scap 1'))                           // busca por código
```

- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter=DtoTest` e `pnpm test useClientBudgets`.
- [ ] **Step 3: Implementar.**
  - `created_at` no `BudgetData`, depois `typescript:transform`.
  - O hook usa `budgetsApi.useList()`, a mesma query e o mesmo cache do Comercial, e filtra no
    navegador. O estado de carga vem de `useLoadState`.
  - `ClientBudgetsSection` segue o molde da seção de certificados de `StudentDetailSections`:
    `AppDataTable` com código, estado (`BudgetStatusCell` ou tag) e data, mais os filtros busca,
    `AppDropdown` de estado e `PeriodFilter`.
  - O `ClientDialog` a monta quando `mode !== 'create'` e `client` existe.
  - Rótulos novos: `client.budgets.{title,empty}` e `client.budgets.period.{all,week,month,year,custom}`
    (es-CL: `Todos`, `Semana`, `Mes`, `Año`, `Personalizado`).
- [ ] **Step 4: Gate.** Rode o backend filtrado e o gate do front. Expected: verde. O `ClientDialog`
  continua abaixo de 150 linhas.
- [ ] **Step 5: Commit**: `feat(60): orçamentos do cliente no diálogo, com filtros`

### Task 9: Evaluaciones — tipos, habilitação, conclusão e paridade

**Files:**
- Modify: `backend/app/Domains/Operation/Enums/TurmaDocumentType.php`
- Modify: `backend/app/Domains/Operation/Models/Turma.php:150-160`
- Modify: `backend/app/Domains/Operation/Services/HabilitacaoStatus.php`
- Modify: `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php`
- Modify: `backend/app/Domains/Operation/QueryBuilders/TurmaQueryBuilder.php:30-60,126-178`
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php`
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php:31`
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php:79,165`
- Modify: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php:196`
- Create: `backend/database/migrations/2026_11_22_000002_converte_pruebas_em_evaluacion_aluno.php`
- Modify: `backend/database/seeders/OperationDemoSeeder.php`
- Modify: `backend/database/seeders/PerformanceScenarioSeeder.php`
- Modify: `backend/lang/en/operation.php`
- Modify: `backend/lang/es_CL/operation.php`
- Modify: `backend/lang/pt_BR/operation.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Modify: `frontend/src/shared/lib/turmaDocumentType.ts`
- Test: `frontend/src/shared/lib/turmaDocumentType.test.ts`
- Modify: `frontend/src/features/operation/lib/turmaDocuments.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Test: `backend/tests/Feature/Operation/TurmaStatusParityTest.php`
- Test: `backend/tests/Feature/Operation/TurmaHabilitacaoServiceTest.php`
- Test: `backend/tests/Feature/Operation/ConcludeTurmaTest.php`
- Test: `backend/tests/Feature/Operation/TurmaModelTest.php`
- Test: `backend/tests/Feature/Operation/TurmaQueryBuilderTest.php`
- Test: `backend/tests/Feature/Operation/TurmaDocumentActionsTest.php`
- Test: `backend/tests/Feature/Operation/TurmaDocumentApiTest.php`
- Test: `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php`
- Test: `backend/tests/Feature/Dashboard/DashboardEndpointTest.php`
- Test: `backend/tests/Feature/Dashboard/OperationMetricsQueryTest.php`
- Test: `backend/tests/Feature/Dashboard/RedatorScopeQueryTest.php`
- Test: `backend/tests/Feature/Operation/PruebasConversionMigrationTest.php`
- Test: `frontend/src/app/pages/Dashboard/redator/PendenciasList.test.tsx`

**Interfaces:**
- Consumes: o resultado da Task 1 (sem `type` desconhecido).
- Produces:
  - `TurmaDocumentType`: cases `MANUAL`, `EVALUACION_REDATOR`, `EVALUACION_CLIENTE` e
    `EVALUACION_ALUNO`. Métodos:
    - `bloqueiaConclusao(): bool`;
    - `static bloqueantes(): array<self>` (MANUAL e EVALUACION_REDATOR);
    - `static opcionais(): array<self>` (EVALUACION_CLIENTE e EVALUACION_ALUNO);
    - `static values(): array<string>`, que continua cobrindo os quatro.
  - `Turma::documentos(): MorphMany` (D-P1), que substitui `documentacaoObrigatoria()`.
  - `HabilitacaoStatus::missingTypes(): array<TurmaDocumentType>`, só os bloqueantes.
  - `HabilitacaoStatus::missingOptionalTypes(): array<TurmaDocumentType>`.
  - `TurmaData::$missing_optional_document_types: TurmaDocumentType[]|Optional`.

- [ ] **Step 1: Testes que falham.**
  - Em `TurmaStatusParityTest`, o caso novo é a turma com só MANUAL e EVALUACION_REDATOR, mais
    redator. Ela é `habilitada` pelo `TurmaHabilitacaoService` **e** pelo
    `whereDisplayStatus('habilitada')`.
  - Em `ConcludeTurmaTest`:

```php
public function test_conclui_com_so_manual_e_instructor(): void { /* POST conclude → 200, status concluida */ }
public function test_recusa_sem_evaluacion_do_instructor(): void { /* só MANUAL → 422, mensagem cita o tipo */ }
```

  - Em `TurmaHabilitacaoServiceTest`, `missingOptionalTypes()` devolve
    `[EVALUACION_CLIENTE, EVALUACION_ALUNO]` sem eles e `[]` com eles.
  - Em `PruebasConversionMigrationTest`:
    - um `File` de turma `PRUEBAS` (ativo) e um soft-deletado viram `EVALUACION_ALUNO`;
    - os dois ganham linha em `audits`;
    - rodar de novo não gera audit novo;
    - um `File` de redator com `type='PRUEBAS'` não é tocado.
  - Trocar `PRUEBAS` pelos tipos novos nas fixtures dos testes listados. Os que montam documentação
    completa usam `TurmaDocumentType::cases()`.
- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter='TurmaStatusParityTest|ConcludeTurmaTest|TurmaHabilitacaoServiceTest|PruebasConversionMigrationTest'`
- [ ] **Step 3: Implementar o backend.**
  - O enum troca o docblock de `values()`: o dono da pergunta "o que bloqueia" passa a ser
    `bloqueantes()`.
  - A relação `documentos()` faz `whereIn('type', values())`, e a renomeação chega a todos os
    usos (`LISTING`, `CASCADED`, `whereHas`, controller `index`, os dois dashboards e os testes).
  - `TurmaHabilitacaoService::for()` parte os tipos ausentes entre `bloqueantes()` e `opcionais()`.
    O `HabilitacaoStatus` ganha o quarto argumento, e `isHabilitada()` só olha os bloqueantes.
  - `whereDisplayStatus` itera `bloqueantes()` nos dois ramos.
  - `ConcludeTurmaAction` continua usando `missingTypes()`, que agora só contém bloqueantes.
  - `TurmaData::fromModel` preenche o campo novo.
  - A migration de conversão passa por
    `File::withTrashed()->where('fileable_type', 'turma')->where('type', 'PRUEBAS')->each(...)`,
    com `->type = 'EVALUACION_ALUNO'` e `->save()` por instância.
  - Seeders: `PRUEBAS` vira `EVALUACION_ALUNO`, e o demo ganha um `EVALUACION_CLIENTE` numa das
    turmas.
  - Lang `operation.document_type.*`, nas três locales:

    | Tipo | es-CL | pt-BR | en |
    |---|---|---|---|
    | `EVALUACION_REDATOR` | Evaluación Instructor | Avaliação Instrutor | Instructor evaluation |
    | `EVALUACION_CLIENTE` | Evaluación Cliente | Avaliação Cliente | Client evaluation |
    | `EVALUACION_ALUNO` | Evaluación Alumnos | Avaliação Alunos | Students evaluation |

    `PRUEBAS` sai.
- [ ] **Step 4: Regenerar os tipos e consertar a compilação do front.**
  - `typescript:transform`.
  - `TURMA_DOCUMENT_TYPE_KEY` ganha as duas chaves novas e perde `PRUEBAS`. O `Record` não compila
    sem isso.
  - `TURMA_DOCUMENT_TYPES` fica `['MANUAL', 'EVALUACION_REDATOR', 'EVALUACION_CLIENTE', 'EVALUACION_ALUNO']`.
  - `operation.documents.type.*` entra nas três locales, com os textos da tabela acima.
  - `PendenciasList.test.tsx` troca a fixture.
- [ ] **Step 5: Suíte inteira do backend e gate do front.**
  Run: `docker compose exec -T app php artisan test` e `pnpm build && pnpm lint && pnpm test`.
  Expected: verde, incluindo `ListQueryBudgetTest` (a relação renomeada continua no eager-load).
- [ ] **Step 6: Commit**: `feat(60): evaluaciones Instructor/Cliente/Alumnos, só Manual e Instructor bloqueiam`

### Task 10: Evaluaciones — quem anexa e quem remove cada tipo

**Files:**
- Create: `backend/app/Domains/Operation/Services/TurmaDocumentGate.php`
- Create: `backend/app/Domains/Operation/Exceptions/TurmaDocumentoProibidoException.php`
- Modify: `backend/app/Domains/Operation/Actions/StoreTurmaDocumentAction.php`
- Modify: `backend/app/Domains/Operation/Actions/DeleteTurmaDocumentAction.php`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaDocumentController.php`
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php`
- Create: `backend/database/migrations/2026_11_22_000003_add_turma_client_evaluation_permission.php`
- Modify: `backend/lang/en/operation.php`
- Modify: `backend/lang/es_CL/operation.php`
- Modify: `backend/lang/pt_BR/operation.php`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Test: `backend/tests/Feature/Operation/TurmaEvaluacionUploadMatrixTest.php`
- Test: `backend/tests/Feature/Operation/TurmaClientEvaluationPermissionMigrationTest.php`

**Interfaces:**
- Consumes: os cases de `TurmaDocumentType` (Task 9).
- Produces:
  - a permissão `operation.turma.submit_client_evaluation` (admin e superadmin; não é segregada);
  - `TurmaDocumentGate::assertPodeAnexar(Turma $turma, TurmaDocumentType $type, User $actor): void`;
  - `TurmaDocumentGate::assertPodeRemover(Turma $turma, File $file, User $actor): void`.

**A matriz (spec §4.6, decisão do João):**

| Tipo | Em andamento | Concluída |
|---|---|---|
| MANUAL, EVALUACION_REDATOR | `submit_docs` | `manage_concluded_docs`; os demais recebem `concluded_locked` (422) |
| EVALUACION_ALUNO | `submit_docs` | `submit_docs` ou `manage_concluded_docs` |
| EVALUACION_CLIENTE | `submit_client_evaluation` | `submit_client_evaluation` |

Regras de leitura da matriz:
- Tipo que o ator não pode anexar recebe 403 (`operation.turma.document_type_forbidden`), por
  exemplo o redator com Cliente e o admin com Manual.
- Remover em turma em andamento segue a mesma linha do tipo do arquivo.
- Remover em turma concluída exige `manage_concluded_docs` para todos os tipos. Os demais recebem
  `concluded_locked`.

- [ ] **Step 1: Testes que falham, em `TurmaEvaluacionUploadMatrixTest`.** Um `#[DataProvider]` com
  as linhas `(papel, status, tipo, esperado)` cobrindo a tabela inteira, sempre pela API
  (`POST /api/turmas/{id}/documents`). Os casos do Review Focus 3 vão nomeados:

```php
public function test_redator_anexa_alumnos_em_turma_concluida(): void { /* 201 */ }
public function test_redator_manual_em_turma_concluida_recusa_concluded_locked(): void
{ /* 422, errors.turma == __('operation.turma.concluded_locked') */ }
public function test_admin_manual_em_turma_em_andamento_e_403(): void { /* 403, detail == __('operation.turma.document_type_forbidden') */ }
public function test_admin_anexa_cliente_em_andamento_e_concluida(): void { /* 201, 201 */ }
public function test_redator_cliente_e_403(): void {}
public function test_admin_remove_cliente_de_concluida_recusa(): void { /* só superadmin remove em concluída */ }
```

  E, em `TurmaClientEvaluationPermissionMigrationTest` (molde de
  `TurmaConcludedDocsPermissionMigrationTest`): a migration cria a permissão, a liga a `admin` e
  `superadmin`, não a liga a `redator`, e é idempotente.
- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter='TurmaEvaluacionUploadMatrixTest|TurmaClientEvaluationPermissionMigrationTest'`
- [ ] **Step 3: Implementar.**
  - Gate com a matriz acima. As duas Actions trocam o `if` da RN-15 pela chamada ao gate.
  - Middleware do controller em `store`/`destroy`:
    `permission:operation.turma.submit_docs|operation.turma.submit_client_evaluation`.
  - A exceção segue o molde de `RedatorOnlyActionException` (`TipoDeRecusa::AcaoProibida`).
  - Permissão no catálogo, com descrição dev-facing. O `RolePermissionSeeder` não muda de código:
    o admin já recebe tudo fora da lista de exclusão, o superadmin recebe tudo pelo `array_keys`,
    e o redator tem lista fechada. O matrix test prova os três depois de `db:seed` no `setUp`.
  - `perm.operation_turma_submit_client_evaluation` nas três locales do front (es-CL:
    `Subir evaluación del cliente`).
  - Lang `operation.turma.document_type_forbidden` nas três locales.
- [ ] **Step 4: Rodar as catracas de RBAC e a suíte de Operation.**
  Run: `docker compose exec -T app php artisan test --filter='Permission|TurmaDocument|TurmaEvaluacion|RbacAuthTest|LocaleParityTest'`
  Expected: PASS.
- [ ] **Step 5: Commit**: `feat(60): matriz de upload das evaluaciones por papel e status`

### Task 11: Evaluaciones — dashboards (backend)

**Files:**
- Create: `backend/app/Domains/Dashboard/Support/CorteDeEvaluaciones.php`
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php`
- Modify: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php`
- Modify: `backend/app/Domains/Dashboard/Data/TurmaComplianceData.php`
- Modify: `backend/app/Domains/Dashboard/Data/RedatorTurmaPendenciaData.php`
- Modify: `frontend/src/shared/types/generated.ts`
- Test: `backend/tests/Feature/Dashboard/EvaluacionesAvisoDashboardTest.php`

**Interfaces:**
- Consumes: `HabilitacaoStatus::missingOptionalTypes()` e `Turma::documentos()` (Task 9).
- Produces:
  - `CorteDeEvaluaciones::DESDE: string` (`Y-m-d`) e `CorteDeEvaluaciones::inicio(): CarbonImmutable`;
  - `TurmaComplianceData::$missing_optional_types: TurmaDocumentType[]` e
    `TurmaComplianceData::$concluded: bool`;
  - `RedatorTurmaPendenciaData::$missing_optional_types: TurmaDocumentType[]`, que só contém
    `EVALUACION_ALUNO`.

- [ ] **Step 1: Testes que falham (`EvaluacionesAvisoDashboardTest`):**

```php
public function test_compliance_inclui_concluida_apos_o_corte_com_aviso(): void
{ /* concluded_at = corte + 1 dia, sem CLIENTE → aparece com concluded=true, missing_optional_types=[CLIENTE, ALUNO] */ }
public function test_compliance_ignora_concluida_antes_do_corte(): void {}
public function test_compliance_ignora_concluida_sem_aviso(): void {}
public function test_pendencias_admin_nao_gera_docs_incomplete_por_aviso(): void
{ /* em andamento com só bloqueantes → TurmaAwaitingConclusion e nenhum TurmaDocsIncomplete */ }
public function test_redator_ve_so_alumnos_como_aviso(): void
{ /* sem CLIENTE e sem ALUNO → missing_optional_types == [EVALUACION_ALUNO] */ }
public function test_kpi_pendencias_documentais_conta_so_bloqueantes(): void
{ /* uma turma só com aviso → resumo()->pendencias_documentais == 0, mas pendenciasDocumentais() a lista */ }
public function test_redator_concluida_apos_o_corte_sem_alumnos_aparece(): void {}
public function test_redator_nao_ve_turma_alheia(): void {}
```

- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter=EvaluacionesAvisoDashboardTest`
- [ ] **Step 3: Implementar.**
  - `DESDE` nasce com a data do dia da execução. A Task 17 a acerta para a do merge.
  - `complianceTurmas()` junta as turmas em andamento e as concluídas com
    `concluded_at >= FusoDoNegocio::inicioDoDia(DESDE)` e `missingOptionalTypes() !== []`.
  - `present_types` passa a vir de `TurmaDocumentType::cases()`.
  - `pendencias()` não muda de lógica, porque `missingTypes()` já só contém os bloqueantes.
  - `pendenciasDocumentais()` lista a turma em andamento com bloqueante ou Alumnos faltando, e a
    concluída depois do corte com Alumnos faltando, sempre pelo `scoped()`.
  - `resumo()` conta só as linhas com `missing_types !== []`.
  - O eager-load das concluídas inclui `documentos`, `redatores` e `course`. Pela regra do
    `preventLazyLoading`, o teste hidrata duas ou mais turmas.
  - `typescript:transform`.
- [ ] **Step 4: Rodar a suíte de Dashboard.**
  Run: `docker compose exec -T app php artisan test --filter=Dashboard`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(60): aviso de evaluaciones nos dashboards, sem contar como pendência`

### Task 12: Evaluaciones — tela da turma

**Files:**
- Create: `frontend/src/features/operation/lib/evaluacionGate.ts`
- Test: `frontend/src/features/operation/lib/evaluacionGate.test.ts`
- Create: `frontend/src/features/operation/components/Document/EvaluacionesCard.tsx`
- Test: `frontend/src/features/operation/components/Document/EvaluacionesCard.test.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/features/operation/components/Document/ConcludePanel.tsx`
- Test: `frontend/src/features/operation/components/Document/ConcludePanel.test.tsx`
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Modify: `frontend/src/features/operation/hooks/useConclusionSection.ts`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes:
  - `TurmaData.missing_optional_document_types` (Task 9);
  - a permissão `operation.turma.submit_client_evaluation` (Task 10);
  - `TurmaData.client_name`, que já existe.
- Produces:
  - `podeAnexar(type: TurmaDocumentType, status: TurmaStatus, can: (p: string) => boolean): boolean`;
  - `podeRemover(type: TurmaDocumentType, status: TurmaStatus, can: (p: string) => boolean): boolean`.

  Os dois espelham a matriz da Task 10. Quem decide continua sendo o backend.

- [ ] **Step 1: Testes que falham.**
  - `evaluacionGate.test.ts` é por tabela, com as mesmas linhas do data provider da Task 10.
  - `EvaluacionesCard.test.tsx`:
    - três slots com as tags `Instructor`, o nome do cliente (`client_name`) e `Alumnos`;
    - cada slot lista N arquivos do seu tipo;
    - o botão de envio só aparece onde `podeAnexar`;
    - o aviso aparece com `missing_optional_document_types` não vazio, inclusive com
      `status: 'concluida'`.
  - `ConcludePanel.test.tsx`: com `habilitada: true` e opcionais faltando, o aviso lista
    `Evaluación Cliente` e o botão continua habilitado.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test evaluacionGate EvaluacionesCard ConcludePanel`.
- [ ] **Step 3: Implementar.**
  - O `TurmaDocuments` fica com o `DocumentTypeCard` do MANUAL e, abaixo, o `EvaluacionesCard`.
  - O cartão compõe as peças de `shared/ui` que o `BudgetDocumentsCard` usa (`AppCard`,
    `AppCardHeader`, `AppTag`, `SectionLabel` e o upload), com a lista acumulada por slot. Ele não
    importa nada de `features/commercial`.
  - `useTurmaDocsSection` expõe `canUpload(type)`/`canRemove(type)` a partir de
    `usePermissions().can` e de `turma.status`.
  - Locales novas:
    - `operation.documents.evaluaciones.{title,warning}`;
    - `operation.documents.evaluaciones.tag.{EVALUACION_REDATOR,EVALUACION_ALUNO}` (`Instructor`,
      `Alumnos`);
    - `operation.documents.evaluaciones.tag.clienteFallback` (`Cliente`).
- [ ] **Step 4: Gate.** Expected: verde, e todo componente abaixo de 150 linhas.
- [ ] **Step 5: Commit**: `feat(60): cartão de evaluaciones e aviso na turma`

### Task 13: Evaluaciones — dashboards (front)

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx`
- Test: `frontend/src/app/pages/Dashboard/admin/CompliancePanel.test.tsx`
- Modify: `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx`
- Test: `frontend/src/app/pages/Dashboard/redator/PendenciasList.test.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `TurmaComplianceData.missing_optional_types`, `TurmaComplianceData.concluded` e
  `RedatorTurmaPendenciaData.missing_optional_types` (Task 11).

- [ ] **Step 1: Testes que falham.**
  - `CompliancePanel`: a turma `concluded: true` com `missing_optional_types` mostra os rótulos
    como aviso, em tom diferente de bloqueante, e o marcador `dashboard.compliance.concluded`.
  - `PendenciasList`: o aviso de Alumnos aparece abaixo dos bloqueantes, e uma turma só com aviso
    aparece sem item bloqueante.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test CompliancePanel PendenciasList`.
- [ ] **Step 3: Implementar.** Os rótulos saem de `turmaDocumentTypeLabel`. Chaves novas:
  `dashboard.compliance.{concluded,warning}` e `dashboard.redator.pendencias.warning`.
- [ ] **Step 4: Gate.** Expected: verde.
- [ ] **Step 5: Commit**: `feat(60): aviso de evaluaciones nos dashboards`

### Task 14: RUT — `RutInput` e busca de aluno

**Files:**
- Modify: `backend/app/Domains/Identity/QueryBuilders/StudentQueryBuilder.php:44-52`
- Test: `backend/tests/Feature/Identity/StudentPaginationTest.php`
- Create: `frontend/src/shared/lib/rut.ts`
- Test: `frontend/src/shared/lib/rut.test.ts`
- Create: `frontend/src/shared/ui/RutInput/RutInput.tsx`
- Create: `frontend/src/shared/ui/RutInput/index.ts`
- Test: `frontend/src/shared/ui/RutInput/RutInput.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientGeneralFields.tsx`
- Modify: `frontend/src/features/identity/components/Admin/StaffIdentifyFields.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ImportRowEditor.tsx`

**Interfaces:**
- Produces:
  - `formatRutInput(raw: string): string`: tira o que não é dígito nem `kK`, põe pontos e hífen
    progressivamente e devolve o DV maiúsculo;
  - `isRutValid(raw: string): boolean`: módulo 11, só como dica visual;
  - `RutInput(props: AppInputTextProps & { value: string; onChange: (formatted: string) => void })`,
    com `forwardRef`, como o `AppInputText`.

- [ ] **Step 1: Testes que falham.**
  - `rut.test.ts` (Review Focus 1):

```ts
expect(formatRutInput('123456785')).toBe('12.345.678-5')
expect(formatRutInput('12.345.678-5')).toBe('12.345.678-5')
expect(formatRutInput(' 12..345.678 - k')).toBe('12.345.678-K')
expect(formatRutInput('12345678')).toBe('1.234.567-8')     // 7 dígitos + DV
expect(formatRutInput('1234')).toBe('123-4')
expect(isRutValid('12.345.678-5')).toBe(true)
expect(isRutValid('12.345.678-4')).toBe(false)
```

  - Em `StudentPaginationTest`, um aluno com RUT `12.345.678-5` é achado pelos termos
    `12345678`, `12.345.678`, `123456785` e `12345678-5`.
- [ ] **Step 2: Rodar e ver falhar.**
  Run: `pnpm test rut RutInput` e `docker compose exec -T app php artisan test --filter=StudentPaginationTest`.
- [ ] **Step 3: Implementar.**
  - `searchable()` limpa o termo de `.`, `-` e espaço. Quando sobra só dígito, mais `k`/`K`, ele
    compara com `REPLACE(REPLACE(users.rut, '.', ''), '-', '') LIKE ?`, que funciona em MySQL e em
    sqlite. A busca por nome continua igual.
  - O `RutInput` embrulha o `AppInputText`, com `inputMode="text"` e `maxLength=12`. O
    `aria-invalid` vem do `isRutValid` só depois do blur.
  - Trocar o campo de RUT nos seis formulários. O `ImportRowEditor` mantém o `disabled={rutLocked}`.
- [ ] **Step 4: Gate do front e Pint no arquivo PHP.** Expected: verde.
- [ ] **Step 5: Commit**: `feat(60): máscara de RUT e busca de aluno sem pontuação`

### Task 15: Telefone e e-mail — backend e conversão

**Files:**
- Modify: `backend/composer.json`
- Modify: `backend/composer.lock`
- Create: `backend/app/Shared/Support/Phone.php`
- Create: `backend/app/Shared/Rules/ValidPhone.php`
- Test: `backend/tests/Unit/Shared/PhoneTest.php`
- Modify: `backend/app/Domains/Identity/Models/User.php`
- Modify: `backend/app/Domains/Commercial/Models/ClientContact.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php`
- Modify: `backend/app/Domains/Commercial/Data/ClientContactData.php`
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php`
- Modify: `backend/app/Domains/Identity/Data/UserData.php`
- Modify: `backend/app/Domains/Identity/Data/ProfileUpdateData.php`
- Modify: `backend/app/Domains/Identity/Services/StudentIdentity.php:34-44`
- Modify: `backend/lang/en/shared.php`
- Modify: `backend/lang/es_CL/shared.php`
- Modify: `backend/lang/pt_BR/shared.php`
- Create: `backend/database/migrations/2026_11_22_000004_converte_telefones_para_e164.php`
- Test: `backend/tests/Feature/Shared/PhoneNormalizationTest.php`
- Test: `backend/tests/Feature/Shared/PhoneConversionMigrationTest.php`
- Test: `backend/tests/Feature/Operation/ImportRowClassifierTest.php`

**Interfaces:**
- Consumes: os padrões medidos na Task 1. As regras de limpeza se ajustam ao que apareceu, sem
  caso inventado.
- Produces:
  - `Phone::parse(string $raw, string $regiao = 'CL'): self`, que lança
    `InvalidArgumentException` quando o número é inválido;
  - `Phone::isValid(?string $raw): bool`;
  - `Phone::e164(): string`;
  - `Phone::normalizar(?string $raw): ?string`: `null`/vazio → `null`, válido → E.164, inválido →
    o valor intacto. Usado pelo mutator;
  - `Phone::corrigirLegado(?string $raw): ?string`: limpeza e parse; válido → E.164, senão `null`;
  - `ValidPhone implements ValidationRule`, com mensagem `__('shared.rule.phone_invalid')`;
  - os mutators `User::phone`/`email` e `ClientContact::phone`/`email` (D-P2).

- [ ] **Step 1: Testes que falham.**
  - `PhoneTest` (Review Focus 4). Ajuste a lista ao `medicao-producao.md`:

```php
#[DataProvider('legados')]
public function test_corrigir_legado(?string $raw, ?string $esperado): void
{ $this->assertSame($esperado, Phone::corrigirLegado($raw)); }
public static function legados(): array { return [
    'movel com espaços'   => ['+56 9 1234 5678', '+56912345678'],
    'movel só dígitos'    => ['912345678', '+56912345678'],
    'fixo Santiago'       => ['(2) 2123 4567', '+56221234567'],
    'prefixo 0'           => ['0 9 1234 5678', '+56912345678'],
    '56 duplicado'        => ['+56 56 9 1234 5678', '+56912345678'],
    'dois números'        => ['9 1234 5678 / 2 2123 4567', '+56912345678'],
    'fixo antigo 7 díg.'  => ['2123456', null],
    'lixo'                => ['12345', null],
    'já E.164'            => ['+56912345678', '+56912345678'],
    'estrangeiro'         => ['+54 9 11 2345 6789', '+5491123456789'],
    'vazio'               => ['', null],
]; }
public function test_normalizar_mantem_invalido_intacto(): void
{ $this->assertSame('abc', Phone::normalizar('abc')); }
```

  - `PhoneNormalizationTest`:
    - `PUT` de cliente, redator, staff, aluno e perfil com `9 1234 5678` grava `+56912345678`;
    - `phone: 'abc'` dá 422 em `phone` com a mensagem traduzida;
    - `contacts.0.phone` inválido dá 422;
    - e-mail `  Foo@Bar.CL ` é gravado como `foo@bar.cl`;
    - um usuário legado com e-mail em maiúsculas não é reescrito por uma escrita que não toca
      o e-mail.
  - `PhoneConversionMigrationTest`:
    - `users` (incluindo soft-deletado) e `client_contacts` saem todos em E.164 ou `NULL`;
    - cada linha alterada tem audit com o valor antigo em `old_values`;
    - a segunda execução não gera audit;
    - `Log::info('telefones.e164', …)` recebe as contagens e os `id` dos zerados, nunca o número
      (`Log::spy()`).
  - `ImportRowClassifierTest`:
    - aluno novo com telefone `abc` tem erro na linha;
    - aluno já cadastrado com `abc` tem só o `updateRefusal`, e a matrícula segue;
    - célula vazia é aceita nos dois casos.
- [ ] **Step 2: Rodar e ver falhar.**
  Run: `docker compose exec -T app php artisan test --filter='PhoneTest|PhoneNormalizationTest|PhoneConversionMigrationTest|ImportRowClassifierTest'`
- [ ] **Step 3: Implementar.**
  - `composer require giggsey/libphonenumber-for-php`, rodado no container (versão estável mais
    recente que respeite a política do lockfile).
  - `Phone` no molde do `Rut`, e `ValidPhone` no molde do `ValidRut` (passa com vazio/`null`).
  - `ValidPhone` entra nos seis DTOs e no `StudentIdentity::rules()`, o que já cobre matrícula,
    planilha e cadastro de aluno.
  - Os mutators usam `Attribute::make(set: …)`, com docblock citando a D-P2.
  - A migration itera `User::withTrashed()->whereNotNull('phone')->lazyById()` e o mesmo em
    `ClientContact`. Ela grava `corrigirLegado()` só quando o valor muda e loga o relatório.
- [ ] **Step 4: Suíte inteira do backend.** Run: `docker compose exec -T app php artisan test`.
  Expected: verde. As fixtures que gravavam telefone fora de E.164 passam pelo mutator. Teste que
  compara o valor gravado é atualizado para E.164.
- [ ] **Step 5: Pint nos arquivos tocados e commit**: `feat(60): telefone E.164 e e-mail normalizado na API, conversão auditada`

### Task 16: Telefone — front

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/pnpm-lock.yaml`
- Create: `frontend/src/shared/lib/phone.ts`
- Test: `frontend/src/shared/lib/phone.test.ts`
- Create: `frontend/src/shared/ui/PhoneInput/PhoneInput.tsx`
- Create: `frontend/src/shared/ui/PhoneInput/index.ts`
- Test: `frontend/src/shared/ui/PhoneInput/PhoneInput.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/features/commercial/components/Client/ContactCard.tsx`
- Modify: `frontend/src/features/identity/components/Admin/StaffIdentifyFields.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentIdentifyFields.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollStudentForm.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: o formato E.164 que a API grava (Task 15).
- Produces:
  - `formatPhoneDisplay(value: string | null | undefined): string`: formato internacional; `''`
    para vazio; o valor cru quando não parseia;
  - `PhoneInput(props: { value: string | null; onChange: (value: string | null) => void; inputId?: string; disabled?: boolean; invalid?: boolean; 'aria-label'?: string })`.
    Emite E.164 quando parseia, o texto cru quando não parseia (a API devolve o 422) e `null` para
    vazio.

- [ ] **Step 1: Testes que falham.**
  - `phone.test.ts`:
    - `formatPhoneDisplay('+56912345678')` dá `'+56 9 1234 5678'`;
    - `formatPhoneDisplay('+56221234567')` dá `'+56 2 2123 4567'`.
  - `PhoneInput.test.tsx` (Review Focus 2):
    - Chile vem pré-selecionado;
    - digitar `912345678` emite `+56912345678`;
    - colar `+56 9 1234 5678` com Chile selecionado emite `+56912345678`, sem `+5656`;
    - trocar o país para Argentina reformata e emite com `+54`;
    - um `value` inicial `+5491123456789` abre com Argentina selecionada;
    - texto inválido emite o cru.
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm test phone PhoneInput`.
- [ ] **Step 3: Implementar.**
  - `pnpm add libphonenumber-js` (respeitando a política de idade mínima do lockfile).
  - `PhoneInput` com `AppDropdown` de país: `getCountries()`, nome por `Intl.DisplayNames` no
    idioma ativo, bandeira `fi fi-<cc>` e `+<código>`. O campo é `AppInputText` com `AsYouType`.
    O dropdown leva `aria-label` (`common.phone.country`).
  - Trocar o campo nos formulários listados.
  - Exibição com `formatPhoneDisplay` onde a tela mostra telefone. Confira com
    `grep -rn "phone" frontend/src/features --include=*.tsx`.
  - O `ImportRowEditor` **não** muda: célula crua, e quem valida é a API (spec §4.8).
- [ ] **Step 4: Gate.** Expected: verde.
- [ ] **Step 5: Commit**: `feat(60): PhoneInput com país e formato internacional`

### Task 17: Fechamento documental e conferência pós-deploy

**Files:**
- Modify: `docs/der-fisico.md`
- Modify: `docs/superpowers/pendencias/abertas.md`
- Modify: `docs/superpowers/pendencias/encerradas.md`
- Modify: `docs/superpowers/pendencias/README.md`
- Modify: `backend/app/Domains/Dashboard/Support/CorteDeEvaluaciones.php`
- Create: `docs/superpowers/blocos/60-codigos-mascaras-comercial-e-avaliacoes/scripts/conferir-pos-deploy.php`

**Interfaces:**
- Consumes: `CorteDeEvaluaciones::DESDE` (Task 11).

- [ ] **Step 1: `der-fisico.md`.**
  - `courses.code` (`varchar(20)`, `UNIQUE`, `C-{id}`, aplicação) e `courses.sence_code`
    (`varchar(20)`, `UNIQUE`, `nullable`).
  - A nota de E.164 em `users.phone` e `client_contacts.phone`.
  - Os quatro valores de `files.type` para turma.
- [ ] **Step 2: Encerrar a P-09.** Ela sai de `abertas.md`, entra em `encerradas.md` com o motivo
  "taxonomia decidida pela Lotus em 2026-11-21: Instructor, Cliente, Alumnos; só Manual e
  Instructor bloqueiam" e sai do índice.
- [ ] **Step 3: Script só de leitura `conferir-pos-deploy.php`**, no molde do de medição, com o
  comando de execução no cabeçalho. Ele imprime:
  - a contagem de `users.phone` e `client_contacts.phone` em E.164 (`^\+[1-9][0-9]{7,14}$`);
  - a contagem dos que estão fora (tem de ser 0);
  - a contagem dos zerados pela conversão, lida dos `audits` com `old_values.phone` não nulo e
    `new_values.phone` nulo;
  - a contagem de cursos sem `code` (tem de ser 0).

  Nenhum valor é impresso.
- [ ] **Step 4: Acertar `CorteDeEvaluaciones::DESDE`** para a data prevista do merge. O
  `/finalizar-bloco` confere a data de novo antes do PR.
- [ ] **Step 5: Commit**: `docs(60): der-fisico, P-09 encerrada e script de conferência pós-deploy`

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 4, 5, 6, 7 | sim | nenhuma entre elas |

Validação por par:
- O 4 só toca `backend/`.
- O 5 toca telas de `commercial/Budget` e `operation/Turma`, mais o `columnWidth.ts`.
- O 6 toca só `CommercialPage.tsx` e o teste dele.
- O 7 toca `shared/lib/period.ts`, `shared/lib/index.ts`, `shared/ui/PeriodFilter/`,
  `shared/ui/index.ts`, o Dashboard e as locales.

Nenhum par compartilha arquivo, e nenhum consome o que o outro produz: o 5 lê `quote_code`, que já
é string da API.

Fora de grupo, uma a uma e na ordem:
- 1, o gate que vem antes de tudo;
- 2 → 3 (o 3 consome o 2);
- 8 (consome o 7);
- 9 → 10 → 11 → 12 → 13 (cadeia de Consumes, além de `generated.ts` e locales em comum);
- 14, 15 e 16 (14 e 16 dividem `StaffIdentifyFields`, `RedatorIdentityFields`,
  `StudentIdentifyFields`, `EnrollStudentForm` e os barrels; 16 consome 15);
- 17, por último.

Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- **executor: claude.** O bloco toca três leis do §5: auditoria (as duas conversões de dado), tipos
  gerados e RBAC (permissão nova, matriz por papel). Também introduz um padrão novo, o mutator
  (D-P2). Não há task mecânica de paths fechados que compense o gate do Codex.
- **Sessão:** `/executar-bloco 60`, numa sessão aberta na lane, com o modelo e o esforço do
  frontmatter do command (`sonnet`, `medium`). As tasks 9, 10 e 15 são as de maior risco: se o
  João quiser opus nos implementadores, o caminho é `--max`.
- **Papéis (`.claude/papeis.md`):**
  - `implementador-mecanico`: tasks 4, 5 e 6.
  - `implementador-integracao`: tasks 2, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 e 17.
  - `revisor-task`: por task.
  - `re-revisor` e `corretor-tardio`: nas rodadas de correção.
  - `revisor-branch`: no fim.
  - A Task 1 não despacha ninguém: é o João rodando o script e a sessão conferindo.
- **paths_autorizados:** não se aplica (executor `claude`).
