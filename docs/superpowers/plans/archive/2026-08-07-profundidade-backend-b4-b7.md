# Profundidade de module · backend B4–B7 — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (escolha do
> João) ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** aplicar B4–B7 do review de arquitetura de 2026-08-07 — seam do contratante + catraca,
builders de projeção nos 4 models medidos, `AcademicResult` tipado com validação na escrita, e
builder de cenário nos testes de Certification.

**Architecture:** refactor backend puro, zero schema. Seams: `Client::contratante()` (D12 uma vez)
→ `Turma::contratante()`/`Quote::contratante()` (travessia); VO em `App\Shared\Data`;
builders no molde `TurmaQueryBuilder::withListingData()`; VO acadêmico em `Operation\Services`
(camada pública — Regra A); catraca por teste com strip de comentários.

**Tech Stack:** Laravel 13 / PHP 8.3, PHPUnit, spatie/laravel-data (não usado nos VOs novos — ver
Desvios), MySQL 8 (suíte em sqlite :memory:).

**Spec:** `docs/superpowers/specs/archive/2026-08-07-profundidade-backend-b4-b7-design.md`

## Global Constraints

- Backend-only, main tree, branch `refactor/profundidade-backend-b4-b7` a partir de `main` (P-03).
- Suíte roda no container: `docker compose exec -T app php artisan test`. Pint no host, de
  `backend/`, **sempre com argumentos**.
- Baseline de entrada: **457 passed, 1 skipped (1655 assertions)**; frontend **35 passed**.
- Nenhuma resposta JSON muda de forma ou conteúdo (invariante 1 da spec); exceção declarada:
  `grades.final` não-imprimível vira 422 (invariante 4).
- Teste novo é visto RED antes do fix quando guarda comportamento (lição 10).
- `generated.ts` **não muda** (ver Desvio D-P1); `typescript:transform` sem diff é item do gate.
- Zero migration, zero mudança em `docs/adrs.md`/`der-fisico.md`.

## Desvios declarados da spec (lição 13 — medidos na escrita do plano)

- **D-P1 — `ContratanteData` NÃO pode morar em `Commercial/Data`.** A spec (D2) o punha lá com
  aresta Certification→Commercial declarada. Medido: a Regra A do `DomainDependencyTest` só expõe
  `Models/Enums/Services` — `Data` é camada interna, e o import reprovaria. Resolução: o VO vai
  para **`App\Shared\Data\ContratanteData`** (Shared não é domínio, não entra na matriz), a decisão
  D12 mora em **`Client::contratante()`** (Commercial, um lugar), e a dependência de Certification
  sobre Commercial **desaparece de verdade** — mediada por `Turma::contratante()` (Operation, aresta
  já declarada). A matriz diz a verdade por subtração, não por aresta nova. Consequência: sem
  spatie Data, sem `#[TypeScript]`, **sem mudança em `generated.ts`** (o frontend segue recebendo
  `client_name: string` nos DTOs existentes).
- **D-P2 — `AcademicResult` vai para `Operation\Services`, não `Operation\Data`.** Mesma Regra A: o
  `CertificateSnapshotBuilder` (Certification) o consome com type-hint, e `Services` é a única
  camada pública onde um VO cabe — precedente: `IssuanceContext` vive em `Certification\Services`.
  A matriz ganha a aresta `Certification → Operation\Services\AcademicResult` (visível, 1 linha +
  justificativa).
- **D-P3 — os sítios são 10, não 8, e um deles precisa do MODEL.** Além dos 8 do relatório:
  `EnrollStudentAction:31` precisa do `Client` model (associação RN-10, não projeção) — nasce
  `Turma::contratanteClient(): Client` e o `contratante()` deriva dele; e
  `manual-turma.blade.php:21` soletra a cadeia fora de `app/` — migra e a catraca varre blades.
  **Strings de eager-load (`'quote.budget.client'`, `'budget.client'`) ficam FORA da catraca**: são
  carga, não projeção — a forma da cadeia para carregar é conhecimento legítimo dos QueryBuilders
  (B5) e do `CertificateEligibility`.
- **D-P4 — o builder de cenário não tem `->jaEmitido()`.** "Já emitido" é ato do teste (emissão
  real pela Action/API), não setup de cadeia — os testes que precisam disso já emitem no corpo.
  O builder cobre o cenário-base e os desvios de porta que são setup.

---

### Task 0: Baseline e branch

**Files:** nenhum (medição).

- [ ] `git checkout -b refactor/profundidade-backend-b4-b7 main` (main tree, P-03).
- [ ] `docker compose exec -T app php artisan test` → registrar placar; esperado
      **457 passed, 1 skipped (1655 assertions)**. Divergiu → PARE e reporte.

---

### Task 1: `ContratanteData` + `Client::contratante()` (D12 num lugar)

**Files:**
- Create: `backend/app/Shared/Data/ContratanteData.php`
- Modify: `backend/app/Domains/Commercial/Models/Client.php`
- Test: `backend/tests/Feature/Commercial/ContratanteDataTest.php`

**Interfaces (Produces):**
- `App\Shared\Data\ContratanteData` — `final readonly class` com `public string $name`,
  `public string $rut`. Sem spatie Data, sem TypeScript (D-P1).
- `Client::contratante(): ContratanteData`.

- [ ] **Teste primeiro** (`ContratanteDataTest`): cliente criado com
  `legal_name = 'Empresa Legal SpA'` e `user.name = 'Empresa Cliente'`, `user.rut` fixado —
  asserir `contratante()->name === 'Empresa Legal SpA'` (razão social, **não** `user.name` — é o
  A-1 que virou regra) e `contratante()->rut === $client->user->rut`. Usar
  `CreatesDomainRecords::makeClientWithUser`.
- [ ] RED: `--filter=ContratanteDataTest` falha com método inexistente.
- [ ] Implementar:

```php
// app/Shared/Data/ContratanteData.php
namespace App\Shared\Data;

/**
 * Identidade do contratante como o documento legal a imprime: razão social
 * (`clients.legal_name`, D12) + RUT do cadastro. Nasce em Shared porque
 * Operation, Commercial e Certification a projetam e `Data` de domínio é
 * camada interna (Regra A do DomainDependencyTest).
 */
final readonly class ContratanteData
{
    public function __construct(
        public string $name,
        public string $rut,
    ) {}
}
```

```php
// Client.php — D12 escrita uma vez; todos os seams derivam daqui.
public function contratante(): ContratanteData
{
    // Razão social (D12), não o nome do User de cadastro: é o `{{EMPRESA}}`
    // do documento oficial.
    return new ContratanteData(name: $this->legal_name, rut: $this->user->rut);
}
```

- [ ] GREEN + Pint nos 3 arquivos + commit `refactor(commercial): ContratanteData e o seam da razão social (B4)`.

---

### Task 2: Seams de travessia — `Turma::contratante()` / `contratanteClient()` / `Quote::contratante()`

**Files:**
- Modify: `backend/app/Domains/Operation/Models/Turma.php`,
  `backend/app/Domains/Commercial/Models/Quote.php`
- Test: `backend/tests/Feature/Commercial/ContratanteDataTest.php` (mesmo arquivo)

**Interfaces (Produces):**
- `Turma::contratanteClient(): Client` — a travessia `quote->budget->client`, única no domínio.
- `Turma::contratante(): ContratanteData` — `contratanteClient()->contratante()`.
- `Quote::contratante(): ContratanteData` — `budget->client->contratante()`.

- [ ] Testes: turma da cadeia completa → `contratante()->name` = razão social;
  `contratanteClient()->is($client)`; quote → `contratante()->name` idem. RED, implementar, GREEN.

```php
// Turma.php
/** A travessia da cadeia comercial mora AQUI (e a catraca garante). */
public function contratanteClient(): Client
{
    return $this->quote->budget->client;
}

public function contratante(): ContratanteData
{
    return $this->contratanteClient()->contratante();
}
```

```php
// Quote.php
public function contratante(): ContratanteData
{
    return $this->budget->client->contratante();
}
```

- [ ] Pint + commit `refactor(operation,commercial): seams de travessia do contratante (B4)`.

---

### Task 3: Migrar os 10 sítios para os seams

**Files (Modify):**
- `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php:69-73` →
  `cliente:` vira `new SnapshotPartyData(name: $contratante->name, rut: $contratante->rut)` com
  `$contratante = $turma->contratante();` antes (o comentário D12 migra para `Client::contratante()`
  e sai daqui).
- `backend/app/Domains/Certification/Data/IssuableTurmaData.php:30` →
  `client_name: $turma->contratante()->name,`
- `backend/app/Domains/Operation/Data/TurmaData.php:72` → idem.
- `backend/app/Domains/Operation/Data/PendingQuoteData.php:31` →
  `client_name: $quote->contratante()->name,`
- `backend/app/Domains/Operation/Actions/ImportStudentsAction.php:57` →
  `client: $turma->contratante()->name,`
- `backend/app/Domains/Operation/Actions/EnrollStudentAction.php:31` →
  `$client = $turma->contratanteClient(); // RF-TUR-03: cliente da cotação`
- `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php:47` (preview) →
  `$turma->contratanteClient(),` (a assinatura de `EnrollPreviewData::fromLookup` não muda — ela
  compara `id`, precisa do model).
- `backend/resources/views/operation/manual-turma.blade.php:21` →
  `{{ $turma->contratante()->name }}`
- (Os imports de `Client` que ficarem órfãos saem; `Quote.php`/`Turma.php` são donos.)

- [ ] Migrar sítio a sítio; **movimento literal, sem mudança de comportamento**.
- [ ] Suíte completa verde no mesmo placar (+ os testes das Tasks 1–2). O JSON não muda: os testes
  existentes de TurmaData/issuable/snapshot/import/preview são a prova.
- [ ] Pint nos tocados + commit `refactor(backend): os 10 sítios da cadeia comercial migram para os seams (B4)`.

---

### Task 4: Catraca da cadeia

**Files:**
- Create: `backend/tests/Feature/Shared/ContratanteSeamTest.php`

- [ ] Teste que varre `app/Domains/**/*.php` (comentários removidos via `token_get_all`, mesmo
  racional do `DomainDependencyTest`) **e** `resources/views/**/*.blade.php` (raw) com a regex
  `/->\s*budget\s*->\s*client\b/`. Allowlist exata: `app/Domains/Operation/Models/Turma.php` e
  `app/Domains/Commercial/Models/Quote.php`. Qualquer outro arquivo com a travessia reprova
  nomeando arquivo:linha. Docblock do teste declara o que ele NÃO cobre de propósito: strings de
  eager-load são carga e moram nos QueryBuilders (D-P3).
- [ ] **Provar nos dois sentidos (lição 10):** sonda `$x = $turma->quote->budget->client;` num
  Action qualquer → reprova nomeando o arquivo; remover sonda → verde; os dois donos não disparam.
- [ ] Commit `test(shared): catraca da travessia do contratante (B4)`.

---

### Task 5: B5 — `EnrollmentQueryBuilder` + o bug do `result`

**Files:**
- Create: `backend/app/Domains/Operation/QueryBuilders/EnrollmentQueryBuilder.php`
- Modify: `backend/app/Domains/Operation/Models/Enrollment.php`,
  `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php` (index:36, store:55,
  result:71-78)
- Test: `backend/tests/Feature/Operation/EnrollmentResultTest.php`

**Interfaces (Produces):**
- `EnrollmentQueryBuilder extends Builder` com `public const LISTING = ['student.user'];` e
  `withListingData(): static`.
- `Enrollment::loadListingData(): static` (delega ao const) e `newEloquentBuilder` registrado.

- [ ] **Teste do bug primeiro** (em `EnrollmentResultTest`): dentro do teste,
  `Model::preventLazyLoading(true)` (restaurar em `finally`), PUT do resultado → asserir 200 e
  `student` presente no JSON. **RED contra o código atual**: `refresh()` sem load →
  `LazyLoadingViolationException` (500).
- [ ] Implementar:

```php
// app/Domains/Operation/QueryBuilders/EnrollmentQueryBuilder.php
namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção de matrícula: `EnrollmentData::fromModel` achata `student.user`,
 * e a lista do que carregar mora AQUI, não em cada caller — o `result` já
 * esqueceu uma vez (lazy load silencioso, B5).
 */
class EnrollmentQueryBuilder extends Builder
{
    public const LISTING = ['student.user'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
```

```php
// Enrollment.php
public function newEloquentBuilder($query): EnrollmentQueryBuilder
{
    return new EnrollmentQueryBuilder($query);
}

public function loadListingData(): static
{
    return $this->load(EnrollmentQueryBuilder::LISTING);
}
```

- Controller: `index` → `$turma->enrollments()->withListingData()->get()`; `store` →
  `$outcome->enrollment->loadListingData()`; `result` →

```php
$enrollment->setRelation('turma', $turma); // o binding aninhado não seta o pai

return EnrollmentData::fromModel($action->execute($enrollment, $data)->loadListingData());
```

- [ ] GREEN no teste novo; suíte verde; Pint; commit
  `fix(operation): projeção da matrícula ganha builder e o result deixa de lazy-loadar (B5)`.

---

### Task 6: B5 — builders de Quote, Client e Course

**Files:**
- Create: `backend/app/Domains/Commercial/QueryBuilders/QuoteQueryBuilder.php`
  (`LISTING = ['files']`), `backend/app/Domains/Commercial/QueryBuilders/ClientQueryBuilder.php`
  (`LISTING = ['user', 'addresses', 'contacts']`),
  `backend/app/Domains/Catalog/QueryBuilders/CourseQueryBuilder.php`
  (`LISTING = ['certificateTemplates', 'redatores', 'modules']`)
- Modify: os 3 models (registro + `loadListingData()`, mesmo shape da Task 5);
  `QuoteController` (index:35 → `withListingData()`; store:42, show:47, update:52, approve:67,
  reject:74 → `->loadListingData()`); `ClientController` (index:29 →
  `Client::query()->withListingData()`, show:42 → `loadListingData()`); `CourseController`
  (index:29, show:42 idem).

- [ ] Cada builder no template exato da Task 5 (docblock curto dizendo qual Data o consome).
- [ ] Suíte verde no mesmo placar (refactor puro; os testes de Quote/Client/Course existentes são
  a prova de comportamento).
- [ ] Pint + commit `refactor(backend): eager-load de Quote/Client/Course concentra nos builders (B5)`.

---

### Task 7: B6 — `AcademicResult` + validação na escrita + snapshot lê do VO

**Files:**
- Create: `backend/app/Domains/Operation/Services/AcademicResult.php`,
  `backend/app/Shared/Rules/PrintableGrade.php`
- Modify: `backend/app/Domains/Operation/Models/Enrollment.php`,
  `backend/app/Domains/Operation/Data/EnrollmentResultData.php`,
  `backend/app/Domains/Certification/Services/CertificateSnapshotBuilder.php`,
  `backend/tests/Feature/Shared/DomainDependencyTest.php` (aresta nova)
- Test: `backend/tests/Feature/Operation/EnrollmentResultTest.php`,
  `backend/tests/Feature/Certification/CertificateSnapshotTest.php` (só se precisar de ajuste de
  setup — asserções não mudam)

**Interfaces (Produces):**
- `Operation\Services\AcademicResult` — `final readonly class` com `public ?array $grades`,
  `public ?string $attendancePct`, `public EnrollmentApprovalStatus $approvalStatus`;
  `::fromEnrollment(Enrollment $enrollment): self`.
- `Enrollment::academicResult(): AcademicResult`.
- `Shared\Rules\PrintableGrade implements ValidationRule`.

- [ ] **Testes primeiro** (em `EnrollmentResultTest`): PUT com `grades.final = ['a' => 1]` → 422;
  `grades.final = false` → 422; `grades.final = "6,4"` → 200 (vírgula chilena continua aceita);
  `grades.final = 6.4` → 200; sem `grades` → 200 (nullable preservado). RED: hoje tudo passa como
  `array` livre.
- [ ] Implementar a regra (molde `ValidRut` — mensagem inline, es-CL como a UI):

```php
// app/Shared/Rules/PrintableGrade.php
namespace App\Shared\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A nota que o certificado imprime (D-P7 do bloco 7): numérica ou string
 * não-vazia — `"6,4"` com vírgula é como se escreve nota no Chile. O que não
 * dá para imprimir (array, objeto, booleano, string vazia) é recusado NA
 * ESCRITA; a defesa de leitura dos snapshots já congelados permanece em
 * SnapshotResultData::finalGrade.
 */
final class PrintableGrade implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_int($value) || is_float($value)) {
            return;
        }

        if (is_string($value) && trim($value) !== '') {
            return;
        }

        $fail('La nota final debe ser un número o un texto no vacío.');
    }
}
```

- `EnrollmentResultData::rules()` ganha `'grades.final' => ['sometimes', new PrintableGrade],`
  (`sometimes`: a chave pode faltar; presente, passa pela regra — `null` explícito em `final`
  também reprova, porque `null` não se imprime e a omissão é o caminho para "sem nota").
- [ ] VO:

```php
// app/Domains/Operation/Services/AcademicResult.php
namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;

/**
 * O resultado acadêmico com dono (B6). Aprovação é DECLARADA pelo admin
 * (decisão do João, 2026-08-07) — este VO tipa forma, não inventa regra de
 * corte. Vive em Services porque é a camada pública da Regra A: o
 * CertificateSnapshotBuilder (Certification) o consome por type-hint.
 */
final readonly class AcademicResult
{
    public function __construct(
        public ?array $grades,
        public ?string $attendancePct,
        public EnrollmentApprovalStatus $approvalStatus,
    ) {}

    public static function fromEnrollment(Enrollment $enrollment): self
    {
        return new self(
            grades: $enrollment->grades,
            attendancePct: $enrollment->attendance_pct,
            approvalStatus: $enrollment->approval_status,
        );
    }
}
```

- `Enrollment::academicResult(): AcademicResult` → `return AcademicResult::fromEnrollment($this);`
- `CertificateSnapshotBuilder`: o trecho `resultado:` passa a ler do VO
  (`$resultado = $enrollment->academicResult();` →
  `grades: $resultado->grades, approval_status: $resultado->approvalStatus->value,
  attendance_pct: $resultado->attendancePct`), com import de
  `App\Domains\Operation\Services\AcademicResult` — e a matriz ganha a linha:

```php
// DomainDependencyTest::ALLOWED — Certification:
// B6: o resultado acadêmico tem dono em Operation; o snapshot congela a
// partir do VO, não das colunas cruas da matrícula.
'Operation\Services\AcademicResult',
```

- [ ] **Provar a aresta nos dois sentidos:** com a linha, suíte verde; removendo a linha,
  `DomainDependencyTest` reprova nomeando `CertificateSnapshotBuilder.php`.
- [ ] Suíte completa verde; Pint; commit
  `feat(operation): AcademicResult com validação de nota imprimível na escrita (B6)`.

---

### Task 8: B7 — builder de cenário nomeado pelas portas

**Files:**
- Create: `backend/tests/Support/Certification/IssuableEnrollmentBuilder.php`
- Modify (setUp de cada um, asserções intocadas):
  `backend/tests/Feature/Certification/{CertificateEligibilityTest, CertificateListingTest,
  CertificatePdfTest, CertificateSchemaTest, CertificateSnapshotTest, IssueCertificateTest,
  PublicCertificateTest, RevokeCertificateTest}.php`

**Interfaces (Produces):**

```php
namespace Tests\Support\Certification;

/**
 * Cenário "matrícula emitível" nomeado pelas portas do CertificateEligibility
 * (B7). O default de make()->create() passa nas 6 portas; cada método nomeia
 * o desvio de UMA porta. "Já emitido" fica de fora de propósito (D-P4): é ato
 * do teste, não setup.
 */
final class IssuableEnrollmentBuilder
{
    public static function make(): self;

    // desvios de porta (cada um nomeia a porta que fecha)
    public function turmaNaoConcluida(): self;      // porta 1
    public function resultadoPendiente(): self;     // porta 2
    public function semTemplate(): self;            // porta 4
    public function templateSemCidade(): self;      // porta 5 (turma online sem city)
    public function semRedator(): self;             // porta 6

    // overrides pontuais (o dado às vezes É a asserção — mesmo contrato do
    // CreatesDomainRecords)
    public function client(array $overrides = [], array $userOverrides = []): self;
    public function course(array $overrides = []): self;
    public function turma(array $overrides = []): self;
    public function student(array $userOverrides = []): self;
    public function enrollment(array $overrides = []): self;
    public function redatorUser(array $userOverrides = []): self;
    public function template(array $overrides = []): self;

    public function create(): self;                  // materializa a cadeia

    // acessores pós-create
    public function turmaModel(): Turma;
    public function enrollmentModel(): Enrollment;
    public function redatorModel(): Redator;
    public function courseModel(): Course;
    public function clientModel(): Client;
    public function templateModel(): ?CourseCertificateTemplate;
}
```

Default do `create()` (extraído do setUp real do `IssueCertificateTest`, que é a regra medida):
cliente RN-01 via `CreatesDomainRecords`, `Budget`, `Course` 16h, `Quote` approved, `Turma`
`Concluida` (datas passadas), `Student` + `Enrollment` `Aprobado` com `grades.final` e
`attendance_pct`, `Redator` anexado, `CourseCertificateTemplate` com `layout_config.city`.
Nomes/RUTs default distintos entre cliente-razão-social e cliente-user (a fixture do A-1).

- [ ] Escrever o builder; smoke test próprio não nasce — a prova é a migração.
- [ ] Migrar **um arquivo por vez**: `--filter=<Arquivo>` antes (contagem) → substituir o corpo do
  setUp por builder + overrides que o arquivo exige (Carbon::setTestNow e `config([...])` ficam
  onde estão) → `--filter=<Arquivo>` depois **com contagem idêntica de testes e asserções**.
  Contagem mudou → a migração alterou semântica; reverter e refazer.
- [ ] Suíte completa no placar acumulado; Pint; commit
  `test(certification): setUps migram para IssuableEnrollmentBuilder (B7)`.

---

### Task 9: Gate (item 0 + DoD da spec)

- [ ] Suíte completa no container + `pnpm test`/`pnpm lint`/`pnpm build` (regressão frontend).
- [ ] Pint em todos os `.php` tocados do bloco (lista do `git diff --name-only main...HEAD`).
- [ ] `docker compose exec -T app php artisan typescript:transform` → `git diff generated.ts`
  **vazio** (D-P1).
- [ ] Catraca provada de novo com sonda fresca (arquivo diferente da Task 4), sonda removida,
  árvore limpa.
- [ ] Aresta do B6 provada de novo (remover linha → reprova → repor).
- [ ] **E2e contra a API real com sessão Sanctum (lição 12), `migrate:fresh --seed` no MySQL:**
  1. login; PUT resultado com `grades.final = "6,9"` → 200; com `grades.final = []` → **422
     es-CL**;
  2. `GET /api/certificates/issuable` → turma listada;
  3. `POST /api/enrollments/{id}/certificate` → 201; conferir **no MySQL** que
     `snapshot.cliente.name` é a razão social (e não `user.name`) — a prova viva do seam;
  4. `GET /api/certificates/{id}/pdf` → 200 `application/pdf`, `pdfinfo` A4;
  5. `GET /api/turmas/{id}/enrollments` → aluno aninhado presente (builder em produção).
- [ ] Placar final registrado com o delta task a task declarado nos commits.

---

## Handoff de execução

`executor: claude` — bloco inteiro via `subagent-driven-development` (escolha do João na abertura).
Sem `paths_autorizados` (não há delegação ao Codex). Tasks 1–2, 4, 5, 7 têm RED obrigatório; 3, 6 e
8 são refactors provados por invariância de placar e suíte; 9 é o gate.
