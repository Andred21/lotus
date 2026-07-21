<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaQueryBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_with_listing_data_carrega_relacoes_e_conta_matriculas(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = Course::create(['name' => 'AT 220kV', 'workload_hours' => 8])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $this->assertInstanceOf(TurmaQueryBuilder::class, Turma::query());

        $loaded = Turma::query()->withListingData()->findOrFail($turma->id);

        $this->assertTrue($loaded->relationLoaded('course'));
        $this->assertTrue($loaded->relationLoaded('quote'));
        $this->assertSame('AT 220kV', $loaded->course->name);
        $this->assertSame('ACME', $loaded->quote->budget->client->legal_name);
        $this->assertSame(1, (int) $loaded->enrollments_count);
    }
}
