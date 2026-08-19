<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * `Turma` e `Enrollment` não tinham `booted()`: arquivar uma turma deixava
 * matrículas e documentos ATIVOS sob um pai que ninguém mais alcança — o mesmo
 * modo de falha que a `DeleteClientAction` existe para impedir (spec D2).
 */
class TurmaArchiveCascadeTest extends TestCase
{
    use RefreshDatabase;

    public function test_arquivar_turma_leva_matriculas_e_documentos_marcados(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $documento = $turma->files()->create([
            'type' => 'manual',
            'path' => 'turmas/1/manual.pdf',
            'original_name' => 'manual.pdf',
            'mime' => 'application/pdf',
            'size' => 4096,
        ]);

        $turma->delete();

        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'archived_with_parent' => true]);
        $this->assertSoftDeleted('files', ['id' => $documento->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'archived_with_parent' => true]);
    }

    public function test_restaurar_turma_devolve_so_o_que_a_cascata_levou(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $antigo = $turma->files()->create([
            'type' => 'manual',
            'path' => 'turmas/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $turma->delete();
        $turma->restore();

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        // Arquivado ANTES do pai, por vontade própria: não volta (spec D2).
        $this->assertSoftDeleted('files', ['id' => $antigo->id]);
        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_o_pivot_de_redator_nao_e_tocado(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $redator = $builder->redatorModel();

        $turma->delete();

        // A designação continua lá: o pivot não tem `deleted_at` e desfazê-la
        // registraria no `auditSync` uma remoção que ninguém pediu (spec D2).
        $this->assertDatabaseHas('turma_redator', [
            'turma_id' => $turma->id,
            'redator_id' => $redator->id,
        ]);
    }

    public function test_a_cascata_roda_dentro_de_uma_transacao(): void
    {
        // `RefreshDatabase` já segura UMA transação; a da Action é a segunda.
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $niveis = [];
        Enrollment::deleting(function () use (&$niveis) {
            $niveis[] = DB::transactionLevel();
        });

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->assertSame([2], $niveis);
    }

    public function test_turma_concluida_continua_recusando_o_arquivamento(): void
    {
        // A RN-15 é anterior a este bloco e não muda: o certificado emitido
        // aponta para o registro, e esconder o registro cria contradição entre
        // documento e banco.
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->create()->turmaModel();

        $this->assertSame(TurmaStatus::Concluida, $turma->status);

        $this->deleteJson("/api/turmas/{$turma->id}")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );
    }
}
