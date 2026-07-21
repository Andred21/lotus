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
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaDesignationTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Course $course;

    private function setUpTurma(): void
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $this->course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function makeRedator(bool $habilitado, ?string $reufValidUntil): Redator
    {
        $r = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        if ($habilitado) {
            $this->course->redatores()->attach($r->id);
        }
        if ($reufValidUntil !== false) {
            File::create([
                'fileable_type' => 'redator', 'fileable_id' => $r->id, 'type' => 'REUF',
                'path' => 'docs/reuf.pdf', 'original_name' => 'reuf.pdf',
                'mime' => 'application/pdf', 'size' => 100, 'valid_until' => $reufValidUntil,
            ]);
        }

        return $r;
    }

    public function test_designa_redator_idoneo(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")
            ->assertOk()
            ->assertJsonPath('redatores.0.id', $r->id);

        $this->assertDatabaseHas('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }

    public function test_redator_sem_reuf_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: false);   // false = sem REUF

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
        $this->assertDatabaseMissing('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }

    public function test_redator_reuf_vencido_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2020-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
    }

    public function test_redator_reuf_validade_nula_passa(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: null);

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();
    }

    public function test_redator_nao_habilitado_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: false, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertStatus(422);
    }

    public function test_designacao_idempotente(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');

        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();
        $this->postJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertSame(1, $this->turma->redatores()->count());
    }

    public function test_remove_redator_faz_detach(): void
    {
        $this->actingAsAdmin();
        $this->setUpTurma();
        $r = $this->makeRedator(habilitado: true, reufValidUntil: '2030-01-01');
        $this->turma->redatores()->attach($r->id);

        $this->deleteJson("/api/turmas/{$this->turma->id}/redatores/{$r->id}")->assertOk();

        $this->assertDatabaseMissing('turma_redator', ['turma_id' => $this->turma->id, 'redator_id' => $r->id]);
    }
}
