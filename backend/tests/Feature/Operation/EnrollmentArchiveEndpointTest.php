<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaStatus;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class EnrollmentArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_de_arquivadas_e_escopada_pela_turma(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        // Segunda cadeia no MESMO teste: os RUTs do default do builder são
        // literais fixos e o índice único de `users.rut` recusa a repetição
        // (mesmo padrão de TurmaArchiveEndpointTest/RedatorArchiveEndpointTest).
        $b = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()
            ->client(['legal_name' => 'Otra Empresa SpA'], ['rut' => '11.111.111-1'])
            ->student(['rut' => '22.222.222-2'])
            ->redatorUser(['rut' => '33.333.333-3'])
            ->create();

        $this->deleteJson("/api/turmas/{$a->turmaModel()->id}/alunos/{$a->enrollmentModel()->id}")
            ->assertNoContent();
        $this->deleteJson("/api/turmas/{$b->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}")
            ->assertNoContent();

        $this->getJson("/api/turmas/{$a->turmaModel()->id}/alunos/archived")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.enrollment.id', $a->enrollmentModel()->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // A lista ativa da mesma turma ficou vazia.
        $this->getJson("/api/turmas/{$a->turmaModel()->id}/alunos")
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_restore_devolve_200_e_reativa_a_matricula(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}")->assertNoContent();

        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $enrollment->id)
            ->assertJsonPath('name', 'Juan Pérez');

        $this->assertNotSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_restore_limpa_a_marca_de_arquivada_com_o_pai(): void
    {
        // A matrícula pode ter sido arquivada em cascata pela turma (marca
        // `archived_with_parent = true`). Restaurada individualmente sem limpar
        // a marca, ela ficaria etiquetada como "arquivada junto com o pai"
        // enquanto está viva, e um restore posterior da turma a trataria como
        // filha a restaurar — o mesmo defeito que a Task 4 corrigiu em
        // `RestoreQuoteAction` (commit fc8e5a0).
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $enrollment->archived_with_parent = true;
        $enrollment->saveQuietly();
        $enrollment->delete();

        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")->assertOk();

        $this->assertDatabaseHas('enrollments', [
            'id' => $enrollment->id,
            'archived_with_parent' => false,
        ]);
    }

    public function test_restore_em_turma_concluida_recusa_com_a_rn15(): void
    {
        // P3: restaurar matrícula é escrita acadêmica pela mesma definição que
        // remover. Sem o gate, uma turma concluída ganharia aluno de volta
        // DEPOIS do certificado emitido.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}")->assertNoContent();

        $turma->update(['status' => TurmaStatus::Concluida]);

        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
            );

        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_matricula_de_outra_turma_da_404(): void
    {
        $this->actingAsAdmin();
        $a = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        // Segunda cadeia no MESMO teste: RUTs próprios para não colidir com a
        // primeira (mesmo padrão do teste de escopo acima).
        $b = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()
            ->client(['legal_name' => 'Otra Empresa SpA'], ['rut' => '11.111.111-1'])
            ->student(['rut' => '22.222.222-2'])
            ->redatorUser(['rut' => '33.333.333-3'])
            ->create();

        $this->deleteJson("/api/turmas/{$b->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}")
            ->assertNoContent();

        // Posse: a matrícula de B não se restaura pela rota de A.
        $this->postJson("/api/turmas/{$a->turmaModel()->id}/alunos/{$b->enrollmentModel()->id}/restore")
            ->assertNotFound();
    }

    public function test_restore_de_matricula_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();

        $this->postJson(
            "/api/turmas/{$builder->turmaModel()->id}/alunos/{$builder->enrollmentModel()->id}/restore",
        )->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber('enrollment')` da rota, `int $enrollment` estoura
        // `TypeError` antes de qualquer consulta e o handler devolve 500 (Q-6
        // do review). `{turma}` não precisa: é resolvido por binding de model
        // (`Turma $turma`), que já dá 404 sozinho para valor não numérico —
        // só o segundo parâmetro, tipado `int`, corre o risco.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();

        $this->postJson("/api/turmas/{$builder->turmaModel()->id}/alunos/abc/restore")
            ->assertNotFound();
    }

    public function test_rematricula_restaura_sem_exigir_a_permissao_de_restore(): void
    {
        // A EXCEÇÃO DECLARADA da spec D4. `EnrollStudentAction` restaura a
        // matrícula ao reencontrar o par turma+aluno. A permissão guarda a AÇÃO
        // Restaurar da tela de Arquivados, que é intenção explícita; re-matricular
        // é outra intenção, que por acaso reaproveita a linha. Exigir a permissão
        // faria a re-matrícula falhar com 403 para quem tem
        // `operation.enrollment.manage` — e o motivo não seria legível na tela.
        $this->seed(RolePermissionSeeder::class);

        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();
        $enrollment->delete();

        $operador = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $operador->givePermissionTo('operation.enrollment.manage');
        $this->actingAs($operador, 'web');

        $this->assertFalse($operador->can('operation.enrollment.restore'));

        $this->postJson("/api/turmas/{$turma->id}/alunos", [
            'rut' => '12.345.678-5',
            'name' => 'Juan Pérez',
        ])->assertCreated();

        $this->assertNotSoftDeleted('enrollments', ['id' => $enrollment->id]);
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();
        $enrollment->delete();

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');
        $this->actingAs($user, 'web');

        // Vê a lista (a lista é guardada por `operation.turma.view`)...
        $this->getJson("/api/turmas/{$turma->id}/alunos/archived")->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/turmas/{$turma->id}/alunos/{$enrollment->id}/restore")->assertForbidden();
    }
}
