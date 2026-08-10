# `certificacao-lote-e-snapshot` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar de comentário as quatro regras de ordenação/transação da emissão em lote e dar um
gate único ao "este snapshot é apresentável?", com cada rota declarando se degrada ou falha alto.

**Architecture:** o laço do lote vira `BatchIssueCertificatesAction` — deliberadamente **sem**
`DB::transaction`, porque cada `IssueCertificateAction::execute()` já é a própria transação. A
política de snapshot apresentável, hoje copiada em dois consumidores e ausente de outros dois, vira
`isPresentable()`/`assertPresentable()` no `CertificateSnapshotData`; `CertificateData` ganha
`snapshot_ok` para a listagem degradar, e `show` passa a falhar alto como `pdf` e a rota pública já
faziam.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit
(sqlite `:memory:`), React 19 + TS, vitest, PrimeReact via `shared/ui`, i18n em 3 locales.

**Spec:** `docs/superpowers/specs/2026-08-10-certificacao-lote-e-snapshot-design.md`

## Global Constraints

- **Branch:** `refactor/certificacao-lote-e-snapshot`, a partir de `main` (`eca31e4`).
  **Main tree, sem worktree** (P-03).
- **Zero schema.** Nenhuma migration. `git diff main...HEAD -- backend/database/` tem de ficar vazio.
- **Backend roda no container:** `docker compose exec -T app php artisan test …`.
  **Pint roda no host, de dentro de `backend/`, sempre com argumentos:**
  `cd backend && ./vendor/bin/pint <arquivos>` — nunca sem argumento.
- **`generated.ts` não se edita à mão** (CLAUDE.md §5.3). Só `php artisan typescript:transform`.
  A task que regenera ajusta os consumidores **no mesmo commit**.
- **Baseline a preservar:** backend **493 passed, 1 skipped (1833 assertions)**; frontend
  **13 arquivos / 47 testes**; `pnpm lint` e `pnpm build` verdes.
- **Vocabulário de usuário é es-CL.** Chave i18n nova entra nas **3** locales no mesmo commit
  (`frontend/src/shared/config/locales/parity.test.ts` reprova paridade quebrada).
- **Toda mudança de comportamento tem de estar na lista fechada do §5 da spec.** Se uma task
  produzir uma quinta, PARE e reporte — não é refactor.
- **Teste de regressão só vale visto reprovando contra o código antigo** (lição 10).

---

### Task 0: Baseline medido

**Files:** nenhum.

**Interfaces:**
- Consumes: nada.
- Produces: os números que as tasks seguintes usam como referência de regressão.

- [ ] **Step 1: Criar a branch**

```bash
git checkout -b refactor/certificacao-lote-e-snapshot
```

- [ ] **Step 2: Rodar a suíte backend inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 493 passed (1833 assertions)`. **Número diferente disso PARA o
bloco** — o baseline do plano deixou de valer e a divergência precisa de decisão do João antes de
qualquer edição.

- [ ] **Step 3: Rodar o frontend**

```bash
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: `Test Files 13 passed`, `Tests 47 passed`, lint sem saída, build sem erro de `tsc`.

- [ ] **Step 4: Confirmar que `generated.ts` está em dia antes de qualquer mudança**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: **sem diff**. Diff aqui significa que o arquivo já estava desatualizado no `main` — PARE
e reporte, porque a Task 4 não conseguiria distinguir o diff dela do herdado.

---

### Task 1: `ValidationMessages::squash()` e os dois adapters

**Files:**
- Create: `backend/app/Shared/Validation/ValidationMessages.php`
- Create: `backend/tests/Unit/Shared/ValidationMessagesTest.php`
- Modify: `backend/app/Domains/Operation/Actions/ImportStudentsAction.php:63`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:137`

**Interfaces:**
- Consumes: nada.
- Produces: `App\Shared\Validation\ValidationMessages::squash(ValidationException $e): string` —
  usado pela Task 2, que carrega o `catch` do lote para dentro do Action.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Unit/Shared/ValidationMessagesTest.php`:

```php
<?php

namespace Tests\Unit\Shared;

use App\Shared\Validation\ValidationMessages;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ValidationMessagesTest extends TestCase
{
    public function test_uma_mensagem_sai_igual_ao_texto_original(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => 'Ya existe un certificado vigente para esta matrícula.',
        ]);

        $this->assertSame(
            'Ya existe un certificado vigente para esta matrícula.',
            ValidationMessages::squash($e),
        );
    }

    /**
     * O ponto do seam: `->first()` escondia a segunda razão da recusa. Um
     * relatório de lote que nomeia só metade do motivo é pior que verboso —
     * o operador corrige o primeiro problema e o item falha de novo.
     */
    public function test_duas_mensagens_saem_unidas_por_um_espaco(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => 'La clase no está concluida.',
            'redator_id' => 'El redactor no está designado en esta clase.',
        ]);

        $this->assertSame(
            'La clase no está concluida. El redactor no está designado en esta clase.',
            ValidationMessages::squash($e),
        );
    }

    public function test_campo_com_duas_mensagens_tambem_achata(): void
    {
        $e = ValidationException::withMessages([
            'enrollment' => ['Primera razón.', 'Segunda razón.'],
        ]);

        $this->assertSame('Primera razón. Segunda razón.', ValidationMessages::squash($e));
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
docker compose exec -T app php artisan test --filter=ValidationMessagesTest
```

Esperado: FAIL com `Class "App\Shared\Validation\ValidationMessages" not found`.

- [ ] **Step 3: Escrever a classe**

Crie `backend/app/Shared/Validation/ValidationMessages.php`:

```php
<?php

namespace App\Shared\Validation;

use Illuminate\Validation\ValidationException;

/**
 * O achatamento de um `ValidationException` numa linha só, para relatórios que
 * mostram um item por linha e não têm onde pendurar um error-bag por campo —
 * a importação de alunos e o relatório da emissão em lote.
 *
 * `implode(' ')`, não `first()`: quando a recusa traz duas razões, mostrar só a
 * primeira faz o operador corrigir metade e falhar de novo. Quem tem lugar para
 * o error-bag inteiro (toda resposta 422 da API) NÃO passa por aqui — o handler
 * RFC 7807 continua carregando `errors` por campo.
 */
class ValidationMessages
{
    public static function squash(ValidationException $e): string
    {
        return collect($e->errors())->flatten()->implode(' ');
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=ValidationMessagesTest
```

Esperado: `Tests: 3 passed`.

- [ ] **Step 5: Migrar o adapter da importação (comportamento idêntico)**

Em `backend/app/Domains/Operation/Actions/ImportStudentsAction.php`, troque a linha 63:

```php
                    message: collect($e->errors())->flatten()->implode(' '),
```

por:

```php
                    message: ValidationMessages::squash($e),
```

e adicione o import no topo do arquivo, na ordem alfabética dos `use` existentes:

```php
use App\Shared\Validation\ValidationMessages;
```

- [ ] **Step 6: Migrar o adapter do lote (comportamento muda de propósito)**

Em `backend/app/Domains/Certification/Http/Controllers/CertificateController.php`, troque a
linha 137:

```php
                        error: collect($e->errors())->flatten()->first(),
```

por:

```php
                        error: ValidationMessages::squash($e),
```

e adicione o import:

```php
use App\Shared\Validation\ValidationMessages;
```

Esta é a mudança de comportamento nº 2 da lista fechada do §5 da spec. Hoje as seis portas lançam
uma mensagem cada, então a suíte não vê diferença — o teste do Step 1 é quem guarda a diferença.

- [ ] **Step 7: Rodar os dois consumidores e a suíte**

```bash
docker compose exec -T app php artisan test --filter="ImportStudents|BatchIssue|ValidationMessages"
docker compose exec -T app php artisan test
```

Esperado: os testes de importação e os **11** do `BatchIssueTest` passam **sem nenhuma edição**;
suíte em `1 skipped, 496 passed` (+3 do teste novo).

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Shared/Validation/ValidationMessages.php \
  app/Domains/Operation/Actions/ImportStudentsAction.php \
  app/Domains/Certification/Http/Controllers/CertificateController.php \
  tests/Unit/Shared/ValidationMessagesTest.php
```

Esperado: `PASS`, zero arquivo reescrito.

```bash
git add backend/app/Shared/Validation/ValidationMessages.php \
  backend/tests/Unit/Shared/ValidationMessagesTest.php \
  backend/app/Domains/Operation/Actions/ImportStudentsAction.php \
  backend/app/Domains/Certification/Http/Controllers/CertificateController.php
git commit -m "refactor(shared): achatamento de ValidationException num seam com dois adapters"
```

---

### Task 2: `BatchIssueCertificatesAction`

**Files:**
- Create: `backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:88-142`
- Test: `backend/tests/Feature/Certification/BatchIssueTest.php` (**não muda** — é o critério)

**Interfaces:**
- Consumes: `ValidationMessages::squash(ValidationException $e): string` (Task 1).
- Produces: `BatchIssueCertificatesAction::execute(BatchIssueData $data): array` — lista de
  `BatchIssueItemResultData`, mesma forma que o controller devolvia.

- [ ] **Step 1: Rodar o `BatchIssueTest` antes de tocar em nada**

```bash
docker compose exec -T app php artisan test --filter=BatchIssueTest
```

Esperado: `Tests: 11 passed`. Este número é o critério da task: refactor que exige editar teste de
comportamento não é refactor.

- [ ] **Step 2: Criar o Action com a lógica movida**

Crie `backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php`:

```php
<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Data\BatchIssueData;
use App\Domains\Certification\Data\BatchIssueItemResultData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Validation\ValidationException;

/**
 * Emissão em lote: um relatório por item, **sem transação externa**.
 *
 * Este Action é a exceção nomeada à regra "Action roda dentro de
 * `DB::transaction`" (`.claude/rules/backend-ddd.md`), e a ausência é a forma
 * da classe, não esquecimento:
 *
 * 1. Cada `IssueCertificateAction::execute()` já É a sua própria transação
 *    (seis portas + D9 + auditoria).
 * 2. Uma transação por fora faria um item falho reverter os que já tinham sido
 *    commitados — documento de peso legal desaparecendo em silêncio.
 * 3. Pior: reverteria o `INSERT` sem devolver o número de sequência, gastando
 *    um `LOT-ANO-SEQ` que nunca vira certificado.
 * 4. Por isso o `try` é POR ITEM, e toda recusa vira linha do relatório em vez
 *    de derrubar o request.
 *
 * Guarda viva disso: `BatchIssueTest::test_falha_inesperada_no_meio_do_lote_
 * preserva_o_que_ja_saiu` — envolver o laço abaixo num `DB::transaction` tem de
 * deixá-lo vermelho.
 */
class BatchIssueCertificatesAction
{
    public function __construct(private readonly IssueCertificateAction $issue) {}

    /** @return array<BatchIssueItemResultData> */
    public function execute(BatchIssueData $data): array
    {
        // Uma vez para o lote inteiro: o redator é o mesmo em todos os itens
        // (D11), e resolvê-lo por item custaria um SELECT por matrícula.
        $redator = Redator::query()->findOrFail($data->redator_id);

        return collect($data->enrollment_ids)
            ->map(fn (int $enrollmentId): BatchIssueItemResultData => $this->item($enrollmentId, $redator))
            ->all();
    }

    private function item(int $enrollmentId, Redator $redator): BatchIssueItemResultData
    {
        try {
            // Resolvida AQUI, dentro do try: `exists:enrollments,id` do DTO
            // consulta a tabela crua e não respeita soft delete, então um id
            // soft-deletado passa a validação e só falha aqui. Se isto
            // estourasse fora do try (como `findOrFail`), a
            // `ModelNotFoundException` subiria sem `catch`, virando 404 pro
            // request inteiro — escondendo itens anteriores já commitados (não
            // há transação externa). Por isso vira `ValidationException`: mesmo
            // formato de recusa das seis portas, capturado abaixo e reportado
            // como item, não como falha da requisição.
            $enrollment = Enrollment::query()->find($enrollmentId);

            if ($enrollment === null) {
                throw ValidationException::withMessages([
                    'enrollment' => 'La matrícula no existe.',
                ]);
            }

            $certificate = $this->issue->execute($enrollment, $redator);

            return new BatchIssueItemResultData(
                enrollment_id: $enrollmentId,
                ok: true,
                codigo: $certificate->codigo,
                certificate_id: $certificate->id,
                error: null,
            );
        } catch (ValidationException $e) {
            return new BatchIssueItemResultData(
                enrollment_id: $enrollmentId,
                ok: false,
                codigo: null,
                certificate_id: null,
                error: ValidationMessages::squash($e),
            );
        }
    }
}
```

- [ ] **Step 3: Encolher o controller**

Em `backend/app/Domains/Certification/Http/Controllers/CertificateController.php`, substitua o
docblock inteiro e o método `batch()` (linhas 88-142) por:

```php
    /** @return array<BatchIssueItemResultData> */
    public function batch(BatchIssueData $data, BatchIssueCertificatesAction $action): array
    {
        return $action->execute($data);
    }
```

Ajuste os `use` do arquivo: **adicione**
`use App\Domains\Certification\Actions\BatchIssueCertificatesAction;` e **remova** os que ficaram
sem type-hint no arquivo — `ValidationMessages` e `ValidationException`. Confira antes de remover:

```bash
grep -n "ValidationMessages\|ValidationException\|Redator\|Enrollment" \
  backend/app/Domains/Certification/Http/Controllers/CertificateController.php
```

`Redator` e `Enrollment` **ficam** (o `store()` ainda usa os dois). Import sem uso é reescrito pelo
`no_unused_imports` do Pint — deixá-lo é ruído, e o Pint o remove sozinho no Step 6.

- [ ] **Step 4: Rodar o `BatchIssueTest` sem tocar no arquivo de teste**

```bash
docker compose exec -T app php artisan test --filter=BatchIssueTest
```

Esperado: `Tests: 11 passed`, arquivo de teste com **zero** linhas de diff. Confirme:

```bash
git diff --stat backend/tests/Feature/Certification/BatchIssueTest.php
```

Esperado: sem saída. O `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu` continua
funcionando porque o `IssueCertificateAction` chega ao Action **pelo container**, e o
`$this->instance(...)` do teste continua sendo quem o entrega.

- [ ] **Step 5: Provar o mutante no novo endereço (lição 10)**

Envolva o `return collect(...)` do `execute()` numa transação, temporariamente:

```php
        return \Illuminate\Support\Facades\DB::transaction(fn () => collect($data->enrollment_ids)
            ->map(fn (int $enrollmentId): BatchIssueItemResultData => $this->item($enrollmentId, $redator))
            ->all());
```

```bash
docker compose exec -T app php artisan test --filter=test_falha_inesperada_no_meio_do_lote
```

Esperado: **FAIL** — `Failed asserting that table [certificates] matches expected entries count of
1. Entries found: 0.` Se passar verde, a guarda morreu na mudança de casa: **PARE e reporte**.

Desfaça o mutante e confirme a árvore limpa:

```bash
git diff backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php
```

Esperado: nenhuma linha de `DB::transaction` no diff final.

- [ ] **Step 6: Suíte, Pint e commit**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint app/Domains/Certification/Actions/BatchIssueCertificatesAction.php \
  app/Domains/Certification/Http/Controllers/CertificateController.php
```

Esperado: `1 skipped, 496 passed (1836 assertions)`; Pint `PASS`.

```bash
git add backend/app/Domains/Certification/Actions/BatchIssueCertificatesAction.php \
  backend/app/Domains/Certification/Http/Controllers/CertificateController.php
git commit -m "refactor(certification): lote vira Action com a ausencia de transacao explicita"
```

---

### Task 3: Gate único do snapshot

**Files:**
- Modify: `backend/app/Domains/Certification/Data/Snapshot/CertificateSnapshotData.php:80-92`
- Modify: `backend/app/Domains/Certification/Services/CertificatePdfService.php:22-30`
- Modify: `backend/app/Domains/Certification/Data/PublicCertificateData.php:31-41`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `CertificateSnapshotData::isPresentable(): bool` e
  `CertificateSnapshotData::assertPresentable(string $codigo): void` — a Task 4 consome o primeiro
  em `CertificateData::fromModel()` e o segundo no `show()`.

- [ ] **Step 1: Confirmar quem já prova o "falha alto" hoje**

```bash
docker compose exec -T app php artisan test --filter="CertificatePdfTest|PublicCertificateTest"
```

Esperado: verde. Estes arquivos já contêm as provas de 500 para PDF
(`CertificatePdfTest.php:398,416`) e para a rota pública (`PublicCertificateTest.php:184`). Eles
**não mudam** nesta task — são a regressão que prova que o gate único preservou a política.

- [ ] **Step 2: Trocar os três métodos no `CertificateSnapshotData`**

Em `backend/app/Domains/Certification/Data/Snapshot/CertificateSnapshotData.php`, substitua o
método `missingRequiredFields()` (linhas 72-92, docblock incluído) por:

```php
    /**
     * O documento pode ser apresentado? Companheiro booleano do
     * `assertPresentable()`, adjacente de propósito — mesmo par
     * pergunta/imposição do `CertificateEligibility` (B1). Quem lista usa este;
     * quem apresenta usa o outro.
     */
    public function isPresentable(): bool
    {
        return $this->missingRequiredFields() === [];
    }

    /**
     * A política de apresentação, num lugar só. Era copiada no
     * `CertificatePdfService` e no `PublicCertificateData` — dois consumidores
     * com a chance de divergir sobre o que é um documento apresentável.
     */
    public function assertPresentable(string $codigo): void
    {
        $missing = $this->missingRequiredFields();

        if ($missing !== []) {
            throw CorruptedSnapshotException::missingFields($codigo, $missing);
        }
    }

    /**
     * Os campos que um certificado não pode apresentar em branco: quem, o quê
     * e quem atesta. Vazio aqui não é ausência tolerável de campo novo — é
     * snapshot corrompido, e a leitura tolerante não pode disfarçá-lo de
     * documento válido.
     *
     * Privado: fora daqui ninguém precisa da LISTA, só do sim/não
     * (`isPresentable`) ou da recusa (`assertPresentable`); a lista continua
     * viva na mensagem da exceção, que é onde o suporte a lê.
     *
     * @return list<string>
     */
    private function missingRequiredFields(): array
    {
        $required = [
            'aluno.name' => $this->aluno->name,
            'curso.name' => $this->curso->name,
            'emissor.name' => $this->emissor->name,
        ];

        return array_keys(array_filter(
            $required,
            fn (string $value) => trim($value) === '',
        ));
    }
```

Adicione o import no topo do arquivo:

```php
use App\Domains\Certification\Exceptions\CorruptedSnapshotException;
```

- [ ] **Step 3: Ver a suíte reprovar por consumidor órfão**

```bash
docker compose exec -T app php artisan test --filter="CertificatePdfTest|PublicCertificateTest"
```

Esperado: FAIL com `Call to private method
App\Domains\Certification\Data\Snapshot\CertificateSnapshotData::missingRequiredFields()`. É a
prova de que os dois consumidores realmente carregavam a política.

- [ ] **Step 4: Migrar o `CertificatePdfService`**

Em `backend/app/Domains/Certification/Services/CertificatePdfService.php`, troque as linhas 24-30:

```php
        $missing = $certificate->snapshot->missingRequiredFields();

        // Um certificado com o nome do aluno em branco não é um certificado
        // incompleto — é um documento que atesta o que ninguém sabe.
        if ($missing !== []) {
            throw CorruptedSnapshotException::missingFields($certificate->codigo, $missing);
        }
```

por:

```php
        // Um certificado com o nome do aluno em branco não é um certificado
        // incompleto — é um documento que atesta o que ninguém sabe.
        $certificate->snapshot->assertPresentable($certificate->codigo);
```

O `use App\Domains\Certification\Exceptions\CorruptedSnapshotException;` fica sem type-hint no
arquivo e sai (o Pint o removeria de qualquer forma) — remova-o no mesmo passe.

- [ ] **Step 5: Migrar o `PublicCertificateData`**

Em `backend/app/Domains/Certification/Data/PublicCertificateData.php`, troque as linhas 33-40:

```php
        $snapshot = $certificate->snapshot;
        $missing = $snapshot->missingRequiredFields();

        // A rota do QR é o que o fiscalizador abre no celular. Responder 200
        // com nome em branco e `status: emitido` é pior que falhar.
        if ($missing !== []) {
            throw CorruptedSnapshotException::missingFields($certificate->codigo, $missing);
        }
```

por:

```php
        $snapshot = $certificate->snapshot;

        // A rota do QR é o que o fiscalizador abre no celular. Responder 200
        // com nome em branco e `status: emitido` é pior que falhar.
        $snapshot->assertPresentable($certificate->codigo);
```

Remova também o `use App\Domains\Certification\Exceptions\CorruptedSnapshotException;`, que fica sem
uso.

- [ ] **Step 6: Rodar e ver voltar ao verde**

```bash
docker compose exec -T app php artisan test --filter="CertificatePdfTest|PublicCertificateTest|CertificateSnapshotTest"
docker compose exec -T app php artisan test
```

Esperado: verde nos três arquivos, sem uma linha editada neles; suíte em
`1 skipped, 496 passed (1836 assertions)`.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Data/Snapshot/CertificateSnapshotData.php \
  app/Domains/Certification/Services/CertificatePdfService.php \
  app/Domains/Certification/Data/PublicCertificateData.php
```

```bash
git add backend/app/Domains/Certification/Data/Snapshot/CertificateSnapshotData.php \
  backend/app/Domains/Certification/Services/CertificatePdfService.php \
  backend/app/Domains/Certification/Data/PublicCertificateData.php
git commit -m "refactor(certification): politica de snapshot apresentavel num gate unico"
```

---

### Task 4: `snapshot_ok`, `show` falhando alto e o `generated.ts`

**Files:**
- Modify: `backend/app/Domains/Certification/Data/CertificateData.php`
- Modify: `backend/app/Domains/Certification/Http/Controllers/CertificateController.php:46-49`
- Modify: `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php:7-16`
- Modify: `backend/tests/Feature/Certification/CertificateListingTest.php` (2 testes novos)
- Modify: `frontend/src/shared/types/generated.ts` (**só por `typescript:transform`**)

**Interfaces:**
- Consumes: `CertificateSnapshotData::isPresentable()` e `::assertPresentable(string)` (Task 3).
- Produces: `CertificateData.snapshot_ok: boolean` no contrato TS — consumido pela Task 5.

- [ ] **Step 1: Escrever os dois testes que falham**

Em `backend/tests/Feature/Certification/CertificateListingTest.php`, adicione os dois métodos
**depois** de `test_show_devolve_o_snapshot_persistido()` (por volta da linha 104):

```php
    /**
     * A listagem é a exceção deliberada ao "falhar alto": um registro
     * corrompido não pode derrubar a tabela inteira de quem só quer ver o
     * histórico. Ela marca a linha e segue.
     */
    public function test_index_marca_o_snapshot_corrompido_sem_derrubar_a_listagem(): void
    {
        $this->actingAsAdmin();
        $sao = $this->createCertificate(CertificateStatus::Emitido, 'LOT-2026-1000');

        Carbon::setTestNow('2026-08-05 11:00:00');
        $corrompido = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1001',
            ['aluno' => ['name' => '']],
        );

        $this->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $corrompido->id)
            ->assertJsonPath('0.snapshot_ok', false)
            ->assertJsonPath('1.id', $sao->id)
            ->assertJsonPath('1.snapshot_ok', true);
    }

    /**
     * `show` alimenta a tela de detalhe do certificado. Devolver 200 com
     * `aluno.name: ""` ali é a mesma prova falsa que a rota pública e o PDF já
     * recusam — documento de peso legal não atesta o que não sabe.
     */
    public function test_show_de_snapshot_corrompido_falha_alto(): void
    {
        $this->actingAsAdmin();
        $certificate = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1002',
            ['aluno' => ['name' => '']],
        );

        $this->getJson("/api/certificates/{$certificate->id}")->assertStatus(500);
    }
```

- [ ] **Step 2: Rodar e ver reprovar pelos dois motivos certos**

```bash
docker compose exec -T app php artisan test --filter="test_index_marca_o_snapshot_corrompido|test_show_de_snapshot_corrompido"
```

Esperado: **2 failed** — o primeiro por `Property [snapshot_ok] does not exist` no JSON, o segundo
por receber **200** onde espera 500. Se o segundo já passar, o `show` não é o que a spec mediu:
PARE e reporte.

- [ ] **Step 3: Adicionar `snapshot_ok` ao DTO**

Em `backend/app/Domains/Certification/Data/CertificateData.php`, adicione a propriedade logo depois
de `$snapshot` no construtor:

```php
        public CertificateSnapshotData $snapshot,
        public bool $snapshot_ok,
        public string $created_at,
```

e no `fromModel()`, na mesma posição:

```php
            snapshot: $certificate->snapshot,
            snapshot_ok: $certificate->snapshot->isPresentable(),
            created_at: $certificate->created_at->toISOString(),
```

Adicione o docblock da classe, acima de `class CertificateData extends Data`:

```php
/**
 * `snapshot_ok` diz se o documento é APRESENTÁVEL, não se ele existe —
 * `snapshot` continua não-nulo e continua sendo a leitura tolerante do JSON
 * congelado. Só a listagem consome o campo: `show`, `pdf` e a rota pública do
 * QR recusam o documento corrompido antes de projetá-lo.
 */
```

- [ ] **Step 4: Fazer o `show` falhar alto**

Em `backend/app/Domains/Certification/Http/Controllers/CertificateController.php`, troque o método
`show()`:

```php
    public function show(Certificate $certificate): CertificateData
    {
        // A listagem degrada marcando a linha; o detalhe, não. Aqui o
        // documento é apresentado por inteiro, e apresentar um snapshot sem
        // nome de aluno é atestar o que ninguém sabe.
        $certificate->snapshot->assertPresentable($certificate->codigo);

        return CertificateData::fromModel($certificate);
    }
```

`store()` e `revoke()` **não mudam** — o certificado do `store` já está commitado quando o DTO é
montado (um 500 ali esconderia um 201 que aconteceu), e `revoke` não lê o documento. Está no §4.4 da
spec; alterá-los seria uma quinta mudança de comportamento.

- [ ] **Step 5: Reescrever o docblock do `CorruptedSnapshotException`**

Em `backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php`, substitua o
docblock da classe (linhas 7-16) por:

```php
/**
 * O snapshot congelado não tem o que um certificado precisa nomear. Sobe ao
 * handler global RFC 7807 como 500 — o documento não é apresentado nem
 * impresso.
 *
 * Falhar alto é a escolha deliberada em `show`, no PDF e na rota pública do
 * QR: a alternativa era responder 200 com `aluno.name: ""` e
 * `status: emitido`, ou imprimir a linha do nome em branco. Documento de peso
 * legal não atesta o que não sabe; um erro visível vira chamado e conserto, um
 * nome vazio vira prova falsa.
 *
 * **A listagem é a exceção deliberada, e é a única.** `GET /api/certificates`
 * não estoura: um registro corrompido não pode derrubar o histórico inteiro de
 * quem foi só consultar. Ela projeta `CertificateData::$snapshot_ok = false` e
 * a tabela marca a linha, sem afirmar um estado que o documento não sustenta.
 */
```

- [ ] **Step 6: Rodar os dois testes e a suíte**

```bash
docker compose exec -T app php artisan test --filter=CertificateListingTest
docker compose exec -T app php artisan test
```

Esperado: `CertificateListingTest` com **11 passed** (9 + 2 novos); suíte em
`1 skipped, 498 passed`.

- [ ] **Step 7: Regenerar `generated.ts` e conferir o diff esperado**

```bash
docker compose exec -T app php artisan typescript:transform
git diff frontend/src/shared/types/generated.ts
```

Esperado: **exatamente uma linha adicionada** — `snapshot_ok: boolean;` dentro de
`CertificateData`. Qualquer outra mudança no arquivo é diff herdado ou efeito colateral não
previsto: PARE e reporte.

- [ ] **Step 8: Confirmar que nenhum consumidor TS quebrou**

```bash
cd frontend && pnpm build
```

Esperado: verde. Campo obrigatório novo só quebra quem **constrói** o literal, e foi medido que
nenhum teste constrói `CertificateData` (o único literal de fixture do módulo é
`PublicCertificateData`, em `useValidationPage.test.tsx`, que não muda). Build vermelho aqui
significa consumidor não previsto — corrija **nesta task**, porque a rule
`generated-types.md` proíbe deixar consumidor quebrado para a task seguinte.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Data/CertificateData.php \
  app/Domains/Certification/Http/Controllers/CertificateController.php \
  app/Domains/Certification/Exceptions/CorruptedSnapshotException.php \
  tests/Feature/Certification/CertificateListingTest.php
```

```bash
git add backend/app/Domains/Certification/Data/CertificateData.php \
  backend/app/Domains/Certification/Http/Controllers/CertificateController.php \
  backend/app/Domains/Certification/Exceptions/CorruptedSnapshotException.php \
  backend/tests/Feature/Certification/CertificateListingTest.php \
  frontend/src/shared/types/generated.ts
git commit -m "feat(certification): listagem degrada com snapshot_ok e show falha alto"
```

---

### Task 5: A tag da linha corrompida no Historial

**Files:**
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:71-76`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `CertificateData.snapshot_ok: boolean` (Task 4).
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Adicionar a chave nas 3 locales**

Dentro do bloco `"certificate"` de cada arquivo, adicione a chave `snapshotCorrupted` (mantenha o
bloco `"status"` intocado — corrompido **não** é um status):

`frontend/src/shared/config/locales/es-CL.json`:

```json
    "snapshotCorrupted": "Documento corrupto",
```

`frontend/src/shared/config/locales/pt-BR.json`:

```json
    "snapshotCorrupted": "Documento corrompido",
```

`frontend/src/shared/config/locales/en.json`:

```json
    "snapshotCorrupted": "Corrupted document",
```

- [ ] **Step 2: Rodar o teste de paridade**

```bash
cd frontend && pnpm test -- parity
```

Esperado: verde. Vermelho aqui = chave em menos de 3 locales.

- [ ] **Step 3: Ramificar a coluna Estado**

Em `frontend/src/features/certification/components/Historial/HistorialTable.tsx`, troque a coluna
de estado (linhas 71-76):

```tsx
        <AppColumn
          header={t('certificate.colStatus')}
          body={(c: CertificateData) => (
            <AppTag severity={STATUS_SEVERITY[certStatus(c)]} value={t(`certificate.status.${certStatus(c)}`)} />
          )}
        />
```

por:

```tsx
        <AppColumn
          header={t('certificate.colStatus')}
          // Documento corrompido não tem estado a afirmar: `certStatus` derivaria
          // "vigente" das datas, que continuam válidas, sobre um snapshot que não
          // sustenta nem o nome do aluno. A tag de defeito ocupa o lugar da de
          // estado, e NÃO vira um quinto `CertDerivedStatus` — isso contaminaria
          // o filtro, os contadores do rodapé e o `CertificateViewDialog`.
          body={(c: CertificateData) =>
            c.snapshot_ok ? (
              <AppTag severity={STATUS_SEVERITY[certStatus(c)]} value={t(`certificate.status.${certStatus(c)}`)} />
            ) : (
              <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
            )
          }
        />
```

O botão **Ver** da coluna de ações **não muda** (D8): clicar num corrompido cai no estado de erro do
`CertificateViewDialog`, que já tem mensagem e Reintentar, e é onde o suporte lê quais campos
faltam.

- [ ] **Step 4: Rodar lint, build e testes**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: lint sem saída, build verde, `Test Files 13 passed`, `Tests 47 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/certification/components/Historial/HistorialTable.tsx \
  frontend/src/shared/config/locales/es-CL.json \
  frontend/src/shared/config/locales/pt-BR.json \
  frontend/src/shared/config/locales/en.json
git commit -m "feat(certification): historial marca a linha de snapshot corrompido"
```

---

### Task 6: Gate do bloco

**Files:** nenhum de produção. Só evidência.

**Interfaces:**
- Consumes: tudo.
- Produces: a evidência que o `/revisar-sprint` herda.

> Este gate prova **comportamento contra a API real**, não a suíte (lição 12). Sessão Sanctum por
> cookie + CSRF: `Origin: http://localhost:5173` e `Accept: application/json` são obrigatórios, e o
> `XSRF-TOKEN` **rotaciona no login** — reextraia do cookie jar depois do `POST /api/login`.

- [ ] **Step 1: Ferramentas**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm test && pnpm lint && pnpm build
```

Esperado: backend `1 skipped, 498 passed`; frontend 13 arquivos / 47 testes, lint e build verdes.

- [ ] **Step 2: Pint em todos os `.php` vivos do bloco**

```bash
cd backend && ./vendor/bin/pint --test $(git diff --name-only main...HEAD -- '*.php' | sed 's|^backend/||')
```

Esperado: `PASS`. Se a lista vier vazia, o `--test` sem argumento varreria o repositório inteiro —
guarde contra isso conferindo a lista antes (lição 9).

- [ ] **Step 3: `generated.ts` e schema**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
git diff --stat main...HEAD -- backend/database/
```

Esperado: `generated.ts` **sem diff** depois do commit da Task 4 (regenerar de novo não muda nada);
`backend/database/` **vazio**.

- [ ] **Step 4: Banco limpo e sessão**

```bash
docker compose exec -T app php artisan migrate:fresh --seed
```

Depois faça login como admin (`GET /sanctum/csrf-cookie` → `POST /api/login`), reextraindo o
`XSRF-TOKEN` do cookie jar.

- [ ] **Step 5: O lote, contra a API real**

Destrave a turma pelas portas (crie o template do curso pela própria API e ponha
`layout_config.city`, como o gate de 2026-08-08 fez), depois emita em lote com uma falha provocada
(uma das matrículas já com certificado vigente).

Esperado: **200** com relatório por item; os emitidos com códigos **contíguos**; o item falho
**nomeado** (`Ya existe un certificado vigente para esta matrícula.`) e **sem consumir número** de
sequência. `enrollment_ids` com id repetido → **422**.

- [ ] **Step 6: As quatro rotas sobre um snapshot corrompido**

Corrompa o `aluno.name` de UM certificado direto na coluna (`UPDATE certificates SET snapshot = …`,
com o resto do JSON intacto), e exercite:

| Chamada | Esperado |
|---|---|
| `GET /api/certificates` | **200**, `snapshot_ok: false` só na linha corrompida |
| `GET /api/certificates/{id}` do corrompido | **500** RFC 7807 nomeando o código |
| `GET /api/certificates/{id}/pdf` do corrompido | **500** |
| `GET /api/publico/certificados/{uuid}` do corrompido (sem cookie) | **500** |
| `GET /api/certificates/{id}` de um são | **200** com `snapshot_ok: true` |
| `GET /api/certificates/{id}/pdf` de um são | **200 `application/pdf`** |

- [ ] **Step 7: Registrar a limitação da prova visual**

A tag da linha corrompida **não foi vista renderizada** — o host WSL não tem browser utilizável
(Playwright sem as libs de sistema, limitação herdada de 2026-08-08). Registre isso na evidência do
gate, sem maquiagem: a prova é o `snapshot_ok` na API real, o build/lint e a paridade das locales; o
checkpoint visual fica com o João.

- [ ] **Step 8: Fechar a execução**

Atualize `docs/superpowers/state.md` para `ready_for_review` com a evidência acima, e commite junto
com a atualização do ledger, se houver.

---

## Desvios contra a spec aprovada

Achados **na escrita do plano**, medidos no repositório, declarados aqui em vez de silenciados
(lição 13):

- **D-P1 — a "fixture única serve quatro provas" já tem metade construída.** O §6 da spec descreve
  quatro comportamentos a provar sobre um certificado corrompido. Medido: **dois já são testes
  vivos** — `CertificatePdfTest.php:398,416` (PDF em 500) e `PublicCertificateTest.php:184` (rota
  pública em 500). O plano cria **dois** testes (`index` marcando, `show` em 500) e trata os dois
  existentes como regressão que tem de continuar verde **sem edição** — duplicá-los seria cobertura
  falsa. As quatro provas continuam existindo; duas já existiam.
- **D-P2 — o guard do lote sobrevive à mudança de casa por construção, e isso foi conferido, não
  suposto.** `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu` injeta o dublê com
  `$this->instance(IssueCertificateAction::class, $fake)`; como o `BatchIssueCertificatesAction`
  recebe o `IssueCertificateAction` **pelo construtor, do container**, o dublê continua chegando.
  Por isso o arquivo de teste tem zero linhas de diff, e o Step 5 da Task 2 reprova o mutante no
  endereço novo.
- **D-P3 — `App\Shared\Validation` não cria aresta na matriz de domínios.** O
  `DomainDependencyTest` governa só `App\Domains\* → App\Domains\*` (Regras A e B); `App\Shared\*` é
  transversal e já é importado por domínios (precedente: `App\Shared\Data\ContratanteData`, B4).
  Nenhuma linha da matriz muda, e Operation e Certification podem consumir o mesmo seam.
- **D-P4 — o teste de `squash()` precisa do container, apesar de ser unitário.**
  `ValidationException::withMessages()` monta um validador pela facade, então o arquivo estende
  `Tests\TestCase` (Laravel) e não o `PHPUnit\Framework\TestCase` do vizinho `RutTest`. Sem
  `RefreshDatabase` — nada toca banco.

## Handoff de execução

**`executor: claude`**

O bloco toca lei do §5 (`generated.ts`, §5.3), documento de peso legal e a rota pública do QR, e a
Task 2 depende de julgamento sobre o que **não** pode mudar no arquivo de teste. Não é trabalho
mecânico de path fechado.

Review declarado **ALTO RISCO** na spec: quando o bloco chegar em `ready_for_review`, duas frentes
— lente Claude com o gabarito do projeto + Codex read-only sobre o intervalo do bloco.
