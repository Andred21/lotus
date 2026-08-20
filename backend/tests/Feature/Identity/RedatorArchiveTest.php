<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * O arquivamento do redator, nas duas pontas que a spec D3 separa: o gate cobre
 * turma EM ANDAMENTO; o `withTrashed()` da relação cobre turma CONCLUÍDA, que é
 * onde a emissão do certificado acontece. Nenhum resolve o caso do outro.
 */
class RedatorArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_com_turma_em_andamento_nao_arquiva(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $redator = $builder->redatorModel();

        $this->deleteJson("/api/redatores/{$redator->id}")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.redator.0',
                'El redactor tiene clases en curso: concluye o reasigna antes de archivarlo.',
            );

        $this->assertNotSoftDeleted('redatores', ['id' => $redator->id]);
    }

    public function test_redator_de_turma_concluida_arquiva_e_leva_user_e_documentos(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $documento = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/cv.pdf',
            'original_name' => 'cv.pdf',
            'mime' => 'application/pdf',
            'size' => 2048,
        ]);

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertSoftDeleted('redatores', ['id' => $redator->id]);
        $this->assertSoftDeleted('files', ['id' => $documento->id]);
        $this->assertDatabaseHas('files', ['id' => $documento->id, 'archived_with_parent' => true]);
        $this->assertSoftDeleted('users', ['id' => $redator->user_id]);
        $this->assertDatabaseHas('users', ['id' => $redator->user_id, 'archived_with_parent' => true]);
    }

    public function test_documento_arquivado_antes_do_redator_nao_e_marcado(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $antigo = $redator->documents()->create([
            'type' => 'cv',
            'path' => 'redatores/1/antigo.pdf',
            'original_name' => 'antigo.pdf',
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
        $antigo->delete();

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_certificado_continua_emitindo_com_o_redator_arquivado(): void
    {
        // O CASO COM PESO LEGAL (spec D3). A turma está concluída, o aluno
        // aprovado e o template existe — a emissão é legítima. Sem o
        // `withTrashed()` em `Turma::redatores()` o pivot fica vivo, o redator
        // some da turma e `CertificateEligibility:118` recusa com 422.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->postJson(
            "/api/enrollments/{$builder->enrollmentModel()->id}/certificate",
            ['redator_id' => $redator->id],
        )->assertCreated();
    }

    public function test_turma_enxerga_o_redator_arquivado_na_relacao(): void
    {
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();
        $turma = $builder->turmaModel();

        $redator->delete();

        $this->assertTrue($turma->redatores()->whereKey($redator->id)->exists());
        $this->assertCount(1, $turma->fresh()->redatores);
    }

    public function test_a_cascata_roda_dentro_de_uma_transacao(): void
    {
        // `RefreshDatabase` já segura UMA transação; a da Action é a segunda.
        // Mesmo idioma da Task 2.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->create();
        $redator = $builder->redatorModel();

        $niveis = [];
        Redator::deleting(function () use (&$niveis) {
            $niveis[] = DB::transactionLevel();
        });

        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->assertSame([2], $niveis);
    }
}
