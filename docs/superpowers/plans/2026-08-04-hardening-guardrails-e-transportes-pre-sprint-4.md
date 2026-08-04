# Hardening · guardrails e transportes pré-Sprint 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar dois guardrails (posse em rota nested, paridade de locales) e duas extrações de transporte (DTO sem service locator, helper multipart), sem alterar nenhum comportamento observável do produto.

**Architecture:** dois mecanismos novos leem o estado do repositório e reprovam quando ele degrada — um teste PHPUnit sobre a coleção de rotas do Laravel, um teste vitest sobre os três JSON de locale. As duas extrações trocam `app()` por injeção explícita num DTO piloto e concentram a montagem de `FormData` num helper único de `shared/api/`.

**Tech Stack:** Laravel 13.8 / PHP 8.3 (PHPUnit, sem Pest) · React 19 + TS · vitest 4 (jsdom) · axios · TanStack Query.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-04-hardening-guardrails-e-transportes-pre-sprint-4-design.md`. Toda decisão citada como `D<n>` vive lá.
- **Backend roda no container:** `docker compose exec -T app php artisan test`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, sempre com os arquivos como argumento** — nunca sem argumento (lição 9).
- **Branch no main tree, sem worktree** (D1, pendência P-03).
- **Nenhum comportamento observável muda.** Todo endpoint que devolvia 404 continua devolvendo 404; nenhum campo de resposta muda de nome, tipo ou presença; nenhuma chave de i18n é criada, removida ou renomeada.
- **`generated.ts` não é editado à mão** (lei §5.3). Nenhum DTO muda de forma neste bloco, então não há `typescript:transform` a rodar — se algum diff aparecer nele, **PARE**.
- **Guardrail só vale visto reprovando** (lição 10), e **pelo motivo certo**. Falha pelo motivo errado é `BLOCKED`, não prova.
- **Sonda temporária sempre sai**, e a árvore fica limpa (`git status --short` sem saída).
- **Mensagens de commit em português**, tipo convencional, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/tests/Feature/Shared/NestedRouteOwnershipTest.php` | Guardrail: toda rota com ≥2 bindings de model declara escopo explicitamente |
| `frontend/src/shared/api/postMultipart.ts` | Único ponto que monta `FormData` e faz POST multipart |
| `frontend/src/shared/api/postMultipart.test.ts` | Guarda o contrato do helper (D13b) |
| `frontend/src/shared/config/locales/parity.test.ts` | Guardrail: as 3 locales têm exatamente o mesmo conjunto de chaves |

**Modificados:**

| Arquivo | Mudança |
|---|---|
| `backend/app/Domains/Commercial/routes.php` | `->scopeBindings()` em 2 rotas de arquivo |
| `backend/app/Domains/Identity/routes.php` | `->scopeBindings()` na rota de documento de redator |
| `backend/app/Domains/Operation/routes.php` | `->withoutScopedBindings()` + motivo nas 2 rotas N:N de redator |
| `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php` | remove `abort_unless` |
| `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php` | remove `abort_unless` |
| `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php` | remove `abort_unless` |
| `backend/app/Domains/Commercial/Data/BudgetData.php` | `fromModel` recebe o serviço por parâmetro |
| `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php` | injeta `BudgetSummaryService` nos 4 métodos |
| `frontend/src/shared/api/photoResource.ts` | adota `postMultipart` |
| `frontend/src/features/operation/api/useTurmaDocuments.ts` | adota `postMultipart` |
| `frontend/src/features/operation/api/useImportStudents.ts` | adota `postMultipart` |
| `frontend/src/features/commercial/api/useCommercialFiles.ts` | adota `postMultipart` (2 pontos) |
| `frontend/src/features/identity/api/useRedatorDocuments.ts` | adota `postMultipart` |

**Intocados de propósito:** `frontend/src/features/identity/hooks/useRedatorForm.ts` (D11), todas as mutations de `delete` (D11b), `backend/app/Domains/Operation/Data/TurmaData.php` (D8), os 6 DTOs da família 2 (D10), `backend/tests/Feature/Identity/PermissionI18nParityTest.php` (D13).

---

## Task 0: Branch

**Files:** nenhum arquivo alterado.

- [ ] **Step 1: Confirmar árvore limpa e partir do `main` atualizado**

```bash
cd /home/jvbat/projetos/lotus
git status --short
git rev-parse --abbrev-ref HEAD
```

Expected: `git status --short` sem saída; branch `main`. Se houver qualquer saída, **PARE** — o João edita o working tree ao vivo e o WIP dele é intocável (lição 9).

- [ ] **Step 2: Criar a branch**

```bash
git checkout -b hardening/guardrails-e-transportes
git rev-parse --abbrev-ref HEAD
```

Expected: `hardening/guardrails-e-transportes`.

- [ ] **Step 3: Registrar a baseline da suíte, para comparar no gate**

```bash
docker compose up -d
docker compose exec -T app php artisan test 2>&1 | tail -5
cd frontend && pnpm test 2>&1 | tail -5
```

Expected: backend `375 passed (1365 assertions)`; frontend `14 passed`. **Anote os números.** Se divergirem da baseline, **PARE e reporte** — a baseline do plano está errada e o gate não terá referência.

---

## Task 1: H.3.1 — guardrail de posse em rota nested

**Files:**
- Create: `backend/tests/Feature/Shared/NestedRouteOwnershipTest.php`
- Modify: `backend/app/Domains/Commercial/routes.php:40,45`
- Modify: `backend/app/Domains/Identity/routes.php:41`
- Modify: `backend/app/Domains/Operation/routes.php:16-17`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php:31-41`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php:31-41`
- Modify: `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php:36-46`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: nada consumido por tasks posteriores. Task independente.

**Contexto medido (não redescubra):** são **6 URI patterns / 7 rotas** com ≥2 parâmetros tipados como `Model`. Duas já declaram `->scopeBindings()`. Cinco não declaram nada: as 3 de arquivo (que hoje checam por `abort_unless` no controller) e as 2 da relação N:N de redator (POST e DELETE do mesmo padrão).

**Regra de parada:** se no Step 2 o teste listar rotas **diferentes** dessas 5, **PARE e reporte**. Rota a mais significa que a medição da spec deixou passar um caso, e classificá-la é decisão do João — não a declare por conta própria.

- [ ] **Step 1: Escrever o guardrail**

Crie `backend/tests/Feature/Shared/NestedRouteOwnershipTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Posse em rota nested era instrução espalhada: duas rotas usavam
 * `->scopeBindings()`, três checavam `abort_unless` no controller, e nada
 * impedia a próxima de nascer sem nenhum dos dois. Este teste é a fonte única.
 *
 * A assertiva é sobre a DECLARAÇÃO, não sobre o texto do controller: toda rota
 * com dois ou mais bindings de model declara `scopeBindings()` **ou**
 * `withoutScopedBindings()`. Silêncio reprova — que é o ponto. Uma allowlist
 * dentro do teste envelheceria longe da rota; a declaração é lida por quem
 * edita a rota.
 *
 * Os parâmetros vêm de `signatureParameters(['subClass' => Model::class])`, a
 * assinatura tipada do controller — não de regex sobre a URI. Regex erraria nos
 * dois sentidos: `{file}` não diz que é model, e `users/{user}/photo` tem um
 * binding só apesar de parecer nested.
 */
class NestedRouteOwnershipTest extends TestCase
{
    public function test_toda_rota_com_dois_bindings_de_model_declara_escopo(): void
    {
        $indefinidas = [];

        foreach (Route::getRoutes() as $route) {
            $models = $route->signatureParameters(['subClass' => Model::class]);

            if (count($models) < 2) {
                continue;
            }

            if ($route->enforcesScopedBindings() || $route->preventsScopedBindings()) {
                continue;
            }

            $indefinidas[] = implode('|', $route->methods()).' '.$route->uri();
        }

        sort($indefinidas);

        $this->assertSame(
            [],
            $indefinidas,
            "Rota com dois ou mais bindings de model sem declarar escopo de posse.\n".
            "Declare `->scopeBindings()` quando o filho pertence ao pai, ou\n".
            "`->withoutScopedBindings()` com o motivo em comentário quando não pertence.\n".
            'Rotas: '.implode(', ', $indefinidas),
        );
    }
}
```

- [ ] **Step 2: Rodar e ver reprovar, conferindo QUAIS rotas aparecem**

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Expected: FAIL. A lista deve conter **exatamente** estas 5 entradas (a ordem é alfabética por `sort`):

```
DELETE api/budgets/{budget}/files/{file}
DELETE api/quotes/{quote}/files/{file}
DELETE api/redatores/{redator}/documents/{document}
DELETE api/turmas/{turma}/redatores/{redator}
POST api/turmas/{turma}/redatores/{redator}
```

Rota diferente ou a mais → **PARE** (regra de parada acima).

- [ ] **Step 3: Declarar escopo nas 3 rotas de arquivo**

Em `backend/app/Domains/Commercial/routes.php`, linha 40 — de:

```php
        Route::delete('budgets/{budget}/files/{file}', [BudgetFileController::class, 'destroy']);
```

para:

```php
        Route::delete('budgets/{budget}/files/{file}', [BudgetFileController::class, 'destroy'])
            ->scopeBindings();   // {file} resolve por $budget->files() — cross-budget = 404
```

Linha 45 — de:

```php
        Route::delete('quotes/{quote}/files/{file}', [QuoteFileController::class, 'destroy']);
```

para:

```php
        Route::delete('quotes/{quote}/files/{file}', [QuoteFileController::class, 'destroy'])
            ->scopeBindings();   // {file} resolve por $quote->files() — cross-quote = 404
```

Em `backend/app/Domains/Identity/routes.php`, linha 41 — de:

```php
        Route::delete('redatores/{redator}/documents/{document}', [RedatorDocumentController::class, 'destroy']);
```

para:

```php
        Route::delete('redatores/{redator}/documents/{document}', [RedatorDocumentController::class, 'destroy'])
            ->scopeBindings();   // {document} resolve por $redator->documents() — cross-redator = 404
```

- [ ] **Step 4: Declarar a isenção nas 2 rotas N:N**

Em `backend/app/Domains/Operation/routes.php`, linhas 16-17 — de:

```php
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator']);
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator']);
```

para:

```php
    // Redator NÃO pertence à turma: a relação é N:N (`turma_redator`). Não há
    // posse a checar, e `scopeBindings` tentaria resolver `$turma->redator()`,
    // que não existe. A isenção é explícita porque o guardrail
    // (NestedRouteOwnershipTest) reprova rota que não declara nem uma nem outra.
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator'])
        ->withoutScopedBindings();
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator'])
        ->withoutScopedBindings();
```

- [ ] **Step 5: Rodar o guardrail e ver passar**

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Expected: PASS (1 test).

- [ ] **Step 6: Remover os 3 `abort_unless`, agora redundantes**

Em `backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php`, substitua o método `destroy` inteiro por:

```php
    public function destroy(Budget $budget, File $file): Response
    {
        // Posse garantida pelo `->scopeBindings()` da rota: o {file} é resolvido
        // por $budget->files(), então arquivo de outro budget — ou de outro
        // fileable_type — nunca chega aqui (404 no binding).
        $file->delete();

        return response()->noContent();
    }
```

Em `backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php`, substitua o método `destroy` inteiro por:

```php
    public function destroy(Quote $quote, File $file): Response
    {
        // Posse garantida pelo `->scopeBindings()` da rota: o {file} é resolvido
        // por $quote->files(), então arquivo de outra cotação — ou de outro
        // fileable_type — nunca chega aqui (404 no binding).
        $file->delete();

        return response()->noContent();
    }
```

Em `backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php`, substitua o método `destroy` inteiro por:

```php
    public function destroy(Redator $redator, File $document): Response
    {
        // Posse garantida pelo `->scopeBindings()` da rota: o {document} é
        // resolvido por $redator->documents(), então documento de outro redator
        // nunca chega aqui (404 no binding).
        $document->delete();

        return response()->noContent();
    }
```

- [ ] **Step 7: Rodar os testes de regressão que provam o 404 cross-pai**

Estes testes já existiam e são a rede que prova que a troca de mecanismo não afrouxou nada.

```bash
docker compose exec -T app php artisan test --filter=CommercialFilesTest
docker compose exec -T app php artisan test --filter=RedatorDocumentTest
docker compose exec -T app php artisan test --filter=UploadSizeLimitTest
```

Expected: todos PASS. Em especial `test_delete_cross_tipo_arquivo_de_budget_pela_rota_de_quote_404` (arquivo de budget pela rota de quote → 404 **pelo tipo**) e `test_remove_documento_de_outro_redator_da_404_e_nao_apaga`. Qualquer um vermelho aqui significa que a relação usada pelo `scopeBindings` não filtra o que o `abort_unless` filtrava → **PARE e reporte**.

- [ ] **Step 8: Suíte completa**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Expected: `376 passed` (375 da baseline + 1 do guardrail). Número diferente → **PARE**.

- [ ] **Step 9: Pint nos arquivos tocados**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/NestedRouteOwnershipTest.php app/Domains/Commercial/routes.php app/Domains/Identity/routes.php app/Domains/Operation/routes.php app/Domains/Commercial/Http/Controllers/BudgetFileController.php app/Domains/Commercial/Http/Controllers/QuoteFileController.php app/Domains/Identity/Http/Controllers/RedatorDocumentController.php
```

- [ ] **Step 10: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Shared/NestedRouteOwnershipTest.php backend/app/Domains/Commercial/routes.php backend/app/Domains/Identity/routes.php backend/app/Domains/Operation/routes.php backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php
git commit -m "$(cat <<'EOF'
test(arch): posse em rota nested vira declaração obrigatória

Das 7 rotas com dois bindings de model, 5 não declaravam escopo: 3 checavam
posse por abort_unless no controller e 2 são N:N de redator. O guardrail lê a
declaração da rota, não o texto do controller, e silêncio reprova — allowlist
envelheceria longe da rota.

Os 3 abort_unless viram ->scopeBindings() e saem dos controllers; a relação
MorphMany preserva o 404 pelo TIPO que o check manual fazia, provado pelos
testes cross-pai que já existiam. As 2 rotas N:N declaram
->withoutScopedBindings() com o motivo ao lado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: H.4.6 — `BudgetData` sem service locator (piloto)

**Files:**
- Modify: `backend/app/Domains/Commercial/Data/BudgetData.php:49-51`
- Modify: `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php:28-54`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `BudgetData::fromModel(Budget $budget, BudgetSummaryService $summary): self` — assinatura nova, com o serviço como **segundo parâmetro obrigatório**. Nenhuma task posterior a consome.

**Contexto medido:** `BudgetData::fromModel` tem exatamente 4 call sites, todos em `BudgetController` (`index`, `store`, `show`, `update`). Nenhum outro arquivo a chama — conferido, sem cascata.

- [ ] **Step 1: Ver o teste de orçamento passando ANTES, para ter referência**

```bash
docker compose exec -T app php artisan test --filter=Comercial 2>&1 | tail -5
```

Expected: PASS. **Anote o número de testes.** Este é o critério: a mudança é de construção, não de comportamento, então o mesmo conjunto tem de continuar verde sem edição.

- [ ] **Step 2: Trocar o service locator por parâmetro no `BudgetData`**

Em `backend/app/Domains/Commercial/Data/BudgetData.php`, substitua o método `fromModel` inteiro por:

```php
    /**
     * O serviço entra por parâmetro, não por `app()`: quem constrói o DTO é o
     * controller, que já recebe dependência por injeção de método. Piloto da
     * H.4.6 — a família de DTOs que assina URL (`photo_url`, `download_url`)
     * segue com o container de propósito (spec D10).
     */
    public static function fromModel(Budget $budget, BudgetSummaryService $summary): self
    {
        return new self(
            id: $budget->id,
            client_id: $budget->client_id,
            code: $budget->code,
            status: $summary->status($budget),
            total_value_uf: $summary->totalValueUf($budget),
            total_approved_uf: $summary->totalApprovedUf($budget),
            total_rejected_uf: $summary->totalRejectedUf($budget),
            total_students: $summary->totalStudents($budget),
            quotes: QuoteData::collect($budget->quotes->all()),
            payment_terms: $budget->payment_terms,
            files: $budget->files->map(fn ($f) => FileData::fromModel($f))->all(),
        );
    }
```

- [ ] **Step 3: Ver a suíte reprovar — a assinatura mudou e os 4 chamadores ainda não passam o serviço**

```bash
docker compose exec -T app php artisan test --filter=Comercial 2>&1 | tail -20
```

Expected: FAIL, com `ArgumentCountError` citando `fromModel`. Este é o passo que prova que os 4 call sites são de fato os 4 — se reprovar em algum arquivo fora de `BudgetController`, há cascata que a medição não viu → **PARE e reporte**.

- [ ] **Step 4: Injetar o serviço nos 4 métodos do controller**

Em `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php`, adicione o import depois da linha 8:

```php
use App\Domains\Commercial\Services\BudgetSummaryService;
```

E substitua os 4 métodos (`index`, `store`, `show`, `update`) por:

```php
    /** @return array<BudgetData> */
    public function index(BudgetSummaryService $summary): array
    {
        return Budget::with(['quotes.files', 'files'])
            ->get()
            ->map(fn (Budget $b) => BudgetData::fromModel($b, $summary))
            ->all();
    }

    public function store(BudgetData $data, CreateBudgetAction $action, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($action->execute($data)->load(['quotes.files', 'files']), $summary);
    }

    public function show(Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($budget->load(['quotes.files', 'files']), $summary);
    }

    public function update(BudgetData $data, Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        // `code` e `client_id` são imutáveis: só payment_terms muda por aqui.
        $budget->update([
            'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
        ]);

        return BudgetData::fromModel($budget->load(['quotes.files', 'files']), $summary);
    }
```

- [ ] **Step 5: Ver a suíte voltar ao verde, sem editar teste nenhum**

```bash
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Expected: `376 passed` — o mesmo total da Task 1. **Nenhum arquivo de teste foi tocado nesta task**: se algum teste precisou mudar, o comportamento mudou, e isso contraria a invariante 2 da spec → **PARE e reporte**.

- [ ] **Step 6: Confirmar que `generated.ts` não mudou**

```bash
cd /home/jvbat/projetos/lotus
git diff --stat -- frontend/src/shared/types/generated.ts
```

Expected: sem saída. `fromModel` é construção, não contrato — as propriedades do DTO não mudaram.

- [ ] **Step 7: Registrar a leitura da decisão de saída (D9)**

Responda, no corpo do commit, qual dos três sinais da spec §D9 ocorreu. Os fatos para decidir são os dos Steps 3–5: quantos níveis a injeção atravessou, se algum call site precisou de `app()` para obter o serviço, e se algum teste precisou mudar.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Commercial/Data/BudgetData.php app/Domains/Commercial/Http/Controllers/BudgetController.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Commercial/Data/BudgetData.php backend/app/Domains/Commercial/Http/Controllers/BudgetController.php
git commit -m "$(cat <<'EOF'
refactor(commercial): BudgetData recebe o summary por parâmetro

Piloto da H.4.6. O DTO calculava status e totais em UF chamando
app(BudgetSummaryService::class) por dentro; agora o serviço entra por
parâmetro e quem injeta é o BudgetController, nos 4 call sites — os únicos,
provado pelo ArgumentCountError não ter aparecido fora dele.

Nenhum teste foi editado: a mudança é de construção, não de contrato, e
generated.ts segue sem diff.

Decisão de saída do piloto (spec D9): <sinal 1, 2 ou 3 + uma frase>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: H.4.7 — `postMultipart`

**Files:**
- Create: `frontend/src/shared/api/postMultipart.ts`
- Create: `frontend/src/shared/api/postMultipart.test.ts`
- Modify: `frontend/src/shared/api/photoResource.ts:16-27`
- Modify: `frontend/src/features/operation/api/useTurmaDocuments.ts:21-45`
- Modify: `frontend/src/features/operation/api/useImportStudents.ts:8-26`
- Modify: `frontend/src/features/commercial/api/useCommercialFiles.ts:15-29,40-51`
- Modify: `frontend/src/features/identity/api/useRedatorDocuments.ts:12-24`

**Interfaces:**
- Consumes: `api` de `@shared/api/axios` (instância axios existente, que **não** fixa `Content-Type`).
- Produces: `postMultipart<T>(url: string, fields: MultipartFields): Promise<T>`, onde `type MultipartFields = Record<string, string | File | undefined>`. Chave com valor `undefined` **não** entra no corpo.

**Contexto medido:** são **7** `new FormData()` no repositório — **6 de forma simples** (esta task) e **1 complexo** (`useRedatorForm`, fora por D11). As mutations de `delete` não entram em helper (D11b): são `api.delete(url)` de uma linha, sem `FormData` e sem armadilha de `Content-Type`.

- [ ] **Step 1: Escrever o teste do helper (D13b)**

Crie `frontend/src/shared/api/postMultipart.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postMultipart } from './postMultipart'
import { api } from './axios'

vi.mock('./axios', () => ({
  api: { post: vi.fn(() => Promise.resolve({ data: { ok: true } })) },
}))

const post = vi.mocked(api.post)

describe('postMultipart', () => {
  beforeEach(() => post.mockClear())

  it('envia FormData, nunca um objeto serializado', async () => {
    // A lição 6 em forma de teste: se o corpo deixar de ser FormData, o axios
    // serializa como JSON, cada File vira {} e o upload chega VAZIO com 201.
    await postMultipart('/api/turmas/1/documents', { type: 'lista', file: new File(['x'], 'a.pdf') })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData)
  })

  it('não passa config de request — nada pode fixar Content-Type', () => {
    // O boundary do multipart é derivado pelo axios. Um terceiro argumento
    // abriria a porta para `headers: { 'Content-Type': ... }`, que é o bug.
    void postMultipart('/api/x', { file: new File(['x'], 'a.pdf') })

    expect(post.mock.calls[0]).toHaveLength(2)
  })

  it('omite chave undefined em vez de mandar a string "undefined"', async () => {
    // `valid_until` opcional do documento de redator: mandar "undefined" para
    // uma coluna de data grava lixo.
    await postMultipart('/api/redatores/1/documents', {
      type: 'CV',
      file: new File(['x'], 'cv.pdf'),
      valid_until: undefined,
    })

    const body = post.mock.calls[0][1] as FormData
    expect(body.has('valid_until')).toBe(false)
    expect(body.get('type')).toBe('CV')
  })

  it('devolve o corpo da resposta, não o envelope do axios', async () => {
    const result = await postMultipart<{ ok: boolean }>('/api/x', { file: new File(['x'], 'a.pdf') })

    expect(result).toEqual({ ok: true })
  })
})
```

- [ ] **Step 2: Rodar e ver reprovar por módulo inexistente**

```bash
cd frontend && pnpm test postMultipart 2>&1 | tail -15
```

Expected: FAIL — `Failed to resolve import "./postMultipart"`.

- [ ] **Step 3: Escrever o helper**

Crie `frontend/src/shared/api/postMultipart.ts`:

```ts
import { api } from './axios'

/** Campos de um upload simples: texto e um arquivo. `undefined` = não enviar. */
export type MultipartFields = Record<string, string | File | undefined>

/**
 * Único ponto que monta multipart no app. Existe para a lição 6 morar em um
 * lugar só: o axios NÃO fixa `Content-Type` (`shared/api/axios.ts`), então o
 * FormData vira multipart+boundary sozinho. Fixar `application/json` faz o
 * `transformRequest` serializar o FormData, cada `File` vira `{}` e o upload
 * chega VAZIO com 201/204 silencioso — em caminho de documento com peso legal.
 *
 * Por isso a chamada ao axios não recebe terceiro argumento: não há onde
 * encaixar um header.
 *
 * Cobre só o payload plano. `useRedatorForm` monta array (`course_ids[]`) e
 * chave polimórfica (`documents[type]`) e fica fora de propósito (spec D11) —
 * generalizar aqui seria trazer forma de domínio para o transporte.
 */
export function postMultipart<T>(url: string, fields: MultipartFields): Promise<T> {
  const body = new FormData()

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) body.append(key, value)
  }

  return api.post<T>(url, body).then((r) => r.data)
}
```

- [ ] **Step 4: Rodar e ver os 4 casos passarem**

```bash
cd frontend && pnpm test postMultipart 2>&1 | tail -10
```

Expected: PASS, 4 testes.

- [ ] **Step 5: Adotar em `photoResource`**

Em `frontend/src/shared/api/photoResource.ts`, substitua o arquivo inteiro por:

```ts
import { api } from './axios'
import { postMultipart } from './postMultipart'

/** Os 4 recursos que têm foto. Fechado de propósito: recurso novo com foto
 * exige rota nova no backend, então a lista é a documentação de quem já tem. */
export type PhotoResource = 'users' | 'redatores' | 'students' | 'clients'

/**
 * Cliente das rotas nested de foto (spec D1). Uma rota por entidade, cada uma
 * sob a permissão do seu módulo — por isso o recurso é parâmetro, não um
 * endpoint único.
 */
export function photoResource(resource: PhotoResource) {
  return {
    upload: (id: number, file: File): Promise<void> =>
      postMultipart<void>(`/api/${resource}/${id}/photo`, { photo: file }).then(() => undefined),
    remove: (id: number): Promise<void> =>
      api.delete(`/api/${resource}/${id}/photo`).then(() => undefined),
  }
}
```

- [ ] **Step 6: Adotar em `useTurmaDocuments`**

Em `frontend/src/features/operation/api/useTurmaDocuments.ts`, **mantenha** a linha 2
(`import { api } from '@shared/api/axios'`) — `api` continua sendo usado pelo GET de `useTurmaDocuments`
e pelo DELETE de `useRemoveTurmaDocument` — e acrescente logo depois dela:

```ts
import { postMultipart } from '@shared/api/postMultipart'
```

Depois substitua o bloco das linhas 21-45 por:

```ts
/** Invalida também `turmaKeys.all`: `habilitada` é derivada no backend e muda
 * quando o 3º tipo é entregue. */
export function useUploadTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<
    TurmaDocumentData,
    ProblemDetails,
    { turmaId: number; type: TurmaDocumentType; file: File }
  >({
    mutationFn: ({ turmaId, type, file }) =>
      postMultipart<TurmaDocumentData>(`/api/turmas/${turmaId}/documents`, { type, file }),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

- [ ] **Step 7: Adotar em `useImportStudents`**

Em `frontend/src/features/operation/api/useImportStudents.ts`, substitua o arquivo inteiro por:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type { ImportResultData } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
import { enrollmentKeys } from './useEnrollments'

/** Upload de planilha (xlsx/csv). */
export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation<ImportResultData, ProblemDetails, { turmaId: number; file: File }>({
    mutationFn: ({ turmaId, file }) =>
      postMultipart<ImportResultData>(`/api/turmas/${turmaId}/alunos/importar`, { file }),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: enrollmentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

- [ ] **Step 8: Adotar nos 2 pontos de `useCommercialFiles`**

Em `frontend/src/features/commercial/api/useCommercialFiles.ts`, adicione o import depois da linha 3:

```ts
import { postMultipart } from '@shared/api/postMultipart'
```

Substitua o bloco das linhas 15-29 por:

```ts
export function useUploadBudgetFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { budgetId: number; type: BudgetFileType; file: File }>({
    mutationFn: ({ budgetId, type, file }) =>
      postMultipart<FileData>(`/api/budgets/${budgetId}/files`, { type, file }),
    onSuccess: invalidate,
  })
}
```

E o bloco das linhas 40-51 por:

```ts
export function useUploadQuoteFile() {
  const invalidate = useInvalidate()
  return useMutation<FileData, ProblemDetails, { quoteId: number; file: File }>({
    mutationFn: ({ quoteId, file }) =>
      postMultipart<FileData>(`/api/quotes/${quoteId}/files`, { type: 'quote_document', file }),
    onSuccess: invalidate,
  })
}
```

**Não toque** em `useRemoveBudgetFile` nem `useRemoveQuoteFile` (D11b).

- [ ] **Step 9: Adotar em `useRedatorDocuments`**

Em `frontend/src/features/identity/api/useRedatorDocuments.ts`, adicione o import depois da linha 3:

```ts
import { postMultipart } from '@shared/api/postMultipart'
```

E substitua o bloco das linhas 12-24 por:

```ts
export function useUploadDocument() {
  const invalidate = useInvalidate()
  return useMutation<RedatorDocumentData, ProblemDetails, { redatorId: number; type: string; file: File; valid_until?: string | null }>({
    // `valid_until` nulo/vazio vira undefined: o helper omite a chave, que é o
    // que o `if (valid_until)` daqui fazia antes.
    mutationFn: ({ redatorId, type, file, valid_until }) =>
      postMultipart<RedatorDocumentData>(`/api/redatores/${redatorId}/documents`, {
        type,
        file,
        valid_until: valid_until || undefined,
      }),
    onSuccess: invalidate,
  })
}
```

**Não toque** em `useRemoveDocument` (D11b).

- [ ] **Step 10: Build, lint e testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test 2>&1 | tail -5
```

Expected: build e lint verdes; `18 passed` (14 da baseline + 4 do helper).

- [ ] **Step 11: Confirmar que `api` sobrou só onde deve**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "new FormData()" --include=*.ts --include=*.tsx . 
```

Expected: **exatamente 1** ocorrência — `features/identity/hooks/useRedatorForm.ts` (D11). Qualquer outra → adoção incompleta.

- [ ] **Step 12: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/api/postMultipart.ts frontend/src/shared/api/postMultipart.test.ts frontend/src/shared/api/photoResource.ts frontend/src/features/operation/api/useTurmaDocuments.ts frontend/src/features/operation/api/useImportStudents.ts frontend/src/features/commercial/api/useCommercialFiles.ts frontend/src/features/identity/api/useRedatorDocuments.ts
git commit -m "$(cat <<'EOF'
refactor(shared): transporte multipart passa a ter um lugar só

Eram 7 new FormData() no app: 6 de forma simples (campos + 1 File -> POST ->
unwrap) e 1 complexo. Os 6 adotam postMultipart; o comentário da lição 6, que
estava copiado em 5 deles, passa a existir uma vez, no helper.

O helper não aceita terceiro argumento de propósito: não há onde encaixar um
Content-Type, que é o bug que faz o File virar {} e o upload chegar vazio com
201 silencioso. Teste direto cobre isso, mais a omissão de chave undefined
(valid_until) e o unwrap.

Fora por decisão: useRedatorForm (array e chave polimórfica, spec D11) e as
mutations de delete (sem transporte a centralizar, spec D11b).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: H.4.8 — paridade das 3 locales

**Files:**
- Create: `frontend/src/shared/config/locales/parity.test.ts`

**Interfaces:**
- Consumes: os 3 JSON de `frontend/src/shared/config/locales/`. Importados como módulo, igual ao que `shared/config/i18n.ts:4-6` já faz.
- Produces: nada.

**Contexto medido:** as 3 locales têm **443 chaves cada e zero diff** em qualquer direção. O teste nasce verde — é guardrail, não correção. O sinal de aceite externo exige exatamente isso: "o gate detecta chave ausente ou excedente **e o estado atual passa**".

- [ ] **Step 1: Escrever o teste**

Crie `frontend/src/shared/config/locales/parity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import en from './en.json'
import esCL from './es-CL.json'
import ptBR from './pt-BR.json'

/** Um valor de locale é string (folha) ou um objeto aninhado de valores. */
type LocaleTree = { [key: string]: string | LocaleTree }

/** Achata em caminhos com ponto: `{ a: { b: 'x' } }` -> `['a.b']`. Compara
 * ESTRUTURA, não texto: chave presente em uma locale e ausente em outra é o
 * que renderiza a chave crua na tela do usuário chileno. */
function flatten(tree: LocaleTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  )
}

const locales = {
  'en': flatten(en as LocaleTree),
  'es-CL': flatten(esCL as LocaleTree),
  'pt-BR': flatten(ptBR as LocaleTree),
}

/** `es-CL` é a locale do cliente e a referência de comparação. */
const referencia = new Set(locales['es-CL'])

describe('paridade das locales', () => {
  it.each(['en', 'pt-BR'] as const)('%s tem exatamente as chaves de es-CL', (locale) => {
    const atual = new Set(locales[locale])

    const faltando = [...referencia].filter((k) => !atual.has(k)).sort()
    const excedente = [...atual].filter((k) => !referencia.has(k)).sort()

    expect(
      { faltando, excedente },
      `Locale ${locale} divergiu de es-CL. Faltando: ${faltando.join(', ') || '—'}. ` +
        `Excedente: ${excedente.join(', ') || '—'}.`,
    ).toEqual({ faltando: [], excedente: [] })
  })

  it('as 3 locales têm o mesmo total de chaves', () => {
    expect(locales['en']).toHaveLength(locales['es-CL'].length)
    expect(locales['pt-BR']).toHaveLength(locales['es-CL'].length)
  })
})
```

- [ ] **Step 2: Rodar e ver passar no estado atual**

```bash
cd frontend && pnpm test parity 2>&1 | tail -10
```

Expected: PASS, 3 testes (2 do `it.each` + 1 do total).

- [ ] **Step 3: Ver reprovar por chave FALTANDO (sonda)**

O teste nasceu verde, então ainda não provou nada (lição 10). Remova uma chave de `en.json` temporariamente:

```bash
cd /home/jvbat/projetos/lotus/frontend
cp src/shared/config/locales/en.json /tmp/en.json.bak
python3 - <<'PY'
import json
p = 'src/shared/config/locales/en.json'
d = json.load(open(p))
d['common'].pop('delete', None)
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
PY
pnpm test parity 2>&1 | tail -20
```

Expected: FAIL, com a mensagem citando `Faltando: common.delete`. Se reprovar sem nomear a chave, a mensagem não serve → conserte antes de seguir.

- [ ] **Step 4: Ver reprovar por chave EXCEDENTE (sonda simétrica)**

```bash
cd /home/jvbat/projetos/lotus/frontend
cp /tmp/en.json.bak src/shared/config/locales/en.json
python3 - <<'PY'
import json
p = 'src/shared/config/locales/en.json'
d = json.load(open(p))
d['common']['sonda_temporaria'] = 'probe'
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
PY
pnpm test parity 2>&1 | tail -20
```

Expected: FAIL, citando `Excedente: common.sonda_temporaria`.

- [ ] **Step 5: Restaurar e confirmar árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
cp /tmp/en.json.bak frontend/src/shared/config/locales/en.json
rm /tmp/en.json.bak
git status --short
```

Expected: `git status --short` mostra **apenas** `?? frontend/src/shared/config/locales/parity.test.ts`. Qualquer `M` em arquivo de locale significa que a sonda não saiu limpa → **PARE** e restaure com `git checkout -- frontend/src/shared/config/locales/`.

- [ ] **Step 6: Rodar a suíte de frontend inteira**

```bash
cd frontend && pnpm test 2>&1 | tail -5 && pnpm build && pnpm lint
```

Expected: `21 passed` (18 da Task 3 + 3 desta); build e lint verdes.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/config/locales/parity.test.ts
git commit -m "$(cat <<'EOF'
test(i18n): paridade das 3 locales vira mecanismo

443 chaves em en/es-CL/pt-BR, zero diff — o estado já estava correto e nada
impedia a próxima chave de nascer só em uma locale, renderizando a chave crua
para o usuário chileno.

Compara estrutura contra es-CL nos dois sentidos (faltando e excedente) e
nomeia as chaves divergentes. Visto reprovando nas duas direções com sonda
antes de valer como prova.

Mora no vitest, não no backend: os 3 JSON são do frontend e a comparação não
envolve backend nenhum. O PermissionI18nParityTest fica onde está — ele é dono
do PermissionCatalog, que é PHP.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Gate

**Files:** nenhum arquivo de produção alterado. Sondas temporárias criadas e apagadas.

- [ ] **Step 1: Suítes completas, do zero**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan test 2>&1 | tail -5
cd frontend && pnpm test 2>&1 | tail -5 && pnpm build && pnpm lint
```

Expected: backend `376 passed`; frontend `21 passed`; build e lint verdes.

- [ ] **Step 2: Guardrail H.3.1 (a) — silêncio reprova**

Adicione ao fim de `backend/app/Domains/Catalog/routes.php`, **dentro** do grupo `auth:sanctum`:

```php
    // SONDA TEMPORÁRIA — apagar
    Route::delete('sonda/{course}/templates/{template}', [CourseTemplateController::class, 'destroy']);
```

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest 2>&1 | tail -20
```

Expected: FAIL citando `DELETE api/sonda/{course}/templates/{template}`. É o caso que a allowlist não pegaria.

- [ ] **Step 3: Guardrail H.3.1 (b) — a saída explícita funciona**

Troque a linha da sonda por:

```php
    // SONDA TEMPORÁRIA — apagar
    Route::delete('sonda/{course}/templates/{template}', [CourseTemplateController::class, 'destroy'])
        ->withoutScopedBindings();
```

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Expected: PASS. Prova que o teste exige **declaração**, não `scopeBindings` sempre — sem isso ele seria um teste que só sabe dizer "sim".

- [ ] **Step 4: Apagar a sonda e confirmar árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
git checkout -- backend/app/Domains/Catalog/routes.php
git status --short
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Expected: `git status --short` sem saída; teste PASS.

- [ ] **Step 5: Guardrail H.3.1 (c) — 404 cross-pai continua real**

Já coberto por teste existente, mas reconfirme explicitamente:

```bash
docker compose exec -T app php artisan test --filter=test_delete_cross_tipo_arquivo_de_budget_pela_rota_de_quote_404
docker compose exec -T app php artisan test --filter=test_remove_documento_de_outro_redator_da_404_e_nao_apaga
```

Expected: ambos PASS.

- [ ] **Step 6: Guardrail H.4.8 — já provado na Task 4, reconferir com sonda nova**

```bash
cd /home/jvbat/projetos/lotus/frontend
python3 - <<'PY'
import json
p = 'src/shared/config/locales/pt-BR.json'
d = json.load(open(p))
d['common']['sonda_gate'] = 'x'
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
PY
pnpm test parity 2>&1 | tail -10
cd /home/jvbat/projetos/lotus && git checkout -- frontend/src/shared/config/locales/pt-BR.json && git status --short
```

Expected: FAIL citando `Excedente: common.sonda_gate`; depois do checkout, `git status --short` sem saída.

- [ ] **Step 7: Prova de comportamento — upload real (D12)**

Este é o passo que build e lint não substituem. Com o app de pé e uma sessão Sanctum (lição 12: `-H 'Origin: http://localhost:5173'` **e** `-H 'Accept: application/json'`), prove **2** dos 6 pontos:

1. **Foto** (`photoResource`): `POST /api/users/{id}/photo` com um PNG → **204**, e a URL pré-assinada do `GET /api/users/{id}` devolvendo **200** com `Content-Type: image/png`.
2. **Documento** (`useTurmaDocuments` ou `useCommercialFiles`): `POST` de um PDF → **201** com corpo, e o registro em `files` com `size` **> 0**.

`size > 0` é o ponto: é exatamente isso que a lição 6 quebra em silêncio.

- [ ] **Step 8: Confirmação do gate permanente (D14)**

```bash
cd /home/jvbat/projetos/lotus
grep -n "pnpm test" CLAUDE.md .claude/rules/frontend-fsliced.md
```

Expected: pelo menos uma ocorrência em **cada** arquivo. Se algum não citar, os testes deste bloco nasceram órfãos de gate → **PARE e reporte**.

- [ ] **Step 9: Diffs proibidos**

```bash
cd /home/jvbat/projetos/lotus
git diff main...HEAD --stat -- frontend/src/shared/types/generated.ts
git diff main...HEAD --stat -- frontend/src/shared/config/locales/
git diff main...HEAD --stat -- backend/database/
```

Pint em passo separado, **com guarda contra lista vazia** — `./vendor/bin/pint` sem argumento
reformata o repositório inteiro (lição 9), e é exatamente o que aconteceria se o `git diff` não
devolvesse nada:

```bash
cd /home/jvbat/projetos/lotus
mapfile -t PHP_TOCADOS < <(git diff main...HEAD --name-only -- backend/ | grep '\.php$' | sed 's|^backend/||')
if [ ${#PHP_TOCADOS[@]} -eq 0 ]; then
  echo "Nenhum .php de backend/ no diff — Pint n/a, NÃO rodar sem argumento."
else
  printf 'Arquivos: %s\n' "${PHP_TOCADOS[*]}"
  (cd backend && ./vendor/bin/pint --test "${PHP_TOCADOS[@]}")
fi
```

Expected: os 3 primeiros sem saída (o diff de `locales/` só pode conter o `parity.test.ts`, que é `.ts` e não `.json` — se aparecer JSON, uma sonda ficou); Pint sem alteração pendente.

- [ ] **Step 10: Órfãos**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "postMultipart" --include=*.ts --include=*.tsx . | grep -v "postMultipart.ts\|postMultipart.test.ts" | wc -l
grep -rn "new FormData()" --include=*.ts --include=*.tsx . | wc -l
```

Expected: `postMultipart` com **6** consumidores; `new FormData()` com **1** ocorrência (o `useRedatorForm`, D11).

- [ ] **Step 11: Placar final**

Monte o placar com os números reais medidos: suíte backend, `pnpm test`, build, lint, Pint, os 3 guardrails vistos reprovando pelo motivo certo, o upload real provado, a leitura da D9 do commit da Task 2, e a confirmação do D14.

---

## Pendências de fechamento (não são tasks — vão para o `/fechar-sprint`)

1. **Backlog:** levar ao item 1 a conclusão técnica do H.4.5 (spec §1) — eliminar os aliases regrediria a fronteira de query-em-componente e passaria no lint; a resposta é "justificar e fechar o escape do seletor".
2. **Notion D4b:** atualizar a task H.3.1 (`39dbc9603dfa81f39e52ec6033137656`) — `addresses`/`contacts`/`templates` são rotas shallow e não representam o risco descrito; o recorte real foi `files`, em 5 rotas já guardadas. **Texto aprovado pelo João antes de enviar.**
3. **Notion D11b:** atualizar a task H.4.7 (`3b1bc9603dfa815c991bd10373d74cf6`) — mutations de `delete` não entram em helper; recorte real de 6 de 7 pontos. **Texto aprovado pelo João antes de enviar.**

---

## Handoff de execução

**`executor: misto`.**

| Task | Executor | Por quê |
|---|---|---|
| 0 | **claude** | Julgamento sobre árvore suja e baseline divergente |
| 1 | **codex** | Código literal, verificação executável, paths fechados, e a rede de regressão (testes cross-pai) já existe |
| 2 | **claude** | A D9 exige ler o resultado do piloto, não só executá-lo — inclusive a hipótese de reverter a task |
| 3 | **claude** | 6 caminhos de upload com peso legal e falha silenciosa (D12); julgamento sobre adoção parcial |
| 4 | **codex** | Teste puro, sondas com expectativa literal, path único |
| 5 | **claude** | Julga o placar e a prova de upload real |

**`paths_autorizados` — Task 1 (codex):**

```
backend/tests/Feature/Shared/NestedRouteOwnershipTest.php
backend/app/Domains/Commercial/routes.php
backend/app/Domains/Identity/routes.php
backend/app/Domains/Operation/routes.php
backend/app/Domains/Commercial/Http/Controllers/BudgetFileController.php
backend/app/Domains/Commercial/Http/Controllers/QuoteFileController.php
backend/app/Domains/Identity/Http/Controllers/RedatorDocumentController.php
```

**`paths_autorizados` — Task 4 (codex):**

```
frontend/src/shared/config/locales/parity.test.ts
```

**Regras de parada que acompanham a delegação:**

- **Task 1, Step 2:** se a lista de rotas indefinidas não for exatamente as 5 previstas, **PARE e reporte**. Rota a mais significa que a medição da spec deixou passar um caso; classificá-la é decisão do João.
- **Task 1, Step 7:** qualquer teste cross-pai vermelho significa que a relação do `scopeBindings` não filtra o que o `abort_unless` filtrava. **PARE** — não "conserte" reintroduzindo o `abort_unless`.
- **Task 4, Steps 3-5:** as sondas editam arquivo de locale. Se `git status --short` não voltar limpo, **PARE** — locale sujo é diff proibido no gate.
- **Ambas:** nenhum commit é feito pelo Codex sem o diff revisado por Claude antes.
