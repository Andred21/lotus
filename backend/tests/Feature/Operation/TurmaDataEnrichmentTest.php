<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaDataEnrichmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_from_model_projeta_curso_cliente_codigos_e_contagem(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'Subestación Norte S.A.', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 7']);
        $courseId = Course::create(['name' => 'Trabajos en líneas 220kV', 'workload_hours' => 24])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 12, 'value_uf' => 30, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $data = TurmaData::fromModel(Turma::query()->withListingData()->findOrFail($turma->id));

        $this->assertSame('Trabajos en líneas 220kV', $data->course_name);
        $this->assertSame('Subestación Norte S.A.', $data->client_name);
        $this->assertSame(1, $data->enrolled_count);
        $this->assertSame($budget->id, $data->budget_id);
        $this->assertSame('Scap 7', $data->budget_code);
        $this->assertSame("Scap {$budget->id} - Cot 1", $data->quote_code);
    }
}
