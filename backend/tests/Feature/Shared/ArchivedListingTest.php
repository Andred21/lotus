<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Audit\ArchivedListing;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ArchivedListingTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_monta_cada_registro_com_a_data_iso_e_o_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $client = $this->makeClientWithUser();
        $client->delete();

        $arquivados = Client::onlyTrashed()->get();

        $saida = ArchivedListing::lista(
            $arquivados,
            Client::class,
            fn (Client $c, string $em, ?string $por) => [
                'id' => $c->id, 'archived_at' => $em, 'archived_by' => $por,
            ],
        );

        $this->assertCount(1, $saida);
        $this->assertSame($client->id, $saida[0]['id']);
        $this->assertSame('Ana Torres', $saida[0]['archived_by']);
        $this->assertSame(
            $client->fresh()->deleted_at->toIso8601String(),
            $saida[0]['archived_at'],
        );
    }

    public function test_autor_ausente_vira_null_sem_estourar(): void
    {
        // Arquivado sem sessão (seeder, console): não há audit com usuário.
        $client = $this->makeClientWithUser();
        $client->delete();

        $saida = ArchivedListing::lista(
            Client::onlyTrashed()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => $por,
        );

        $this->assertSame([null], $saida);
    }

    public function test_colecao_vazia_devolve_array_vazio(): void
    {
        $saida = ArchivedListing::lista(
            Client::onlyTrashed()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => $c->id,
        );

        $this->assertSame([], $saida);
    }

    public function test_a_saida_e_reindexada_do_zero(): void
    {
        $this->actingAsAdmin();

        $a = $this->makeClientWithUser(['legal_name' => 'A']);
        $b = $this->makeClientWithUser(['legal_name' => 'B']);
        $a->delete();
        $b->delete();

        // `keyBy` produz chaves não sequenciais; a saída tem de ser uma list.
        $arquivados = Client::onlyTrashed()->get()->keyBy('id');

        $saida = ArchivedListing::lista(
            $arquivados,
            Client::class,
            fn (Client $c, string $em, ?string $por) => $c->id,
        );

        $this->assertSame([0, 1], array_keys($saida));
    }

    public function test_resolve_encontra_o_arquivado_pela_classe(): void
    {
        $client = $this->makeClientWithUser();
        $client->delete();

        $achado = ArchivedListing::resolveArquivado(Client::query(), $client->id);

        $this->assertTrue($achado->is($client));
        $this->assertNotNull($achado->deleted_at);
    }

    public function test_resolve_da_404_sobre_registro_ativo(): void
    {
        // O ponto do `onlyTrashed()`: o binding padrão do Laravel acharia este
        // registro e a Action restauraria o que nunca foi arquivado.
        $client = $this->makeClientWithUser();

        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado(Client::query(), $client->id);
    }

    public function test_resolve_da_404_sobre_id_inexistente(): void
    {
        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado(Client::query(), 999999);
    }

    public function test_resolve_por_relacao_mantem_a_posse_do_pai(): void
    {
        $this->actingAsAdmin();

        // Setup: 2 turmas com enrollments separados
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote1 = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $quote2 = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 2,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        $turma = Turma::create([
            'quote_id' => $quote1->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
        $outra = Turma::create([
            'quote_id' => $quote2->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
        ]);

        $student = Student::create(['user_id' => User::factory()->create(['type' => 'aluno', 'is_active' => false])->id]);
        $matricula = Enrollment::create(['turma_id' => $turma->id, 'student_id' => $student->id]);
        $matricula->delete();

        // A MESMA matrícula arquivada, pedida pela turma errada, não aparece.
        $this->expectException(ModelNotFoundException::class);

        ArchivedListing::resolveArquivado($outra->enrollments(), $matricula->id);
    }
}
