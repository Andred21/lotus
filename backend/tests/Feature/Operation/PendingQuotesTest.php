<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PendingQuotesTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): User
    {
        Permission::findOrCreate('operation.turma.create', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.create');

        return $user;
    }

    private function approvedQuote(string $client, string $course, int $students): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $client, 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap '.fake()->unique()->numberBetween(1, 9999)]);
        $courseId = Course::create(['name' => $course, 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => $students, 'value_uf' => 10, 'status' => 'approved',
        ]);
    }

    public function test_lista_cotacoes_aprovadas_sem_turma(): void
    {
        $pending = $this->approvedQuote('Transelec', 'Mantenimiento', 8);

        // Cotação aprovada COM turma → não aparece.
        $withTurma = $this->approvedQuote('Enel', 'Seguridad AT', 15);
        Turma::create([
            'quote_id' => $withTurma->id, 'course_id' => $withTurma->course_id,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);

        $res = $this->actingAs($this->actingAdmin())
            ->getJson('/api/turmas/pendientes-configuracion');

        $res->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.quote_id', $pending->id)
            ->assertJsonPath('0.client_name', 'Transelec')
            ->assertJsonPath('0.course_name', 'Mantenimiento')
            ->assertJsonPath('0.student_count', 8);
    }

    public function test_sem_permissao_recebe_403(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);

        $this->actingAs($user)->getJson('/api/turmas/pendientes-configuracion')->assertForbidden();
    }
}
