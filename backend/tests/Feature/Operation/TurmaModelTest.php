<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaModelTest extends TestCase
{
    use RefreshDatabase;

    private function makeApprovedQuote(): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = Course::create(['name' => 'AT', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
    }

    public function test_cria_turma_com_casts_e_relacoes(): void
    {
        $quote = $this->makeApprovedQuote();

        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        $fresh = $turma->fresh();
        $this->assertInstanceOf(TurmaModalidade::class, $fresh->modalidade);
        $this->assertSame(TurmaStatus::EmAndamento, $fresh->status);
        $this->assertSame($quote->id, $fresh->quote->id);
        $this->assertSame($quote->course_id, $fresh->course->id);
        $this->assertSame($turma->id, $quote->fresh()->turma->id);
    }

    public function test_pivot_turma_redator_associa_redator(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);

        $turma->redatores()->attach($redator->id);

        $this->assertDatabaseHas('turma_redator', ['turma_id' => $turma->id, 'redator_id' => $redator->id]);
        $this->assertSame(1, $turma->redatores()->count());
    }
}
