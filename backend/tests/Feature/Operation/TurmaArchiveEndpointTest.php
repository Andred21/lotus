<?php

namespace Tests\Feature\Operation;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class TurmaArchiveEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativa_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $viva = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();
        // RUT é `unique` em `users` (regra do domínio) e o builder nasce com
        // defaults fixos: a segunda cadeia precisa de RUTs próprios de cliente,
        // aluno e redator para não colidir com a primeira (mesmo padrão de
        // `ContratanteEagerLoadTest::nextRut()`).
        $arquivada = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()
            ->client(['legal_name' => 'Otra Empresa SpA'], ['rut' => '11.111.111-1'])
            ->student(['rut' => '22.222.222-2'])
            ->redatorUser(['rut' => '33.333.333-3'])
            ->create()->turmaModel();

        $this->deleteJson("/api/turmas/{$arquivada->id}")->assertNoContent();

        $this->getJson('/api/turmas/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.turma.id', $arquivada->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/turmas')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $viva->id);
    }

    public function test_arquivada_conta_os_alunos_que_a_cascata_levou(): void
    {
        // Sem a contagem as-of-archiving, TODA turma arquivada aparece com
        // `0 alumnos` — a cascata da Task 11 acabou de arquivar as matrículas e
        // o global scope as esconde do `withCount` (Q-8, aplicado a um count).
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->getJson('/api/turmas/archived')
            ->assertOk()
            ->assertJsonPath('0.turma.enrolled_count', 1);
    }

    public function test_restore_devolve_200_e_traz_as_matriculas_de_volta(): void
    {
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $enrollment = $builder->enrollmentModel();

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();

        $this->postJson("/api/turmas/{$turma->id}/restore")
            ->assertOk()
            ->assertJsonPath('id', $turma->id);

        $this->assertNotSoftDeleted('turmas', ['id' => $turma->id]);
        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null, 'archived_with_parent' => false]);
    }

    public function test_restore_com_outra_turma_viva_na_mesma_cotacao_da_422_e_nao_500(): void
    {
        // A sequência da spec D1, inteira. Sem o gate, o UNIQUE da coluna gerada
        // `active_quote_id` recusa no banco e a rota devolve 500.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turmaA = $builder->turmaModel();
        $quoteId = $turmaA->quote_id;

        $this->deleteJson("/api/turmas/{$turmaA->id}")->assertNoContent();

        // B nasce da MESMA cotação — permitido, porque A está arquivada.
        $turmaB = Turma::create([
            'quote_id' => $quoteId,
            'course_id' => $turmaA->course_id,
            'modalidade' => $turmaA->modalidade,
            'local_aplicacao' => null,
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
        ]);

        $this->postJson("/api/turmas/{$turmaA->id}/restore")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
            );

        $this->assertSoftDeleted('turmas', ['id' => $turmaA->id]);
        $this->assertNotSoftDeleted('turmas', ['id' => $turmaB->id]);
    }

    public function test_restore_de_turma_com_redator_arquivado_da_422(): void
    {
        // O gate da spec D3 furado na direção inversa (Q-6 do review de
        // 2026-08-19): `Redator::turmas()` não enxerga turma arquivada, então
        // arquivar a turma primeiro faz o gate do redator passar — e o restore
        // devolvia uma turma EM ANDAMENTO com redator arquivado, que é `User`
        // sem login. Três passos legítimos chegando ao estado que a D3 proíbe.
        $this->actingAsAdmin();
        $builder = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create();
        $turma = $builder->turmaModel();
        $redator = $builder->redatorModel();

        $this->deleteJson("/api/turmas/{$turma->id}")->assertNoContent();
        // Passa: a única turma dele está arquivada, e turma arquivada não é
        // trabalho pendente.
        $this->deleteJson("/api/redatores/{$redator->id}")->assertNoContent();

        $this->postJson("/api/turmas/{$turma->id}/restore")
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.turma.0',
                'Un redactor de esta clase está archivado: restáuralo antes de restaurar la clase.',
            );

        $this->assertSoftDeleted('turmas', ['id' => $turma->id]);

        // Restaurado o redator, a turma volta — o gate é ordem, não bloqueio.
        $this->postJson("/api/redatores/{$redator->id}/restore")->assertOk();
        $this->postJson("/api/turmas/{$turma->id}/restore")->assertOk();
        $this->assertNotSoftDeleted('turmas', ['id' => $turma->id]);
    }

    public function test_restore_de_turma_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();

        $this->postJson("/api/turmas/{$turma->id}/restore")->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber` da rota, `int $turma` estoura `TypeError` antes
        // de qualquer consulta e o handler devolve 500 (Q-6 do review). Os
        // outros roots do bloco carregam o mesmo teste.
        $this->actingAsAdmin();

        $this->postJson('/api/turmas/abc/restore')->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $turma = IssuableEnrollmentBuilder::make()->turmaNaoConcluida()->create()->turmaModel();
        $turma->delete();

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');
        $this->actingAs($user, 'web');

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/turmas/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/turmas/{$turma->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        // Diferente do molde dos outros seis roots (que usam a role `redator`
        // aqui): essa role TEM `operation.turma.view` por desenho —
        // `RolePermissionSeeder::redatorPermissions()` a concede de propósito,
        // e a NOTA DE ESCOPO em `TurmaController` explica por quê ("turma.view
        // concede o DIREITO de ver turmas"; o escopo "só as suas" é Policy
        // futura). Usar a role `redator` aqui provaria o OPOSTO do que este
        // teste afirma. Um usuário autenticado sem NENHUMA role/permissão
        // prova a mesma coisa — "archived exige a view" — sem alegar algo
        // falso sobre a role.
        $user = User::factory()->create(['is_active' => true]);
        $this->actingAs($user, 'web');

        $this->getJson('/api/turmas/archived')->assertForbidden();
    }
}
