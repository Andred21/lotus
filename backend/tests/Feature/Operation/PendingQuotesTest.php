<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class PendingQuotesTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $rutSeq = 0;

    /** RUT único por cliente — approvedQuote() cria mais de um client no mesmo teste. */
    private function nextRut(): string
    {
        return '1.000.'.str_pad((string) ++$this->rutSeq, 3, '0', STR_PAD_LEFT).'-0';
    }

    private function approvedQuote(string $client, string $course, int $students): Quote
    {
        $clientId = $this->makeClientWithUser(['legal_name' => $client], ['rut' => $this->nextRut()])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap '.fake()->unique()->numberBetween(1, 9999)]);
        $courseId = $this->makeCourse(['name' => $course, 'workload_hours' => 8])->id;

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

        // User com EXATAMENTE a permissão que gateia a rota
        // (`permission:operation.turma.create` em `pending`, TurmaController).
        // Rodar como admin completo faria a troca da permissão exigida passar
        // verde, porque o admin tem todas — e o placar do H.4.9 é cego a isso,
        // já que escopo de permissão é setup, não asserção. D12 tratou os 6
        // `actingAdmin` como repasse puro; este era o único que não era
        // (review de 2026-08-04, Q-3).
        Permission::findOrCreate('operation.turma.create', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.create');

        $res = $this->actingAs($user)->getJson('/api/turmas/pendientes-configuracion');

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

    /**
     * Qual permissão gateia a rota, não apenas se alguma gateia. O teste acima
     * cobre só a remoção total do middleware; trocar `operation.turma.create`
     * por outra permissão passaria verde nele e no teste positivo, porque o
     * admin tem todas. Guarda nascida do review de 2026-08-04 (Q-3), depois de
     * a migração do H.4.9 ter trocado o user de permissão única por
     * `actingAsAdmin()` sem que o placar da suíte se movesse — escopo de
     * permissão é setup, e nenhum gate baseado em contagem enxerga isso.
     */
    public function test_permissao_vizinha_de_turma_nao_abre_a_rota(): void
    {
        Permission::findOrCreate('operation.turma.view', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');

        $this->actingAs($user)->getJson('/api/turmas/pendientes-configuracion')->assertForbidden();
    }
}
