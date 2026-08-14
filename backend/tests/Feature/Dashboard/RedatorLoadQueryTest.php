<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Services\RedatorLoadQuery;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Seção `redatores` do admin (D2): carga por redator. O redator sem nada
 * PRECISA aparecer com zeros — a lista é o quadro da equipe, e sumir da lista
 * por não ter turma esconderia justamente quem está ocioso.
 */
class RedatorLoadQueryTest extends TestCase
{
    use RefreshDatabase;

    private Budget $budget;

    private Course $course;

    private int $quoteSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');

        $clientUser = User::create([
            'name' => 'Cliente Carga',
            'rut' => '76.543.210-3',
            'email' => 'cliente-carga@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Carga SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create([
            'client_id' => $client->id,
            'code' => 'Scap Carga',
        ]);
        $this->course = Course::create([
            'name' => 'Rescate en Altura',
            'workload_hours' => 8,
        ]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_carga_por_redator_inclui_o_ocioso_com_zeros(): void
    {
        $today = CarbonImmutable::today();

        $carregado = $this->createRedator('Ana Carregada', '12.345.678-5');
        $ocioso = $this->createRedator('Bruno Ocioso', '11111111-1');

        $emCurso = $this->createTurma($today->subDays(3), $today->addDays(4));
        $futura = $this->createTurma($today->addDays(2), $today->addDays(9));
        $concluida = $this->createTurma(
            $today->subDays(30),
            $today->subDays(20),
            TurmaStatus::Concluida,
        );

        $emCurso->redatores()->attach($carregado->id);
        $futura->redatores()->attach($carregado->id);
        // Concluída não é carga: já saiu da mesa dele.
        $concluida->redatores()->attach($carregado->id);

        $this->createDocument($carregado, RedatorDocumentType::REUF, $today->subDay());
        $this->createDocument($carregado, RedatorDocumentType::TITULO, $today->addDays(10));
        // Fora do horizonte de 30d: não é nem vencido nem vencendo.
        $this->createDocument($carregado, RedatorDocumentType::CV, $today->addDays(60));
        // Sem validade: documento que não vence não conta em nenhum dos dois.
        $this->createDocument($carregado, RedatorDocumentType::POSTGRADO, null);

        $linhas = array_map(
            fn ($linha): array => $linha->toArray(),
            app(RedatorLoadQuery::class)->get(),
        );

        $this->assertSame([
            [
                'redator_id' => $carregado->id,
                'name' => 'Ana Carregada',
                'current_turmas' => 1,
                'upcoming_turmas' => 1,
                'expired_documents' => 1,
                'expiring_documents' => 1,
            ],
            [
                'redator_id' => $ocioso->id,
                'name' => 'Bruno Ocioso',
                'current_turmas' => 0,
                'upcoming_turmas' => 0,
                'expired_documents' => 0,
                'expiring_documents' => 0,
            ],
        ], $linhas);
    }

    private function createRedator(string $name, string $rut): Redator
    {
        $user = User::create([
            'name' => $name,
            'rut' => $rut,
            'email' => Str::slug($name).'@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function createTurma(
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        TurmaStatus $status = TurmaStatus::EmAndamento,
    ): Turma {
        $quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => 'approved',
            'approved_at' => CarbonImmutable::now(),
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'status' => $status,
        ]);
    }

    private function createDocument(
        Redator $redator,
        RedatorDocumentType $type,
        ?CarbonImmutable $validUntil,
    ): File {
        return File::create([
            'fileable_type' => 'redator',
            'fileable_id' => $redator->id,
            'type' => $type->value,
            'path' => "dashboard/carga/{$redator->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => $validUntil?->toDateString(),
        ]);
    }
}
