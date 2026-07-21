<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class TurmaShowTest extends TestCase
{
    use RefreshDatabase;

    private function actingViewer(): User
    {
        Permission::findOrCreate('operation.turma.view', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');

        return $user;
    }

    public function test_show_projeta_turma_enriquecida(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'Subestación Norte S.A.', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 9']);
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

        $res = $this->actingAs($this->actingViewer())
            ->getJson("/api/turmas/{$turma->id}");

        $res->assertOk()
            ->assertJsonPath('course_name', 'Trabajos en líneas 220kV')
            ->assertJsonPath('client_name', 'Subestación Norte S.A.')
            ->assertJsonPath('enrolled_count', 1)
            ->assertJsonPath('quote_code', "Scap {$budget->id} - Cot 1")
            ->assertJsonPath('budget_code', 'Scap 9')
            ->assertJsonPath('budget_id', $budget->id);
    }
}
