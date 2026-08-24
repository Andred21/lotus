# Certificação · histórico do aluno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O detalhe do aluno mostra, por matrícula, se existe certificado — código, estado derivado, data de vencimento quando houver, marca de reemissão e um botão que abre o PDF — sem sair da tela.

**Architecture:** O status derivado sai do React e passa a ser um enum do backend (`CertificateDisplayStatus`), dono único da regra. Um service de Certification (`StudentCertificateHistory`) resolve o histórico de N matrículas numa query e devolve um VO por matrícula; `Identity` consome só esse service, o VO e o enum, e projeta um DTO próprio embutido no `show` do aluno. No frontend, três peças sobem para `shared/` (a mutation do PDF, o mecanismo de abrir blob em aba, o mapa estado→severidade/rótulo), a derivação local morre, o módulo `/certificados` migra para o campo do servidor, e a tabela de turmas ganha uma quinta coluna.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-data + typescript-transformer, PHPUnit; React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4, i18next, Vitest + Testing Library.

**Spec:** [`docs/superpowers/specs/2026-08-24-certificacao-historico-do-aluno-design.md`](../specs/2026-08-24-certificacao-historico-do-aluno-design.md)
**Context Packet:** [`docs/superpowers/context-packets/2026-08-24-certificacao-historico-do-aluno.md`](../context-packets/2026-08-24-certificacao-historico-do-aluno.md)
**Branch:** `feat/certificacao-historico-do-aluno` (lane-a, main tree — P-03).

---

## Global Constraints

- Backend roda **no container**: `docker compose exec -T app php artisan …`. O host WSL não tem mbstring.
- Pint roda **no host, de dentro de `backend/`, sempre com argumentos**: `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- `frontend/src/shared/types/generated.ts` **não se edita à mão** (lei §5.3). Muda-se o DTO e roda-se `docker compose exec -T app php artisan typescript:transform`.
- Feature **não importa PrimeReact direto** (só via `shared/ui`) **nem outra feature — nem para tipo** (lei §5.6). O que duas features precisam sobe para `shared/`.
- Erros sobem ao handler global RFC 7807. Nunca `abort(422)`.
- Nenhuma chave i18n crua na tela; toda chave nova nasce nas **três** locales: `frontend/src/shared/config/locales/es-CL.json`, `en.json`, `pt-BR.json`.
- Cor vem de variável do tema (`var(--…)`), nunca literal Tailwind de cor nem literal cru em `style` — o ESLint reprova.
- `features/*/components/**` não chama `useQuery`/`useMutation`: query e mutation moram em hook.
- Baseline a bater ao fim de cada task: backend **906 passed / 5 skipped**; frontend **100 arquivos / 555 testes**. Toda task que acrescenta teste sobe esses números — o número novo é o baseline da task seguinte.
- Commit por task. Mensagem em português, tipo convencional (`feat:`, `refactor:`, `test:`, `chore:`).

---

## Correção de rota em relação à spec (leia antes da Task 3)

A spec §4 diz que `Identity` passa a enxergar `Certification\Data\StudentCertificateData` e que a matriz cresce em duas linhas. **Isso não passa no arch test como escrito**, e a medição é esta:

`tests/Feature/Shared/DomainDependencyTest.php` declara `PUBLIC_LAYERS = ['Models', 'Enums', 'Services']` e reprova a camada interna **antes** de consultar a matriz (`Regra A` roda antes da `Regra B`, e não olha `ALLOWED`). `Data` é camada interna. Medido em `main@cad0d1fb`: existem **zero** referências cross-domain a `…\Data\…` no repositório inteiro — a regra é hermética, não folgada.

O precedente para atravessar a fronteira com objeto tipado já existe e está documentado: `App\Domains\Operation\Services\AcademicResult`, cujo docblock diz textualmente *"Vive em Services porque é a camada pública da Regra A: o CertificateSnapshotBuilder (Certification) o consome por type-hint."*

**Portanto, o objeto que cruza a fronteira é um VO em `Certification\Services\`, não um DTO em `Certification\Data\`:**

| Spec §4 | Este plano | Por quê |
|---|---|---|
| `Certification\Data\StudentCertificateData` cruza | `Certification\Services\StudentCertificateSummary` cruza | camada `Data` é interna pela Regra A |
| DTO da resposta é o mesmo objeto | DTO da resposta é `Identity\Data\StudentCertificateData` | é a projeção de Identity, e é ela que gera o tipo TS |
| matriz cresce 2 linhas | matriz cresce **3** linhas | service + VO + enum, todas em camada pública |

**O que NÃO muda:** a intenção inteira da D3 fica de pé — `Certificate`, `CertificateStatus`, `CertificateSnapshotData` e `CertificateVigenciaResolver` continuam sem sair de Certification, e Identity segue enxergando uma superfície estreita. Os campos do contrato (`id, codigo, display_status, valido_ate, snapshot_ok` + `superseded_count` na linha) são exatamente os da spec §5.3. Muda o namespace de um objeto e o número de linhas da matriz.

---

## Estrutura de arquivos

**Backend — cria:**

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php` | dono único da regra de estado derivado + o fuso da derivação |
| `backend/app/Domains/Certification/Services/StudentCertificateSummary.php` | VO que cruza a fronteira de domínio (camada pública) |
| `backend/app/Domains/Certification/Services/StudentCertificateHistory.php` | histórico por matrícula em uma query; escolhe o atual e conta os anteriores |
| `backend/app/Domains/Identity/Data/StudentCertificateData.php` | projeção de saída do certificado na linha da turma (gera o tipo TS) |
| `backend/tests/Unit/Certification/CertificateDisplayStatusTest.php` | catraca da regra |
| `backend/tests/Feature/Certification/StudentCertificateHistoryTest.php` | catraca do atual/anteriores e da query única |
| `backend/tests/Feature/Identity/StudentDetailCertificatesTest.php` | catraca do payload do `show` e do gate |

**Backend — modifica:** `Identity/Data/StudentTurmaData.php`, `Identity/Data/StudentDetailData.php`, `Identity/Http/Controllers/StudentController.php`, `Certification/Data/CertificateData.php`, `Certification/Data/PublicCertificateData.php`, `tests/Feature/Shared/DomainDependencyTest.php`, `tests/Feature/Identity/StudentHistoryDataTest.php`, `tests/Feature/Identity/StudentDataTest.php`, `tests/Feature/Shared/SoftDeletedRelationProjectionTest.php`.

**Frontend — cria:**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/shared/lib/certificateStatus.ts` | mapa `display_status` → severidade + chave i18n |
| `frontend/src/shared/api/certificatesApi.ts` | a mutation do PDF do certificado, agora compartilhada |
| `frontend/src/shared/hooks/useBlobTabOpener.ts` | mecanismo de abrir blob autenticado em aba nova |
| `frontend/src/shared/hooks/useBlobTabOpener.test.tsx` | catraca do mecanismo |
| `frontend/src/features/identity/hooks/useStudentCertificatePdfOpener.ts` | composição do mecanismo com a mutation, para a célula |
| `frontend/src/features/identity/components/Student/StudentCertificateCell.tsx` | os quatro ramos da célula |
| `frontend/src/features/identity/components/Student/StudentCertificateCell.test.tsx` | catraca dos quatro ramos |

**Frontend — modifica:** `shared/lib/index.ts`, `shared/hooks/index.ts`, `features/certification/lib/certStatus.ts`, `features/certification/api/certificatesApi.ts`, `features/certification/hooks/useCertificatePdfOpener.ts`, `features/certification/hooks/useHistorial.ts`, `features/certification/hooks/useValidationPage.ts`, `features/certification/components/Historial/HistorialTable.tsx`, `features/certification/components/Historial/CertificateViewDialog.tsx`, `features/identity/components/Student/StudentDetailSections.tsx`, os três `locales/*.json`, e as fixtures de teste que o `tsc -b` acusar.

---

### Task 1: O enum do estado derivado

Dono único da regra que hoje vive no `certStatus()` do React (D4). Nasce sozinho, com o teste, antes de qualquer consumidor.

**Files:**
- Create: `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php`
- Test: `backend/tests/Unit/Certification/CertificateDisplayStatusTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: `CertificateDisplayStatus::for(CertificateStatus $status, ?CarbonInterface $validoAte, CarbonInterface $hoje): self`; `CertificateDisplayStatus::hoje(): CarbonImmutable`; constantes `POR_VENCER_DIAS = 30` e `TIMEZONE = 'America/Santiago'`; casos `Vigente|PorVencer|Vencido|Revocado` com valores `vigente|por_vencer|vencido|revocado`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Unit/Certification/CertificateDisplayStatusTest.php`:

```php
<?php

namespace Tests\Unit\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class CertificateDisplayStatusTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function hoje(string $data): Carbon
    {
        return Carbon::parse($data, CertificateDisplayStatus::TIMEZONE)->startOfDay();
    }

    /**
     * Peso legal: revogado NUNCA volta a parecer vigente por conta da data.
     * A precedência vem antes de qualquer leitura de `valido_ate`.
     */
    public function test_revogado_precede_data_futura(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Revocado,
            $this->hoje('2099-01-01'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Revocado, $status);
    }

    public function test_revogado_precede_vigencia_indeterminada(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Revocado,
            null,
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Revocado, $status);
    }

    /** O caso COMUM: certificado sem prazo é vigente por tempo indeterminado. */
    public function test_sem_valido_ate_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            null,
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    /** Vencer HOJE ainda é vigente — o certificado vale o dia inteiro. */
    public function test_vencer_hoje_ainda_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-08-24'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    public function test_dia_anterior_a_hoje_e_vencido(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-08-23'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vencido, $status);
    }

    /** A borda da janela: 30 dias avisa, 31 ainda não. */
    public function test_trinta_dias_e_por_vencer(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-09-23'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::PorVencer, $status);
    }

    public function test_trinta_e_um_dias_ainda_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-09-24'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    /**
     * D10: a derivação roda em America/Santiago mesmo com `config/app.php`
     * fixando UTC. Às 02:00 UTC ainda é o dia ANTERIOR no Chile — sem o fuso
     * explícito, um certificado que vence "amanhã" apareceria como vencendo
     * hoje durante três horas todo dia.
     */
    public function test_hoje_resolve_no_fuso_do_chile_e_nao_em_utc(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-10 02:00:00', 'UTC'));

        $this->assertSame('2026-03-09', CertificateDisplayStatus::hoje()->toDateString());
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=CertificateDisplayStatusTest
```

Esperado: FAIL — `Class "App\Domains\Certification\Enums\CertificateDisplayStatus" not found`.

- [ ] **Step 3: Escrever o enum**

Crie `backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php`:

```php
<?php

namespace App\Domains\Certification\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * O estado de EXIBIÇÃO do certificado — dono único da regra (spec D4).
 *
 * `CertificateStatus` tem dois valores porque é o que o banco guarda; esta é a
 * pergunta que a tela faz, e ela combina o estado persistido com a data. A
 * regra vivia em `frontend/src/features/certification/lib/certStatus.ts`, e o
 * DoD proíbe regra de domínio reconstruída no React — duas implementações de
 * "vigente" num documento de peso legal é o que o docblock do
 * `CertificateVigenciaResolver` chama de "respostas esperando para divergir".
 *
 * Quatro valores, e vigência indeterminada NÃO ganha um quinto (spec D5): o
 * sinal de "tem prazo" já existe e é `valido_ate !== null`. Valor novo aqui
 * contamina o filtro e os quatro contadores do rodapé do Historial.
 */
enum CertificateDisplayStatus: string
{
    case Vigente = 'vigente';
    case PorVencer = 'por_vencer';
    case Vencido = 'vencido';
    case Revocado = 'revocado';

    /** Janela de aviso antes do vencimento. Chave i18n: `certificate.status.<valor>`. */
    public const POR_VENCER_DIAS = 30;

    /**
     * D10: `config/app.php` fixa `'timezone' => 'UTC'` LITERAL, sem `env()`, e
     * o `APP_TIMEZONE=America/Santiago` do `.env.example` é ignorado. Corrigir
     * o config muda comportamento global e não cabe neste bloco — então a
     * derivação declara o fuso em vez de herdar o errado.
     */
    public const TIMEZONE = 'America/Santiago';

    /** "Hoje" no fuso do cliente, à meia-noite. Comparação é por data pura. */
    public static function hoje(): CarbonImmutable
    {
        return CarbonImmutable::instance(Carbon::now(self::TIMEZONE))->startOfDay();
    }

    /**
     * A ordem das quatro regras É a regra:
     *
     * 1. revogado, ANTES de olhar data alguma;
     * 2. sem `valido_ate` é vigente — o caso comum;
     * 3. anterior a hoje é vencido (vencer HOJE ainda é vigente);
     * 4. faltando 30 dias ou menos avisa; 31 ou mais é vigente.
     */
    public static function for(
        CertificateStatus $status,
        ?CarbonInterface $validoAte,
        CarbonInterface $hoje,
    ): self {
        if ($status === CertificateStatus::Revocado) {
            return self::Revocado;
        }

        if ($validoAte === null) {
            return self::Vigente;
        }

        $limite = $validoAte->copy()->startOfDay();
        $inicio = $hoje->copy()->startOfDay();

        if ($limite->lessThan($inicio)) {
            return self::Vencido;
        }

        return $inicio->diffInDays($limite) <= self::POR_VENCER_DIAS
            ? self::PorVencer
            : self::Vigente;
    }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
docker compose exec -T app php artisan test --filter=CertificateDisplayStatusTest
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: **914 passed / 5 skipped** (906 + 8).

- [ ] **Step 6: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Enums/CertificateDisplayStatus.php tests/Unit/Certification/CertificateDisplayStatusTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Certification/Enums/CertificateDisplayStatus.php backend/tests/Unit/Certification/CertificateDisplayStatusTest.php
git commit -m "feat(certification): enum do estado derivado do certificado, com o fuso explícito"
```

---

### Task 2: O histórico por matrícula, em uma query

Irmão do `CertificateVigenciaResolver` — que continua sendo a fonte de "vigente" para as portas de emissão e para o painel. Este responde outra pergunta: o histórico, revogados inclusive.

**Files:**
- Create: `backend/app/Domains/Certification/Services/StudentCertificateSummary.php`
- Create: `backend/app/Domains/Certification/Services/StudentCertificateHistory.php`
- Test: `backend/tests/Feature/Certification/StudentCertificateHistoryTest.php`

**Interfaces:**
- Consumes: `CertificateDisplayStatus::for()` e `::hoje()` (Task 1).
- Produces: `StudentCertificateHistory::forEnrollments(array $enrollmentIds): Collection` — `Collection<int, StudentCertificateSummary>` indexada por `enrollment_id`. `StudentCertificateSummary` com as propriedades públicas readonly `int $id`, `string $codigo`, `CertificateDisplayStatus $displayStatus`, `?string $validoAte` (data ISO ou `null`), `bool $snapshotOk`, `int $supersededCount`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Certification/StudentCertificateHistoryTest.php`:

```php
<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\StudentCertificateHistory;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class StudentCertificateHistoryTest extends TestCase
{
    use RefreshDatabase;

    private StudentCertificateHistory $history;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-24 12:00:00');
        $this->history = app(StudentCertificateHistory::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Cria um certificado cru para a matrícula — sem passar pelas portas de
     * emissão, que recusariam o segundo. O histórico existe justamente para
     * enxergar o que a emissão já deixou para trás. */
    private function certificado(Enrollment $enrollment, array $overrides = []): Certificate
    {
        $turma = $enrollment->turma;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $turma->course_id,
            'redator_id' => $overrides['redator_id'] ?? $this->redatorId,
            'codigo' => $overrides['codigo'] ?? 'LOT-2026-'.fake()->unique()->numberBetween(1000, 9999),
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
                'curso' => ['name' => 'Alta Tensión', 'technical_name' => 'AT', 'workload_hours' => 16, 'modules' => []],
                'turma' => ['start_date' => '2026-07-20', 'end_date' => '2026-07-24', 'modalidade' => 'online', 'local_aplicacao' => null],
                'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'],
                'emision' => ['city' => 'Santiago', 'date' => '2026-07-25'],
            ],
            'valido_ate' => $overrides['valido_ate'] ?? null,
            'status' => $overrides['status'] ?? CertificateStatus::Emitido,
            'revoked_at' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? Carbon::now() : null,
            'revocation_reason' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? 'Erro de digitação' : null,
        ]);
    }

    private int $redatorId;

    private function matricula(): Enrollment
    {
        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->redatorId = $builder->redatorModel()->id;

        return $builder->enrollmentModel();
    }

    public function test_matricula_sem_certificado_nao_aparece_na_colecao(): void
    {
        $enrollment = $this->matricula();

        $resumos = $this->history->forEnrollments([$enrollment->id]);

        $this->assertFalse($resumos->has($enrollment->id));
    }

    public function test_lista_vazia_nao_consulta_o_banco(): void
    {
        $this->assertTrue($this->history->forEnrollments([])->isEmpty());
    }

    /** Reemissão: o atual é o EMITIDO, não o mais recente por data. */
    public function test_o_atual_e_o_emitido_mesmo_com_revogado_mais_novo(): void
    {
        $enrollment = $this->matricula();
        $emitido = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0001']);
        $revogado = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0002', 'status' => CertificateStatus::Revocado]);
        $revogado->forceFill(['created_at' => Carbon::now()->addMinute()])->save();

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame($emitido->id, $resumo->id);
        $this->assertSame('LOT-2026-0001', $resumo->codigo);
        $this->assertSame(1, $resumo->supersededCount);
    }

    /** Sem nenhum emitido, o atual é o revogado mais RECENTE. */
    public function test_sem_emitido_o_atual_e_o_revogado_mais_recente(): void
    {
        $enrollment = $this->matricula();
        $antigo = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0010', 'status' => CertificateStatus::Revocado]);
        $antigo->forceFill(['created_at' => Carbon::now()->subDay()])->save();
        $novo = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0011', 'status' => CertificateStatus::Revocado]);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame($novo->id, $resumo->id);
        $this->assertSame(CertificateDisplayStatus::Revocado, $resumo->displayStatus);
        $this->assertSame(1, $resumo->supersededCount);
    }

    public function test_certificado_unico_nao_tem_anteriores(): void
    {
        $enrollment = $this->matricula();
        $this->certificado($enrollment);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame(0, $resumo->supersededCount);
        $this->assertNull($resumo->validoAte);
        $this->assertSame(CertificateDisplayStatus::Vigente, $resumo->displayStatus);
        $this->assertTrue($resumo->snapshotOk);
    }

    public function test_valido_ate_no_passado_vira_vencido(): void
    {
        $enrollment = $this->matricula();
        $this->certificado($enrollment, ['valido_ate' => '2026-08-23']);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame('2026-08-23', $resumo->validoAte);
        $this->assertSame(CertificateDisplayStatus::Vencido, $resumo->displayStatus);
    }

    /** Snapshot corrompido não derruba o histórico: viaja marcado. */
    public function test_snapshot_corrompido_viaja_marcado(): void
    {
        $enrollment = $this->matricula();
        $certificate = $this->certificado($enrollment);
        DB::table('certificates')->where('id', $certificate->id)->update([
            'snapshot' => json_encode(['aluno' => ['name' => '', 'rut' => '']]),
        ]);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertFalse($resumo->snapshotOk);
    }

    /**
     * A catraca do N+1: DEZ matrículas, UMA query. Resolver por matrícula
     * devolveria o N+1 na tela que lista o histórico inteiro de turmas.
     */
    public function test_dez_matriculas_saem_em_uma_query(): void
    {
        $ids = [];
        for ($i = 0; $i < 10; $i++) {
            $enrollment = $this->matricula();
            $this->certificado($enrollment);
            $ids[] = $enrollment->id;
        }

        $queries = 0;
        DB::listen(function (QueryExecuted $query) use (&$queries) {
            $queries++;
        });

        $resumos = $this->history->forEnrollments($ids);

        $this->assertCount(10, $resumos);
        $this->assertSame(1, $queries, 'O histórico de N matrículas tem de sair em UMA query.');
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=StudentCertificateHistoryTest
```

Esperado: FAIL — `Class "App\Domains\Certification\Services\StudentCertificateHistory" not found`.

- [ ] **Step 3: Escrever o VO**

Crie `backend/app/Domains/Certification/Services/StudentCertificateSummary.php`:

```php
<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateDisplayStatus;

/**
 * O certificado de UMA matrícula, como o resto do sistema tem permissão de
 * vê-lo. É a única superfície que `Identity` enxerga do documento (spec D3):
 * `Certificate`, `CertificateStatus` e o snapshot não cruzam a fronteira.
 *
 * Vive em `Services` porque é a camada pública da Regra A do
 * `DomainDependencyTest` — mesmo motivo, e mesmo lugar, de
 * `Operation\Services\AcademicResult`, que `Certification` consome por
 * type-hint. A camada `Data` é interna: o arch test a reprova ANTES de olhar a
 * matriz de arestas, e o repositório tem zero travessias de `Data`.
 *
 * `snapshotOk` viaja porque a tela precisa dele: documento corrompido não tem
 * estado a afirmar, e a célula troca a tag de estado pela de defeito.
 */
final readonly class StudentCertificateSummary
{
    public function __construct(
        public int $id,
        public string $codigo,
        public CertificateDisplayStatus $displayStatus,
        /** Data ISO (`Y-m-d`), ou `null` quando a vigência é indeterminada — o caso comum. */
        public ?string $validoAte,
        public bool $snapshotOk,
        /** Quantos certificados a matrícula já teve ANTES deste. */
        public int $supersededCount,
    ) {}
}
```

- [ ] **Step 4: Escrever o service**

Crie `backend/app/Domains/Certification/Services/StudentCertificateHistory.php`:

```php
<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Support\Collection;

/**
 * O HISTÓRICO de certificados de um conjunto de matrículas — revogados
 * inclusive.
 *
 * Irmão do `CertificateVigenciaResolver`, e não substituto dele: aquele
 * responde "esta matrícula tem certificado vigente?" para as portas de emissão
 * e para o painel, e por isso só enxerga `emitido`. Este responde "o que esta
 * matrícula já teve?", que é a pergunta da tela do aluno — esconder revogação
 * num histórico de peso legal é o defeito que a P-15 recusou em 2026-07-27.
 *
 * Uma query para N matrículas. Resolver por matrícula devolveria o N+1 na tela
 * que lista o histórico inteiro de turmas concluídas.
 */
class StudentCertificateHistory
{
    /**
     * @param  list<int>  $enrollmentIds
     * @return Collection<int, StudentCertificateSummary> keyBy `enrollment_id`
     */
    public function forEnrollments(array $enrollmentIds): Collection
    {
        if ($enrollmentIds === []) {
            return new Collection;
        }

        $hoje = CertificateDisplayStatus::hoje();

        return Certificate::query()
            ->whereIn('enrollment_id', $enrollmentIds)
            // Do mais novo para o mais velho, com `id` desempatando: dois
            // certificados criados no mesmo segundo (lote) sairiam em ordem
            // indefinida, e "o revogado mais recente" viraria sorteio.
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->groupBy('enrollment_id')
            ->map(fn (Collection $doEnrollment) => $this->resumir($doEnrollment, $hoje));
    }

    /** @param  Collection<int, Certificate>  $certificados */
    private function resumir(Collection $certificados, \Carbon\CarbonInterface $hoje): StudentCertificateSummary
    {
        // O ATUAL é o emitido — no máximo um existe, porque a porta 3 do
        // `CertificateEligibility` recusa a segunda emissão enquanto houver
        // vigente. Sem nenhum emitido, o atual é o revogado mais recente, que
        // é o primeiro da coleção já ordenada.
        $atual = $certificados->firstWhere('status', CertificateStatus::Emitido)
            ?? $certificados->first();

        // Lido UMA vez: o cast tem `withoutObjectCaching`, então cada acesso à
        // propriedade decodifica o JSON e remonta a árvore de DTOs de novo.
        $snapshot = $atual->snapshot;

        return new StudentCertificateSummary(
            id: $atual->id,
            codigo: $atual->codigo,
            displayStatus: CertificateDisplayStatus::for($atual->status, $atual->valido_ate, $hoje),
            validoAte: $atual->valido_ate?->toDateString(),
            snapshotOk: $snapshot->isPresentable(),
            supersededCount: $certificados->count() - 1,
        );
    }
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
docker compose exec -T app php artisan test --filter=StudentCertificateHistoryTest
```

Esperado: PASS, 8 testes. Se `test_dez_matriculas_saem_em_uma_query` falhar com um número maior que 1, o `groupBy` está sendo feito no banco em vez de na coleção — o `get()` tem de vir antes.

- [ ] **Step 6: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: **922 passed / 5 skipped**.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Services/StudentCertificateSummary.php app/Domains/Certification/Services/StudentCertificateHistory.php tests/Feature/Certification/StudentCertificateHistoryTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Certification/Services backend/tests/Feature/Certification/StudentCertificateHistoryTest.php
git commit -m "feat(certification): histórico de certificados por matrícula em uma query"
```

---

### Task 3: O certificado no payload do aluno

A aresta de domínio nova, o DTO de saída e a coluna no `show`. É a task que muda a matriz do arch test — a Regra C reprova aresta declarada sem consumidor, então declarar e consumir andam no mesmo commit.

**Files:**
- Create: `backend/app/Domains/Identity/Data/StudentCertificateData.php`
- Modify: `backend/app/Domains/Identity/Data/StudentTurmaData.php`
- Modify: `backend/app/Domains/Identity/Data/StudentDetailData.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/StudentController.php`
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (a constante `ALLOWED`)
- Modify: `backend/tests/Feature/Identity/StudentHistoryDataTest.php:87`
- Modify: `backend/tests/Feature/Identity/StudentDataTest.php:63`
- Modify: `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php:160,176`
- Test: `backend/tests/Feature/Identity/StudentDetailCertificatesTest.php`

**Interfaces:**
- Consumes: `StudentCertificateHistory::forEnrollments()`, `StudentCertificateSummary`, `CertificateDisplayStatus` (Tasks 1–2).
- Produces: `StudentCertificateData::fromSummary(StudentCertificateSummary $summary): self` com os campos `id, codigo, display_status, valido_ate, snapshot_ok`; `StudentTurmaData::fromModel(Enrollment $enrollment, ?StudentCertificateSummary $summary): self` (segundo parâmetro NOVO, opcional com default `null`); `StudentDetailData::fromModel(Student $student, Collection $certificates): self` (segundo parâmetro NOVO, obrigatório).

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Identity/StudentDetailCertificatesTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Os quatro ramos da célula de certificado no `GET /api/students/{id}`
 * (spec D7), mais o gate. A tela não compõe duas listas por `enrollment_id`:
 * o contrato vem embutido no `show` (spec D2).
 */
class StudentDetailCertificatesTest extends TestCase
{
    use RefreshDatabase;

    private IssuableEnrollmentBuilder $builder;

    private Enrollment $enrollment;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-24 12:00:00');
        $this->seed(RolePermissionSeeder::class);

        $this->builder = IssuableEnrollmentBuilder::make()->create();
        $this->enrollment = $this->builder->enrollmentModel();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function certificado(array $overrides = []): Certificate
    {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->builder->courseModel()->id,
            'redator_id' => $this->builder->redatorModel()->id,
            'codigo' => $overrides['codigo'] ?? 'LOT-2026-0001',
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
                'curso' => ['name' => 'Alta Tensión', 'technical_name' => 'AT', 'workload_hours' => 16, 'modules' => []],
                'turma' => ['start_date' => '2026-07-20', 'end_date' => '2026-07-24', 'modalidade' => 'online', 'local_aplicacao' => null],
                'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'],
                'emision' => ['city' => 'Santiago', 'date' => '2026-07-25'],
            ],
            'valido_ate' => $overrides['valido_ate'] ?? null,
            'status' => $overrides['status'] ?? CertificateStatus::Emitido,
            'revoked_at' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? Carbon::now() : null,
            'revocation_reason' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? 'Erro' : null,
        ]);
    }

    private function turmaDoAluno(): array
    {
        $studentId = $this->enrollment->student_id;

        return $this->actingAs($this->admin())
            ->getJson("/api/students/{$studentId}")
            ->assertOk()
            ->json('turmas.0');
    }

    /** Ramo 1: certificado presente, sem prazo — o caso comum. */
    public function test_certificado_sem_prazo_viaja_vigente_e_sem_data(): void
    {
        $this->certificado();

        $turma = $this->turmaDoAluno();

        $this->assertSame('LOT-2026-0001', $turma['certificate']['codigo']);
        $this->assertSame('vigente', $turma['certificate']['display_status']);
        $this->assertNull($turma['certificate']['valido_ate']);
        $this->assertTrue($turma['certificate']['snapshot_ok']);
        $this->assertSame(0, $turma['superseded_count']);
    }

    public function test_certificado_com_prazo_proximo_viaja_por_vencer_com_a_data(): void
    {
        $this->certificado(['valido_ate' => '2026-09-10']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('por_vencer', $turma['certificate']['display_status']);
        $this->assertSame('2026-09-10', $turma['certificate']['valido_ate']);
    }

    public function test_certificado_revogado_nao_some_da_tela(): void
    {
        $this->certificado(['status' => CertificateStatus::Revocado, 'valido_ate' => '2099-01-01']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('revocado', $turma['certificate']['display_status']);
    }

    /** Ramo 4: snapshot corrompido viaja marcado, sem derrubar a resposta. */
    public function test_snapshot_corrompido_viaja_marcado(): void
    {
        $certificate = $this->certificado();
        DB::table('certificates')->where('id', $certificate->id)->update([
            'snapshot' => json_encode(['aluno' => ['name' => '', 'rut' => '']]),
        ]);

        $turma = $this->turmaDoAluno();

        $this->assertFalse($turma['certificate']['snapshot_ok']);
    }

    /** Reemissão: a linha mostra o atual e conta os anteriores (spec D8). */
    public function test_reemissao_mostra_o_atual_e_conta_os_anteriores(): void
    {
        $revogado = $this->certificado(['codigo' => 'LOT-2026-0001', 'status' => CertificateStatus::Revocado]);
        $revogado->forceFill(['created_at' => Carbon::now()->subDay()])->save();
        $this->certificado(['codigo' => 'LOT-2026-0002']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('LOT-2026-0002', $turma['certificate']['codigo']);
        $this->assertSame(1, $turma['superseded_count']);
    }

    /** Ramos 2 e 3 da célula: a ausência tem DOIS significados opostos, e a
     * distinção é o `approval_status` que a linha já traz — o payload não
     * inventa um campo para isso. */
    public function test_matricula_aprovada_sem_certificado_viaja_sem_certificado(): void
    {
        $turma = $this->turmaDoAluno();

        $this->assertNull($turma['certificate']);
        $this->assertSame(0, $turma['superseded_count']);
        $this->assertSame('aprobado', $turma['approval_status']);
    }

    public function test_matricula_reprovada_viaja_sem_certificado_e_com_o_estado(): void
    {
        $this->enrollment->update(['approval_status' => EnrollmentApprovalStatus::Reprobado]);

        $turma = $this->turmaDoAluno();

        $this->assertNull($turma['certificate']);
        $this->assertSame('reprobado', $turma['approval_status']);
    }

    /** O gate é o do `show`, herdado (spec D11): sem `identity.user.view`,
     * ninguém vê nem o aluno nem o certificado. */
    public function test_sem_identity_user_view_o_show_recusa(): void
    {
        $redator = User::factory()->create();
        $redator->assignRole('redator');

        $this->actingAs($redator)
            ->getJson("/api/students/{$this->enrollment->student_id}")
            ->assertForbidden();
    }

    /** A catraca do N+1 na ponta da API: o `show` custa o MESMO para um aluno
     * com 1 e com 10 matrículas certificadas. */
    public function test_o_show_nao_ganha_query_por_matricula(): void
    {
        $this->certificado();
        $studentId = $this->enrollment->student_id;
        $admin = $this->admin();

        $comUma = $this->contarQueriesDoShow($admin, $studentId);

        for ($i = 0; $i < 9; $i++) {
            $outra = IssuableEnrollmentBuilder::make()->create();
            $enrollment = $outra->enrollmentModel();
            $enrollment->update(['student_id' => $studentId]);
            Certificate::create([
                'uuid' => (string) Str::uuid(),
                'enrollment_id' => $enrollment->id,
                'course_id' => $outra->courseModel()->id,
                'redator_id' => $outra->redatorModel()->id,
                'codigo' => 'LOT-2026-'.(2000 + $i),
                'snapshot' => ['aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'], 'curso' => ['name' => 'AT', 'technical_name' => 'AT', 'workload_hours' => 8, 'modules' => []], 'turma' => ['start_date' => '2026-07-20', 'end_date' => '2026-07-24', 'modalidade' => 'online', 'local_aplicacao' => null], 'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'], 'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'], 'emision' => ['city' => 'Santiago', 'date' => '2026-07-25']],
                'valido_ate' => null,
                'status' => CertificateStatus::Emitido,
                'revoked_at' => null,
                'revocation_reason' => null,
            ]);
        }

        $comDez = $this->contarQueriesDoShow($admin, $studentId);

        $this->assertSame($comUma, $comDez, 'O `show` ganhou query por matrícula — o histórico voltou a ser resolvido em laço.');
    }

    private function contarQueriesDoShow(User $admin, int $studentId): int
    {
        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });

        $this->actingAs($admin)->getJson("/api/students/{$studentId}")->assertOk();

        DB::flushQueryLog();

        return $queries;
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=StudentDetailCertificatesTest
```

Esperado: FAIL — a chave `certificate` não existe no payload da turma.

- [ ] **Step 3: Escrever o DTO de saída**

Crie `backend/app/Domains/Identity/Data/StudentCertificateData.php`:

```php
<?php

namespace App\Domains\Identity\Data;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Services\StudentCertificateSummary;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O certificado de uma matrícula, na linha do histórico de turmas do aluno.
 * Só saída.
 *
 * Mora em `Identity` porque é projeção de Identity: quem cruza a fronteira é o
 * `StudentCertificateSummary`, VO da camada pública de Certification. O
 * documento em si — `Certificate`, `CertificateStatus`, o snapshot — não sai
 * do domínio dele (spec D3).
 *
 * `display_status` é o ENUM, não `string`: o front precisa da união fechada
 * para casar severidade e rótulo sem um fallback que engula estado novo —
 * mesma razão do `approval_status` em `StudentTurmaData`.
 */
#[TypeScript]
class StudentCertificateData extends Data
{
    public function __construct(
        public int $id,
        public string $codigo,
        public CertificateDisplayStatus $display_status,
        /** `null` quando a vigência é indeterminada — o caso comum. A célula
         * só imprime data quando este campo existe (spec D5/D6). */
        public ?string $valido_ate,
        /** Documento corrompido não tem estado a afirmar: a célula troca a tag
         * de estado pela de defeito (política herdada do Historial). */
        public bool $snapshot_ok,
    ) {}

    public static function fromSummary(StudentCertificateSummary $summary): self
    {
        return new self(
            id: $summary->id,
            codigo: $summary->codigo,
            display_status: $summary->displayStatus,
            valido_ate: $summary->validoAte,
            snapshot_ok: $summary->snapshotOk,
        );
    }
}
```

- [ ] **Step 4: Acrescentar os dois campos à linha da turma**

Em `backend/app/Domains/Identity/Data/StudentTurmaData.php`, acrescente os dois imports novos e substitua o construtor e o `fromModel`:

```php
use App\Domains\Certification\Services\StudentCertificateSummary;
```

```php
    public function __construct(
        public int $turma_id,
        public ?string $quote_code,
        public string $course_name,
        public string $start_date,
        /** O enum, não `string`: o front precisa da união fechada para casar
         * severidade e rótulo sem um fallback que engula estado novo. */
        public EnrollmentApprovalStatus $approval_status,
        /** `null` tem DOIS significados, e quem os separa é o
         * `approval_status` acima: aprovado sem certificado é "pendente de
         * emissão"; o resto é "não corresponde" (spec D7). */
        public ?StudentCertificateData $certificate = null,
        /** Quantos certificados esta matrícula já teve antes do atual. O
         * rastro de reemissão não some, e a linha não vira lista de altura
         * variável numa tabela que já disputa largura (spec D8). */
        public int $superseded_count = 0,
    ) {}

    public static function fromModel(Enrollment $enrollment, ?StudentCertificateSummary $summary = null): self
    {
        $turma = $enrollment->turma;

        return new self(
            turma_id: $turma->id,
            quote_code: $turma->quote?->code,
            course_name: $turma->course->name,
            start_date: $turma->start_date->toDateString(),
            approval_status: $enrollment->approval_status,
            certificate: $summary === null ? null : StudentCertificateData::fromSummary($summary),
            superseded_count: $summary?->supersededCount ?? 0,
        );
    }
```

E corrija a última linha do docblock da classe, que hoje termina em "que hoje não existe no backend." — acrescente:

```php
 *
 * O certificado entra como COLUNA desta linha, não como seção própria: a
 * tabela já lista uma linha por matrícula e certificado é 1:1 com matrícula
 * (spec D1).
```

- [ ] **Step 5: Passar a coleção pelo detalhe**

Em `backend/app/Domains/Identity/Data/StudentDetailData.php`:

1. Troque a última linha do docblock — `Certificados não entram: o domínio Certification não existe (Bloco 7).` — por:

```php
 * Os certificados entram por COLUNA da linha de turma (`StudentTurmaData`), a
 * partir da coleção que o controller resolve: o DTO não toca o container. A
 * frase que aqui dizia "Certification não existe (Bloco 7)" era falsa desde o
 * Bloco 7 e sustentou a P-15 por um mês.
```

2. Acrescente o import:

```php
use Illuminate\Support\Collection;
```

3. Troque a assinatura e o mapeamento das turmas:

```php
    /**
     * @param  Collection<int, \App\Domains\Certification\Services\StudentCertificateSummary>  $certificates
     *   indexada por `enrollment_id`, já resolvida pelo controller
     */
    public static function fromModel(Student $student, Collection $certificates): self
    {
```

```php
            turmas: $student->enrollments
                ->sortByDesc(fn ($enrollment) => $enrollment->turma->start_date)
                ->values()
                ->map(fn ($enrollment) => StudentTurmaData::fromModel(
                    $enrollment,
                    $certificates->get($enrollment->id),
                ))
                ->all(),
```

> O tipo do `@param` fica em FQN dentro do docblock de propósito: docblock não é aresta (o arch test remove comentários antes de varrer), e o import real do VO já está em `StudentTurmaData`. Um `use` aqui seria uma quarta linha de matriz sem consumidor em código.

- [ ] **Step 6: Injetar o service no controller**

Em `backend/app/Domains/Identity/Http/Controllers/StudentController.php`, acrescente o import e troque o `show`:

```php
use App\Domains\Certification\Services\StudentCertificateHistory;
```

```php
    /**
     * O detalhe traz os certificados junto (spec D2): endpoint separado
     * obrigaria o React a casar duas listas por `enrollment_id`, que é
     * composição no cliente. O gate é o mesmo `identity.user.view` — nenhuma
     * role atual vê aluno sem ver certificado (spec D11).
     */
    public function show(Student $student, StudentCertificateHistory $history): StudentDetailData
    {
        $student->load([
            'user',
            'currentClient',
            'logs.client',
            'enrollments.turma.quote',
            'enrollments.turma.course',
        ]);

        return StudentDetailData::fromModel(
            $student,
            $history->forEnrollments($student->enrollments->pluck('id')->all()),
        );
    }
```

- [ ] **Step 7: Abrir as três arestas na matriz**

Em `backend/tests/Feature/Shared/DomainDependencyTest.php`, substitua o bloco `'Identity'` inteiro (as três linhas novas entram em ordem alfabética, entre `Catalog\Models\Course` e `Commercial\Models\Client`) e o comentário que as justifica, logo acima do já existente sobre a Task 7:

```php
        // O bloco `certificacao-historico-do-aluno` abre TRÊS arestas para
        // Certification: `StudentCertificateHistory` (o histórico por
        // matrícula), `StudentCertificateSummary` (o VO que atravessa — vive
        // em Services porque `Data` é camada interna pela Regra A, mesmo lugar
        // e mesmo motivo de `Operation\Services\AcademicResult`) e
        // `CertificateDisplayStatus`, o enum que a união fechada do front
        // exige. `Certificate`, `CertificateStatus` e o snapshot continuam sem
        // cruzar. O ciclo `Identity <-> Certification` que isso cria não é
        // inédito: `Identity <-> Operation` já está aqui com a mesma natureza.
        'Identity' => [
            'Catalog\Models\Course',
            'Certification\Enums\CertificateDisplayStatus',
            'Certification\Services\StudentCertificateHistory',
            'Certification\Services\StudentCertificateSummary',
            'Commercial\Models\Client',
            'Operation\Enums\EnrollmentApprovalStatus',
            'Operation\Enums\TurmaStatus',
            'Operation\Models\Enrollment',
            'Operation\Models\Turma',
        ],
```

- [ ] **Step 8: Atualizar os quatro call sites existentes**

`fromModel` mudou de assinatura em dois DTOs. Ajuste:

- `backend/tests/Feature/Identity/StudentHistoryDataTest.php:87` — nenhuma mudança necessária: o segundo parâmetro de `StudentTurmaData::fromModel` tem default `null`. Acrescente ao final desse teste as duas asserções que provam o default:

```php
        $this->assertNull($data->certificate);
        $this->assertSame(0, $data->superseded_count);
```

- `backend/tests/Feature/Identity/StudentDataTest.php:63` — passe a coleção vazia:

```php
        $data = StudentDetailData::fromModel(
            $student->fresh(['user', 'currentClient', 'logs.client', 'enrollments.turma.quote', 'enrollments.turma.course']),
            new \Illuminate\Support\Collection,
        );
```

- `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php:160` e `:176` — mesma mudança: segundo argumento `new \Illuminate\Support\Collection`.

- [ ] **Step 9: Rodar os testes tocados e ver passar**

```bash
docker compose exec -T app php artisan test --filter=StudentDetailCertificatesTest
docker compose exec -T app php artisan test --filter=DomainDependencyTest
docker compose exec -T app php artisan test --filter="StudentDataTest|StudentHistoryDataTest|SoftDeletedRelationProjectionTest"
```

Esperado: todos PASS. `DomainDependencyTest` tem de passar nas quatro regras — se a Regra A reprovar com "camada Data é interna", algum arquivo de Identity importou `Certification\Data\…`: o import errado é o do VO.

- [ ] **Step 10: Provar que a catraca morde — as 3 arestas e a Regra C**

```bash
cd /home/jvbat/projetos/lotus/backend
# Regra B: some uma linha da matriz, o import continua no código
sed -i "s#'Certification\\\\Services\\\\StudentCertificateHistory',##" tests/Feature/Shared/DomainDependencyTest.php
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: FAIL com `Regra B — aresta fora da matriz`. Restaure com `git checkout -- backend/tests/Feature/Shared/DomainDependencyTest.php` e reaplique o Step 7 (ou use `git stash`/`git diff` para reverter só essa linha).

- [ ] **Step 11: Regenerar os tipos**

```bash
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: `generated.ts` ganha `CertificateDisplayStatus`, `StudentCertificateData`, e `StudentTurmaData` ganha `certificate` e `superseded_count`. **Não edite o arquivo à mão** (lei §5.3).

- [ ] **Step 12: Suíte inteira, Pint e commit**

```bash
docker compose exec -T app php artisan test
```

Esperado: **931 passed / 5 skipped** (922 + 9).

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Data/StudentCertificateData.php app/Domains/Identity/Data/StudentTurmaData.php app/Domains/Identity/Data/StudentDetailData.php app/Domains/Identity/Http/Controllers/StudentController.php tests/Feature/Identity/StudentDetailCertificatesTest.php tests/Feature/Identity/StudentDataTest.php tests/Feature/Identity/StudentHistoryDataTest.php tests/Feature/Shared/DomainDependencyTest.php tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Identity backend/tests frontend/src/shared/types/generated.ts
git commit -m "feat(identity): o certificado entra na linha de turma do detalhe do aluno"
```

---

### Task 4: `display_status` nos DTOs do módulo de certificados

O mesmo enum servindo o `/certificados` e a validação pública, para a derivação do React poder morrer na Task 6.

**Files:**
- Modify: `backend/app/Domains/Certification/Data/CertificateData.php`
- Modify: `backend/app/Domains/Certification/Data/PublicCertificateData.php`
- Test: `backend/tests/Feature/Certification/CertificateListingTest.php` (dois casos novos)
- Test: `backend/tests/Feature/Certification/PublicCertificateTest.php` (dois casos novos + o `assertExactJson` que o campo novo quebra)

**Interfaces:**
- Consumes: `CertificateDisplayStatus::for()` e `::hoje()` (Task 1).
- Produces: `CertificateData::$display_status` e `PublicCertificateData::$display_status`, ambos `CertificateDisplayStatus`, ambos `#[Computed]`.

- [ ] **Step 1: Escrever os testes que falham**

Em `backend/tests/Feature/Certification/CertificateListingTest.php`, acrescente os dois imports e os dois casos ao final da classe. O arquivo já tem o helper `createCertificate(CertificateStatus $status, string $codigo)` (linha 528), que amarra o certificado ao `$this->enrollment` do `setUp` e nasce com `valido_ate` nulo.

```php
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
```

```php
    /** O estado derivado é do BACKEND (spec D4): o React não o reconstrói. */
    public function test_a_listagem_traz_o_estado_derivado(): void
    {
        $certificate = $this->createCertificate(CertificateStatus::Emitido, 'LOT-2026-7001');

        $payload = CertificateData::fromModel($certificate->loadListingData());

        $this->assertSame(CertificateDisplayStatus::Vigente, $payload->display_status);
    }

    /** Peso legal: revogado NUNCA volta a parecer vigente por conta da data. */
    public function test_o_estado_derivado_respeita_a_precedencia_da_revogacao(): void
    {
        $certificate = $this->createCertificate(CertificateStatus::Revocado, 'LOT-2026-7002');
        $certificate->update(['valido_ate' => '2099-01-01']);

        $payload = CertificateData::fromModel($certificate->fresh()->loadListingData());

        $this->assertSame(CertificateDisplayStatus::Revocado, $payload->display_status);
    }
```

Em `backend/tests/Feature/Certification/PublicCertificateTest.php`, acrescente os dois casos. O `setUp` já monta `$this->certificate` como `emitido` com `valido_ate = '2027-08-05'` sob `Carbon::setTestNow('2026-08-05 14:30:00')` — quase um ano de folga, então `vigente`; e `publicUrl()` já resolve a rota (`/api/publico/certificados/{uuid}`).

```php
    /** O cartão do QR lê o estado do SERVIDOR: a rota que o fiscalizador abre
     * no celular não pode depender de o navegador derivar nada. */
    public function test_a_rota_publica_traz_o_estado_derivado(): void
    {
        $this->getJson($this->publicUrl())
            ->assertOk()
            ->assertJsonPath('display_status', 'vigente');
    }

    public function test_o_estado_derivado_da_rota_publica_respeita_a_revogacao(): void
    {
        $this->certificate->update([
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'Documento emitido con datos incorrectos.',
        ]);

        $this->getJson($this->publicUrl())
            ->assertOk()
            ->assertJsonPath('display_status', 'revocado');
    }
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter="CertificateListingTest|PublicCertificateTest"
```

Esperado: FAIL — `Undefined property … $display_status` nos dois primeiros, chave ausente no JSON nos dois últimos.

- [ ] **Step 3: Acrescentar o campo ao `CertificateData`**

Em `backend/app/Domains/Certification/Data/CertificateData.php`, acrescente o import e o parâmetro **antes** do `aluno_photo_url` (parâmetro sem default tem de vir antes de parâmetro com default):

```php
use App\Domains\Certification\Enums\CertificateDisplayStatus;
```

```php
        public string $created_at,
        /** O estado de EXIBIÇÃO, derivado no servidor (spec D4). O React
         * consumia `status` + `valido_ate` e refazia esta conta — regra de
         * domínio reconstruída no cliente, num documento de peso legal. */
        #[Computed]
        public CertificateDisplayStatus $display_status,
        /** Foto VIVA do aluno, deliberadamente fora do snapshot: é identidade
         * visual da listagem, não dado do documento congelado. */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $aluno_photo_url = null,
```

E, no `fromModel`, logo depois da linha `created_at:`:

```php
            display_status: CertificateDisplayStatus::for(
                $certificate->status,
                $certificate->valido_ate,
                CertificateDisplayStatus::hoje(),
            ),
```

- [ ] **Step 4: Acrescentar o campo ao `PublicCertificateData`**

Em `backend/app/Domains/Certification/Data/PublicCertificateData.php`, acrescente os imports e o parâmetro ao final do construtor:

```php
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use Spatie\LaravelData\Attributes\Computed;
```

```php
        /** @var array{name: string} */
        public array $redator,
        /** Mesmo estado derivado da listagem interna: o cartão do QR não
         * deriva nada no navegador. */
        #[Computed]
        public CertificateDisplayStatus $display_status,
```

E, no `fromModel`, ao final da chamada `new self(...)`:

```php
            display_status: CertificateDisplayStatus::for(
                $certificate->status,
                $certificate->valido_ate,
                CertificateDisplayStatus::hoje(),
            ),
```

- [ ] **Step 5: Consertar o `assertExactJson` que o campo novo quebra**

`PublicCertificateTest::test_uuid_valido_devolve_payload_publico_sem_autenticacao` usa `assertExactJson` — um campo novo no payload público **tem** de reprová-lo, e é por isso que a asserção é exata. Acrescente a linha ao array esperado, logo depois de `'valido_ate' => '2027-08-05',`:

```php
                'display_status' => 'vigente',
```

Não relaxe a asserção para `assertJson`: ela é a catraca que impede o payload público de ganhar campo sem decisão — o teste vizinho `test_payload_publico_nao_expoe_ruts_ids_ou_notas` existe pelo mesmo motivo.

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter="CertificateListingTest|PublicCertificateTest"
```

Esperado: PASS.

- [ ] **Step 7: Regenerar os tipos e rodar a suíte**

```bash
docker compose exec -T app php artisan typescript:transform
docker compose exec -T app php artisan test
```

Esperado: `generated.ts` com `display_status` em `CertificateData` e `PublicCertificateData`; suíte **935 passed / 5 skipped** (931 + 4).

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Certification/Data/CertificateData.php app/Domains/Certification/Data/PublicCertificateData.php tests/Feature/Certification/CertificateListingTest.php tests/Feature/Certification/PublicCertificateTest.php
cd /home/jvbat/projetos/lotus
git add backend/app/Domains/Certification/Data backend/tests/Feature/Certification frontend/src/shared/types/generated.ts
git commit -m "feat(certification): o estado derivado viaja nos DTOs de certificado"
```

---

### Task 5: As três peças que sobem para `shared/`

Duas features passam a precisar da mesma coisa, e feature não importa feature (lei §5.6). Cada peça tem precedente no repositório.

**Files:**
- Create: `frontend/src/shared/lib/certificateStatus.ts`
- Create: `frontend/src/shared/api/certificatesApi.ts`
- Create: `frontend/src/shared/hooks/useBlobTabOpener.ts`
- Test: `frontend/src/shared/hooks/useBlobTabOpener.test.tsx`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Modify: `frontend/src/features/certification/api/certificatesApi.ts` (remove `useCertificatePdf`)
- Modify: `frontend/src/features/certification/hooks/useCertificatePdfOpener.ts` (passa a compor)

**Interfaces:**
- Consumes: `CertificateDisplayStatus` de `@shared/types/generated` (Task 4).
- Produces: `CERTIFICATE_STATUS_SEVERITY: Record<CertificateDisplayStatus, 'success'|'warning'|'secondary'|'danger'>`; `certificateStatusLabelKey(status: CertificateDisplayStatus): string`; `useCertificatePdf()` (mutation `Blob` por `number`); `useBlobTabOpener<TVariables>(mutation): { open(variables: TVariables): void; pending: boolean; popupBlocked: boolean; message: string | null }`.

- [ ] **Step 1: Escrever o teste do mecanismo**

Crie `frontend/src/shared/hooks/useBlobTabOpener.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProblemDetails } from '@shared/api/axios'
import { useBlobTabOpener } from './useBlobTabOpener'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const criar = vi.fn(() => 'blob:fake-url')
const revogar = vi.fn()

beforeEach(() => {
  criar.mockClear()
  revogar.mockClear()
  URL.createObjectURL = criar as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = revogar as unknown as typeof URL.revokeObjectURL
})

afterEach(() => {
  vi.restoreAllMocks()
})

function montar(fetchBlob: (id: number) => Promise<Blob>) {
  return renderHook(
    () => {
      // `ProblemDetails`, e não uma forma qualquer: `useBlobTabOpener` exige
      // `UseMutationResult<Blob, ProblemDetails, TVariables>`, e um erro de
      // outro tipo reprova no `tsc -b` antes de o teste rodar.
      const mutation = useMutation<Blob, ProblemDetails, number>({ mutationFn: fetchBlob })
      return useBlobTabOpener(mutation)
    },
    { wrapper },
  )
}

describe('useBlobTabOpener', () => {
  /** A aba abre ANTES da requisição de propósito: `window.open` fora do gesto
   * do usuário é bloqueado pelo navegador. */
  it('abre a aba antes de pedir o blob e aponta a aba para o objectURL', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    const open = vi.fn(() => tab)
    vi.stubGlobal('open', open)

    const { result } = montar(async () => new Blob(['%PDF']))
    act(() => result.current.open(7))

    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    await waitFor(() => expect(tab.location.href).toBe('blob:fake-url'))
    expect(tab.opener).toBeNull()
  })

  /** Popup bloqueado avisa, em vez de o botão só parar de carregar. */
  it('sinaliza popup bloqueado e não dispara a requisição', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    const fetchBlob = vi.fn(async () => new Blob(['%PDF']))

    const { result } = montar(fetchBlob)
    act(() => result.current.open(7))

    await waitFor(() => expect(result.current.popupBlocked).toBe(true))
    expect(fetchBlob).not.toHaveBeenCalled()
  })

  it('fecha a aba quando a requisição falha', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result } = montar(async () => {
      throw {
        type: 'https://lotus.cl/errors/forbidden',
        title: 'Sem permissão',
        status: 403,
        detail: 'Sem permissão para ver este certificado.',
        instance: '/api/certificates/7/pdf',
      } satisfies ProblemDetails
    })
    act(() => result.current.open(7))

    await waitFor(() => expect(tab.close).toHaveBeenCalled())
    expect(result.current.message).not.toBeNull()
  })

  /** Um objectURL vivo por vez, e nenhum sobrevivendo ao unmount. */
  it('revoga o objectURL no unmount', async () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} as unknown }
    vi.stubGlobal('open', vi.fn(() => tab))

    const { result, unmount } = montar(async () => new Blob(['%PDF']))
    act(() => result.current.open(7))
    await waitFor(() => expect(criar).toHaveBeenCalled())

    unmount()

    expect(revogar).toHaveBeenCalledWith('blob:fake-url')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test -- useBlobTabOpener
```

Esperado: FAIL — o módulo `./useBlobTabOpener` não existe.

- [ ] **Step 3: Escrever o mecanismo compartilhado**

Crie `frontend/src/shared/hooks/useBlobTabOpener.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useMutationErrors } from './useEntityForm'

/**
 * Abre um blob autenticado numa aba nova.
 *
 * A aba é aberta ANTES da requisição, de propósito: `window.open` fora do
 * gesto do usuário é bloqueado pelo navegador. Se o bloqueio acontecer mesmo
 * assim, `popupBlocked` avisa em vez de o botão só parar de carregar. O
 * objectURL é revogado no unmount para não vazar.
 *
 * Mora em `shared/hooks` porque duas features precisam do mesmo mecanismo —
 * `certification` (PDF do certificado) e `identity` (o mesmo PDF, pela coluna
 * do detalhe do aluno) — e feature não importa feature, nem para tipo
 * (ADR-05). Seria a terceira cópia do mesmo código: o docblock do segundo
 * clone já declarava, por escrito, que era clone.
 *
 * O `useEffect` daqui é liberação de recurso no unmount, não sincronização de
 * estado — não cai na proibição de `useEffect` + `setState` da rule.
 */
export function useBlobTabOpener<TVariables>(
  mutation: UseMutationResult<Blob, ProblemDetails, TVariables>,
) {
  const { message } = useMutationErrors([mutation.error])
  const urlRef = useRef<string | null>(null)
  const tabRef = useRef<Window | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      tabRef.current?.close()
    },
    [],
  )

  const open = (variables: TVariables) => {
    setPopupBlocked(false)
    const tab = window.open('about:blank', '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }

    tab.opener = null
    tabRef.current = tab
    mutation.mutate(variables, {
      onSuccess: (blob) => {
        // Um objectURL vivo por vez: o anterior morre quando o próximo nasce.
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        tab.location.href = urlRef.current
        tabRef.current = null
      },
      onError: () => {
        tab.close()
        tabRef.current = null
      },
    })
  }

  return { open, pending: mutation.isPending, popupBlocked, message }
}
```

- [ ] **Step 4: Escrever a mutation compartilhada**

Crie `frontend/src/shared/api/certificatesApi.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import { api } from './axios'
import type { ProblemDetails } from './axios'
import { problemFromBlob } from './problemFromBlob'

/**
 * O PDF do certificado como blob autenticado (a rota exige o cookie de
 * sessão).
 *
 * Mora em `shared/api` — e não em `features/certification/api` — porque duas
 * features o pedem: o Historial e a coluna de certificado no detalhe do aluno.
 * Mesmo lugar e mesmo motivo de `shared/api/studentsApi.ts` e
 * `shared/api/redatoresApi.ts`.
 *
 * O gate NÃO muda com a mudança de lugar: `GET /api/certificates/{id}/pdf`
 * segue exigindo `certification.certificate.view` (spec §7).
 */
export function useCertificatePdf() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (id) =>
      api
        .get<Blob>(`/api/certificates/${id}/pdf`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
```

- [ ] **Step 5: Escrever o mapa de severidade e rótulo**

Crie `frontend/src/shared/lib/certificateStatus.ts`:

```ts
import type { CertificateDisplayStatus } from '@shared/types/generated'

/**
 * Estado de exibição do certificado: severidade e rótulo.
 *
 * O que sobe para cá é só a APRESENTAÇÃO. A derivação não subiu — ela morreu:
 * o estado agora vem do servidor em `display_status` (spec D4), e o
 * `certStatus()` que a refazia no React saiu de
 * `features/certification/lib/certStatus.ts`.
 *
 * Mora em `shared/lib` pelo mesmo motivo de `enrollmentStatus.ts`: duas
 * features consomem — `certification` (Historial, cartão do QR) e `identity`
 * (coluna do detalhe do aluno) — e feature não importa feature, nem para tipo
 * (ADR-05). Mesmo molde do `DOC_STATUS_SEVERITY` em `redatorStatus.ts`.
 *
 * `Record` fechado, não `Record<string, …>` com fallback: valor novo no enum
 * tem de reprovar o type-check, não sumir em silêncio numa cor padrão.
 */
export const CERTIFICATE_STATUS_SEVERITY: Record<
  CertificateDisplayStatus,
  'success' | 'warning' | 'secondary' | 'danger'
> = {
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'secondary',
  revocado: 'danger',
}

/** Chave i18n do rótulo; o componente traduz. */
export function certificateStatusLabelKey(status: CertificateDisplayStatus): string {
  return `certificate.status.${status}`
}
```

- [ ] **Step 6: Exportar nos dois barris**

Em `frontend/src/shared/lib/index.ts`, acrescente após a linha `export * from './archivable'`:

```ts
export * from './certificateStatus'
```

Em `frontend/src/shared/hooks/index.ts`, acrescente após a linha do `useArchiveAction`:

```ts
export { useBlobTabOpener } from './useBlobTabOpener'
```

- [ ] **Step 7: Tirar a mutation da feature e recompor o opener**

Em `frontend/src/features/certification/api/certificatesApi.ts`, **apague** a função `useCertificatePdf` inteira (últimas 11 linhas do arquivo) e remova o import de `problemFromBlob`, que fica órfão.

Substitua `frontend/src/features/certification/hooks/useCertificatePdfOpener.ts` por:

```ts
import { useBlobTabOpener } from '@shared/hooks'
import { useCertificatePdf } from '@shared/api/certificatesApi'

/**
 * Abre o PDF do certificado numa aba nova.
 *
 * O mecanismo (blob autenticado, aba aberta ANTES da requisição, objectURL
 * revogado no unmount) mora em `shared/hooks/useBlobTabOpener`. Este hook é só
 * a composição com a mutation do certificado, e mantém a assinatura antiga —
 * `open()` sem argumento, com o id capturado — para os chamadores não mudarem.
 *
 * Antes daqui havia um clone de `useTurmaManualOpener` copiado inteiro, com o
 * docblock declarando que era clone. `useTurmaManualOpener` NÃO foi migrado
 * neste bloco: a metade dele que baixa o DOCX divide o mesmo controle de
 * objectURL com a que abre o PDF, e desmontar isso é mudança própria, com
 * risco próprio.
 */
export function useCertificatePdfOpener(certificateId: number) {
  const opener = useBlobTabOpener(useCertificatePdf())

  return {
    open: () => opener.open(certificateId),
    pending: opener.pending,
    popupBlocked: opener.popupBlocked,
    message: opener.message,
  }
}
```

- [ ] **Step 8: Rodar o teste, o lint e o build**

```bash
cd frontend
pnpm test -- useBlobTabOpener
pnpm lint
pnpm build
```

Esperado: teste PASS (4 casos), lint limpo, build verde. Se o build acusar `useCertificatePdf` não exportado de `../api/certificatesApi`, sobrou um import antigo — `grep -rn "useCertificatePdf" src` mostra onde.

- [ ] **Step 9: Suíte inteira e commit**

```bash
cd frontend && pnpm test
```

Esperado: **101 arquivos / 559 testes** (100+1 arquivos, 555+4 testes).

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared frontend/src/features/certification
git commit -m "refactor(frontend): o mecanismo de abrir blob, a mutation do PDF e o mapa de estado sobem para shared"
```

---

### Task 6: A derivação do React morre

Seis consumidores trocam `certStatus(c)` por `c.display_status`. O que sai não é movido: é apagado.

**Files:**
- Modify: `frontend/src/features/certification/lib/certStatus.ts` (só `rowCertKind` sobrevive)
- Modify: `frontend/src/features/certification/hooks/useHistorial.ts`
- Modify: `frontend/src/features/certification/hooks/useValidationPage.ts`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx`
- Modify: `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx`
- Modify: `frontend/src/features/certification/hooks/useValidationPage.test.tsx`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.test.tsx`

**Interfaces:**
- Consumes: `CERTIFICATE_STATUS_SEVERITY`, `certificateStatusLabelKey` (Task 5); `display_status` nos DTOs (Task 4).
- Produces: nada novo. `features/certification/lib/certStatus.ts` fica só com `RowCertKind` e `rowCertKind` — que **permanecem**: são a classificação do painel de emissão, outra pergunta e outro DTO (spec §9).

- [ ] **Step 1: Enxugar o `certStatus.ts`**

Substitua `frontend/src/features/certification/lib/certStatus.ts` inteiro por:

```ts
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'

export type RowCertKind = 'sin_emitir' | 'emitido' | 'no_corresponde'

/** Que célula a linha do painel de emissão mostra na coluna Certificado:
 * já tem certificado emitido, está pendente de emissão (aprovado, sem
 * certificado ainda) ou não corresponde (reprovado/pendente — nunca vai
 * emitir enquanto o estado acadêmico não mudar).
 *
 * NÃO migrou para `display_status` junto com o resto: esta pergunta é sobre a
 * MATRÍCULA no painel de emissão, não sobre o estado de um certificado que
 * existe — outro DTO (`EmissionPanelEnrollmentData`) e outra pergunta.
 *
 * O `certStatus()` que morava aqui foi apagado, não movido: o estado derivado
 * agora vem do servidor em `display_status` (spec D4), porque duas
 * implementações de "vigente" num documento de peso legal são respostas
 * esperando para divergir. O mapa de severidade vive em
 * `shared/lib/certificateStatus.ts`. */
export function rowCertKind(e: EmissionPanelEnrollmentData): RowCertKind {
  if (e.certificate) return 'emitido'
  return e.approval_status === 'aprobado' ? 'sin_emitir' : 'no_corresponde'
}
```

- [ ] **Step 2: Migrar o `useHistorial`**

Em `frontend/src/features/certification/hooks/useHistorial.ts`:

- troque o import `import { certStatus, type CertDerivedStatus } from '../lib/certStatus'` por
  `import type { CertificateDisplayStatus } from '@shared/types/generated'` (junte ao import de tipos gerados que já existe na linha 3);
- troque as três ocorrências de `CertDerivedStatus` por `CertificateDisplayStatus`;
- troque `statusFilter ? (c) => certStatus(c) === statusFilter : undefined` por
  `statusFilter ? (c) => c.display_status === statusFilter : undefined`;
- troque os quatro contadores:

```ts
  const statusSummary = {
    vigentes: table.rows.filter((c) => c.display_status === 'vigente').length,
    porVencer: table.rows.filter((c) => c.display_status === 'por_vencer').length,
    vencidos: table.rows.filter((c) => c.display_status === 'vencido').length,
    revocados: table.rows.filter((c) => c.display_status === 'revocado').length,
  }
```

- no docblock da função, troque `` `where` derivado de `certStatus` `` por `` `where` sobre o `display_status` do servidor ``.

- [ ] **Step 3: Migrar o `useValidationPage`**

Em `frontend/src/features/certification/hooks/useValidationPage.ts`, apague o import de `certStatus` e troque:

```ts
  const cert = query.data
  if (cert.display_status === 'revocado') return { kind: 'revoked', cert }
  if (cert.display_status === 'vencido') return { kind: 'expired', cert }
  return { kind: 'valid', cert }
```

- [ ] **Step 4: Migrar a `HistorialTable`**

Em `frontend/src/features/certification/components/Historial/HistorialTable.tsx`:

- troque o import da lib da feature por `import { formatDate, CERTIFICATE_STATUS_SEVERITY, certificateStatusLabelKey } from '@shared/lib'` (juntando ao `formatDate` que já vem de lá) e acrescente `CertificateDisplayStatus` ao import de tipos gerados;
- troque `const STATUSES: CertDerivedStatus[]` por `const STATUSES: CertificateDisplayStatus[]`;
- na coluna de estado:

```tsx
          body={(c: CertificateData) => {
            if (!c.snapshot_ok) return <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
            return (
              <AppTag
                severity={CERTIFICATE_STATUS_SEVERITY[c.display_status]}
                value={t(certificateStatusLabelKey(c.display_status))}
              />
            )
          }}
```

- na coluna de ações, troque `const status = certStatus(c)` por `const status = c.display_status`.

> O comentário da coluna de estado — sobre o snapshot corrompido não virar um quinto valor — **permanece**, com uma correção: onde diz "`certStatus` derivaria", passa a dizer "o servidor deriva".

- [ ] **Step 5: Migrar o `CertificateViewDialog`**

Em `frontend/src/features/certification/components/Historial/CertificateViewDialog.tsx`:

- apague `import { certStatus, STATUS_SEVERITY } from '../../lib/certStatus'`;
- acrescente `CERTIFICATE_STATUS_SEVERITY` e `certificateStatusLabelKey` ao import de `@shared/lib`;
- troque `const status = certificate ? certStatus(certificate) : null` por `const status = certificate?.display_status ?? null`;
- troque a linha da tag por:

```tsx
            value={<AppTag severity={CERTIFICATE_STATUS_SEVERITY[status]} value={t(certificateStatusLabelKey(status))} />}
```

- [ ] **Step 6: Atualizar as fixtures dos testes**

O `tsc -b` é quem lista o que falta. Rode primeiro:

```bash
cd frontend && pnpm build
```

Ajuste o que ele acusar. O esperado, medido em `main@cad0d1fb`:

- `useValidationPage.test.tsx` — `certWith()` monta um `PublicCertificateData` literal (sem cast), então ganha `display_status: 'vigente'` no default; e cada caso passa o estado que prova, em vez da data:
  ```ts
  get.mockResolvedValue({ data: certWith({ status: 'revocado', valido_ate: FUTURO, display_status: 'revocado' }) })
  ```
  O comentário sobre `FUTURO`/`PASSADO` estarem "bem afastados de hoje para não cair na janela `por_vencer`" perde o sentido — o hook não olha mais a data. Troque-o por: `// As datas ficam só como dado do DTO: quem decide o estado agora é o servidor, em `display_status`.`
- `ValidationPage.test.tsx` — a constante `CERT` ganha `display_status: 'vigente'`.
- `HistorialTable.test.tsx` — a fábrica `certificado()` usa `as unknown as CertificateData`, então compila sem o campo; acrescente `display_status: 'vigente'` mesmo assim, porque a coluna de estado agora o lê e o caso do snapshot corrompido tem de provar que a tag de defeito ganha do estado.
- `CertificateViewDialog.test.tsx` — só exercita o caminho de erro com `certificate: null`; deve passar sem mudança. Se o build acusar algo, ajuste.

- [ ] **Step 7: Provar que nada de `certStatus` sobrou**

```bash
cd frontend && grep -rn "certStatus\|STATUS_SEVERITY\|CertDerivedStatus\|POR_VENCER_DIAS" src
```

Esperado: só `rowCertKind` (em `certStatus.ts`, `useEmissionPanelState.ts`, `EmissionStudentsTable.tsx`, `useBatchIssue.ts`), o `STATUS_SEVERITY` **local** do `EmissionStudentsTable.tsx` (é de `EnrollmentApprovalStatus`, outra coisa) e o `DOC_STATUS_SEVERITY` do `redatorStatus.ts`. Nenhuma ocorrência de `certStatus(` como chamada.

- [ ] **Step 8: Lint, build, suíte e commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: **101 arquivos / 559 testes**, todos passando (a task não acrescenta nem remove teste — só migra).

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/certification
git commit -m "refactor(certification): o estado derivado passa a vir do servidor e a derivação local morre"
```

---

### Task 7: A coluna no detalhe do aluno

A entrega visível: quinta coluna na tabela de turmas, com os quatro ramos da célula e as três chaves i18n novas.

**Files:**
- Create: `frontend/src/features/identity/hooks/useStudentCertificatePdfOpener.ts`
- Create: `frontend/src/features/identity/components/Student/StudentCertificateCell.tsx`
- Test: `frontend/src/features/identity/components/Student/StudentCertificateCell.test.tsx`
- Modify: `frontend/src/features/identity/components/Student/StudentDetailSections.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`

**Interfaces:**
- Consumes: `StudentTurmaData.certificate` e `.superseded_count` (Task 3); `CERTIFICATE_STATUS_SEVERITY`, `certificateStatusLabelKey`, `useBlobTabOpener`, `useCertificatePdf` (Task 5).
- Produces: `StudentCertificateCell({ turma }: { turma: StudentTurmaData })`; `useStudentCertificatePdfOpener()` devolvendo `{ open(certificateId: number): void; pending: boolean; popupBlocked: boolean; message: string | null }`.

- [ ] **Step 1: Escrever o teste da célula**

Crie `frontend/src/features/identity/components/Student/StudentCertificateCell.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { StudentTurmaData } from '@shared/types/generated'
import { StudentCertificateCell } from './StudentCertificateCell'

/** `t` devolve a chave: o que se prova é QUAL texto a célula escolhe, não a
 * tradução (isso é do `parity.test.ts`). */
vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

function turma(over: Partial<StudentTurmaData> = {}): StudentTurmaData {
  return {
    turma_id: 1,
    quote_code: 'Scap 9-1',
    course_name: 'Alta Tensión',
    start_date: '2026-07-20',
    approval_status: 'aprobado',
    certificate: null,
    superseded_count: 0,
    ...over,
  }
}

function certificado(over: Partial<NonNullable<StudentTurmaData['certificate']>> = {}) {
  return {
    id: 10,
    codigo: 'LOT-2026-0001',
    display_status: 'vigente' as const,
    valido_ate: null,
    snapshot_ok: true,
    ...over,
  }
}

const montar = (t: StudentTurmaData) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StudentCertificateCell turma={t} />
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('StudentCertificateCell', () => {
  /** Ramo 1, o caso comum: vigência indeterminada mostra o rótulo SEM data. */
  it('certificado sem prazo mostra código e estado, e nenhuma data', () => {
    montar(turma({ certificate: certificado() }))

    expect(screen.getByText('LOT-2026-0001')).toBeTruthy()
    expect(screen.getByText('certificate.status.vigente')).toBeTruthy()
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/)).toBeNull()
  })

  /** O rótulo é o MESMO com e sem prazo (spec D6); a data ao lado é o que
   * distingue os dois. */
  it('certificado com prazo mostra a data ao lado do estado', () => {
    montar(turma({ certificate: certificado({ valido_ate: '2027-01-31', display_status: 'por_vencer' }) }))

    expect(screen.getByText('certificate.status.por_vencer')).toBeTruthy()
    expect(screen.getByText(/2027/)).toBeTruthy()
  })

  it('certificado revogado aparece, não some', () => {
    montar(turma({ certificate: certificado({ display_status: 'revocado' }) }))

    expect(screen.getByText('certificate.status.revocado')).toBeTruthy()
  })

  it('certificado vencido aparece com o estado do servidor', () => {
    montar(turma({ certificate: certificado({ display_status: 'vencido', valido_ate: '2020-01-01' }) }))

    expect(screen.getByText('certificate.status.vencido')).toBeTruthy()
  })

  /** Ramo 4: documento corrompido não tem estado a afirmar — a tag de defeito
   * ocupa o lugar da de estado. Política herdada do Historial, não inventada. */
  it('snapshot corrompido troca a tag de estado pela de defeito', () => {
    montar(turma({ certificate: certificado({ snapshot_ok: false }) }))

    expect(screen.getByText('certificate.snapshotCorrupted')).toBeTruthy()
    expect(screen.queryByText('certificate.status.vigente')).toBeNull()
  })

  /** Rastro de reemissão: o atual mais a contagem dos anteriores (spec D8). */
  it('reemissão mostra a contagem dos anteriores', () => {
    montar(turma({ certificate: certificado(), superseded_count: 2 }))

    expect(screen.getByText('student.certificateSuperseded')).toBeTruthy()
  })

  it('sem reemissão não mostra contagem', () => {
    montar(turma({ certificate: certificado(), superseded_count: 0 }))

    expect(screen.queryByText('student.certificateSuperseded')).toBeNull()
  })

  /** Ramos 2 e 3: as duas ausências têm significados OPOSTOS e não podem
   * parecer iguais. */
  it('matrícula aprovada sem certificado fica pendente de emissão', () => {
    montar(turma({ approval_status: 'aprobado', certificate: null }))

    expect(screen.getByText('student.certificatePending')).toBeTruthy()
  })

  it('matrícula reprovada não corresponde', () => {
    montar(turma({ approval_status: 'reprobado', certificate: null }))

    expect(screen.getByText(/student.certificateNotApplicable/)).toBeTruthy()
  })

  it('matrícula pendente não corresponde', () => {
    montar(turma({ approval_status: 'pendiente', certificate: null }))

    expect(screen.getByText(/student.certificateNotApplicable/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test -- StudentCertificateCell
```

Esperado: FAIL — o módulo `./StudentCertificateCell` não existe.

- [ ] **Step 3: Escrever o hook do PDF**

Crie `frontend/src/features/identity/hooks/useStudentCertificatePdfOpener.ts`:

```ts
import { useBlobTabOpener } from '@shared/hooks'
import { useCertificatePdf } from '@shared/api/certificatesApi'

/**
 * Abre o PDF do certificado da linha, numa aba nova.
 *
 * A mutation e o mecanismo vêm de `shared/` porque `identity` não pode
 * importar `certification` — nem para tipo (ADR-05). A composição fica num
 * hook, e não no componente, porque componente de feature não chama
 * query/mutation direto (rule `frontend-fsliced.md`).
 *
 * Um hook por LINHA: cada célula tem o próprio `pending` e o próprio aviso de
 * popup bloqueado, que é o que a interface precisa dizer — o certificado que
 * falhou é o daquela linha, não o da tabela.
 */
export function useStudentCertificatePdfOpener() {
  return useBlobTabOpener(useCertificatePdf())
}
```

- [ ] **Step 4: Escrever a célula**

Crie `frontend/src/features/identity/components/Student/StudentCertificateCell.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppTag, AppButton } from '@shared/ui'
import type { StudentTurmaData } from '@shared/types/generated'
import {
  CERTIFICATE_STATUS_SEVERITY,
  certificateStatusLabelKey,
  formatDate,
} from '@shared/lib'
import { dangerText } from '@shared/styles/tokens'
import { useStudentCertificatePdfOpener } from '../../hooks/useStudentCertificatePdfOpener'

/**
 * A coluna Certificado da tabela de turmas do aluno. Quatro ramos, e a ordem
 * entre eles é a regra:
 *
 * 1. snapshot corrompido — tag de defeito, SEM afirmar estado. Documento que
 *    não sustenta nem o nome do aluno não tem estado a declarar; as datas
 *    continuam válidas e diriam "vigente" sobre um documento quebrado.
 *    Política herdada do Historial, e o defeito NÃO é um quinto valor do enum;
 * 2. certificado presente — código, estado, data (só quando há prazo) e o PDF;
 * 3. aprovado sem certificado — "pendente de emissão";
 * 4. o resto — "não corresponde".
 *
 * Os ramos 3 e 4 têm significados OPOSTOS e por isso não dividem um traço só:
 * um diz "falta emitir", o outro diz "não vai emitir". A distinção lê apenas
 * `certificate === null` e o `approval_status` que a linha já traz (spec D7).
 */
export function StudentCertificateCell({ turma }: { turma: StudentTurmaData }) {
  const { t } = useTranslation()
  const pdf = useStudentCertificatePdfOpener()
  const certificate = turma.certificate

  if (certificate === null) {
    return turma.approval_status === 'aprobado' ? (
      <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('student.certificatePending')}
      </span>
    ) : (
      <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        — {t('student.certificateNotApplicable')}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm">{certificate.codigo}</span>
        {certificate.snapshot_ok ? (
          <AppTag
            severity={CERTIFICATE_STATUS_SEVERITY[certificate.display_status]}
            value={t(certificateStatusLabelKey(certificate.display_status))}
          />
        ) : (
          <AppTag severity="danger" value={t('certificate.snapshotCorrupted')} />
        )}
        <AppButton
          icon="pi pi-file-pdf"
          text
          aria-label={t('certificate.downloadPdf')}
          loading={pdf.pending}
          onClick={() => pdf.open(certificate.id)}
        />
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {/* Data SÓ quando há prazo: vigência indeterminada é o padrão, e um
            traço no lugar da data faria "sem prazo" parecer dado faltando. */}
        {certificate.valido_ate && <span>{formatDate(new Date(`${certificate.valido_ate}T00:00:00`))}</span>}
        {turma.superseded_count > 0 && (
          <span>{t('student.certificateSuperseded', { count: turma.superseded_count })}</span>
        )}
      </div>

      {/* Um aviso só, na forma que o `IssuedDialog` e o `CertificateViewDialog`
          já usam: popup bloqueado tem texto próprio, o resto é a mensagem do
          erro. Cor pelo token, nunca literal (ADR-16). */}
      {(pdf.popupBlocked || pdf.message) && (
        <span className="text-xs" style={{ color: dangerText }}>
          {pdf.popupBlocked ? t('certificate.popupBlocked') : pdf.message}
        </span>
      )}
    </div>
  )
}
```

> As chaves `certificate.downloadPdf` e `certificate.popupBlocked` já existem nas três locales (medido em `main@cad0d1fb`, `es-CL.json:867` e `:902`) — a célula as reusa em vez de criar chave nova para o mesmo texto. Só as quatro do Step 5 nascem aqui.

- [ ] **Step 5: As três chaves i18n, nas três locales**

Em `frontend/src/shared/config/locales/es-CL.json`, no objeto `student`, depois de `"turmaStatus"`:

```json
    "turmaCertificate": "Certificado",
    "certificatePending": "Pendiente de emisión",
    "certificateNotApplicable": "No corresponde",
    "certificateSuperseded_one": "+{{count}} ant.",
    "certificateSuperseded_other": "+{{count}} ant.",
```

Em `en.json`:

```json
    "turmaCertificate": "Certificate",
    "certificatePending": "Pending issuance",
    "certificateNotApplicable": "Not applicable",
    "certificateSuperseded_one": "+{{count}} prev.",
    "certificateSuperseded_other": "+{{count}} prev.",
```

Em `pt-BR.json`:

```json
    "turmaCertificate": "Certificado",
    "certificatePending": "Pendente de emissão",
    "certificateNotApplicable": "Não corresponde",
    "certificateSuperseded_one": "+{{count}} ant.",
    "certificateSuperseded_other": "+{{count}} ant.",
```

> São **quatro** chaves, não três: a spec §6.1 contava as três da célula e não contava o cabeçalho da coluna nova (`turmaCertificate`), que também não pode ser texto cru. `certificateSuperseded` usa o sufixo de plural do i18next (`_one`/`_other`) porque interpola `count` — sem os dois sufixos, o i18next não resolve a chave e a tela imprime o nome dela. Confira o molde em `student.count_one`/`count_other`, que já existe no mesmo namespace.

- [ ] **Step 6: Rodar o teste da célula e ver passar**

```bash
cd frontend && pnpm test -- StudentCertificateCell
```

Esperado: PASS, 10 casos.

- [ ] **Step 7: Plugar a coluna na tabela**

Em `frontend/src/features/identity/components/Student/StudentDetailSections.tsx` — o arquivo usa aspas duplas e ponto e vírgula; siga o estilo local:

- acrescente o import:

```tsx
import { StudentCertificateCell } from "./StudentCertificateCell";
```

- acrescente a quinta coluna, depois da de estado, e dê largura em porcentagem às cinco (a tabela vive dentro do `StudentDialog`, não numa página cheia — molde que a lane-c fixou na `TurmasTable` em 2026-08-24):

```tsx
          <AppColumn
            header={t("student.turmaCertificate")}
            body={(turma: StudentTurmaData) => (
              <StudentCertificateCell turma={turma} />
            )}
            style={{ width: "32%" }}
          />
```

E dê às quatro colunas existentes, na ordem em que aparecem, `style={{ width: "14%" }}`, `style={{ width: "26%" }}`, `style={{ width: "14%" }}` e `style={{ width: "14%" }}`. Os números são o ponto de partida; a medição nos três viewports é a Task 8, e é ela que os fecha.

- [ ] **Step 8: Lint, build, suíte e commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: **102 arquivos / 569 testes** (101+1 arquivos, 559+10 testes).

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity frontend/src/shared/config/locales
git commit -m "feat(identity): coluna de certificado na tabela de turmas do detalhe do aluno"
```

---

### Task 8: DoD no navegador, largura e pendências

Build verde não conta (lei §5.8). Esta task prova comportamento contra a API real e fecha o rastro documental.

**Files:**
- Modify: `frontend/src/features/identity/components/Student/StudentDetailSections.tsx` (larguras, se a medição pedir)
- Modify: `docs/superpowers/pendencias/README.md`, `abertas.md`, `encerradas.md`

**Interfaces:**
- Consumes: tudo o que as Tasks 1–7 entregaram.
- Produces: nenhum código novo obrigatório — a saída é a prova e o rastro.

- [ ] **Step 1: Subir o ambiente com dado real**

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d
docker compose exec -T app php artisan migrate --seed
cd frontend && pnpm dev
```

Backend em http://localhost:8080, frontend em http://localhost:5173. Se a base semeada não tiver um curso com `validity_months`, crie um pela interface de cursos (ou por tinker) antes do item 2 — a spec §2.5 registra que vigência indeterminada é o padrão e o prazo é exceção de um curso isolado, então o cenário com prazo precisa ser montado de propósito.

- [ ] **Step 2: Os oito itens do DoD**

Percorra e registre o resultado de cada um. Reprovou qualquer item, corrija antes de seguir — este é o gate do bloco.

1. **Certificado de curso sem prazo** → a célula mostra código + `Vigente`, **sem data**.
2. **Certificado de curso com `validity_months`** → a data aparece, e o estado é `por_vencer`/`vencido` conforme o dado real do banco (não conforme o que se espera).
3. **Revogar e reemitir de verdade pelo `/certificados`** → volte ao detalhe do aluno: a linha mostra o certificado NOVO e `+1 ant.`.
4. **Matrícula aprovada sem certificado** → `Pendiente de emisión`. **Reprovada** → `— No corresponde`.
5. **Abrir o PDF pela coluna** → aba nova com o PDF certo. Confira com `pdfinfo` (Poppler está no host e no container):
   ```bash
   pdfinfo ~/Downloads/<arquivo>.pdf
   pdftoppm -png -r 144 -f 1 -l 1 ~/Downloads/<arquivo>.pdf /tmp/pdf-page
   ```
   Leia `/tmp/pdf-page-1.png` e confirme que é o certificado daquele aluno. Gere só a página 1 e sempre em `/tmp`.
6. **N+1 medido na ponta**: com o Laravel Debugbar ou pelo log de query, a contagem do `GET /api/students/{id}` é a MESMA para um aluno com 1 e com 10 matrículas. (O `StudentDetailCertificatesTest::test_o_show_nao_ganha_query_por_matricula` já prova isso na suíte; aqui é a confirmação contra a base real.)
7. **`/certificados` intacto após a migração**: o filtro por estado funciona nos quatro valores, os quatro contadores do rodapé batem com a lista, e a validação pública do QR abre e mostra o estado certo (inclusive um revogado).
8. **Largura e idioma**: a tabela dentro do `StudentDialog`, nos **três** viewports (largo, compacto, estreito), sem truncamento e sem barra horizontal na página; e a coluna percorrida nos **três** idiomas com o seletor, **sem F5** — nenhuma chave crua, incluindo a marca de reemissão com a contagem interpolada.

- [ ] **Step 3: Ajustar as larguras, se a medição pediu**

Se o item 8 reprovou, ajuste os percentuais no `StudentDetailSections.tsx` e **repita a medição nos três viewports**. Não aceite "melhorou" — o critério é zero truncamento.

- [ ] **Step 4: Fechar a P-15 e abrir a pendência do fuso**

Em `docs/superpowers/pendencias/`:

- **Encerre a P-15** (mova a ficha de `abertas.md` para `encerradas.md`, e atualize a linha dela no `README.md`). Razão a registrar: *a decisão que ela esperava foi tomada em 2026-08-24 — expor certificados no DETALHE do aluno, como coluna da tabela de turmas. A coluna `CERTIFICADOS` na LISTAGEM fica fora por escrito (spec §9), para a pendência não reabrir por omissão.*
- **Abra a pendência nova**, com o número seguinte livre: *`backend/config/app.php:75` fixa `'timezone' => 'UTC'` como literal, sem `env()`, e por isso o `APP_TIMEZONE=America/Santiago` do `.env.example:8` é ignorado. Toda data derivada no servidor roda em UTC. O alcance conhecido hoje é pequeno — só certificado com prazo, que é exceção, e o `CertificateDisplayStatus` já declara o fuso explicitamente para não herdar o errado —, mas o defeito é global e alcança qualquer derivação de data futura.*

Siga o formato das fichas já existentes nos três arquivos.

- [ ] **Step 5: As duas suítes inteiras, uma última vez**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan test
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: backend **935 passed / 5 skipped**; frontend **102 arquivos / 569 testes**; lint limpo; build verde.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/superpowers/pendencias frontend/src/features/identity
git commit -m "chore(state): fecha a P-15 e registra o fuso literal do config como pendência nova"
```

---

## Handoff de execução

**executor: `claude`**

Não é task mecânica com paths fechados. A execução decide fronteira de domínio na matriz do arch test (Task 3), toca três leis do §5 — tipos gerados (§5.3), peça nova em `shared/` entre features (§5.6) e DoD provado, não instalado (§5.8) —, e o gate final é uma percorrida de navegador com julgamento visual em três viewports e três idiomas. `paths_autorizados` não se aplica.

**Lane:** `lane-a`, main tree, branch `feat/certificacao-historico-do-aluno` (P-03: bloco que toca backend roda no main tree).

**Ordem obrigatória:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. As dependências são reais: a Task 3 não compila sem o VO da 2, a 6 não migra sem o campo da 4, e a 7 não monta sem as peças da 5.

**Ponto de atenção, uma vez só:** leia a seção "Correção de rota em relação à spec" antes de abrir a Task 3. A spec manda `Identity` enxergar `Certification\Data\StudentCertificateData`; o arch test reprova isso pela Regra A, e o plano usa um VO em `Certification\Services\` no lugar. Se a Task 3 for executada como a spec diz, o `DomainDependencyTest` reprova com "camada Data é interna" e o diagnóstico parecerá um erro de import.
