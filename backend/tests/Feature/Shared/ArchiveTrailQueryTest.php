<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Client;
use App\Shared\Audit\ArchiveTrailQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ArchiveTrailQueryTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_devolve_o_autor_da_ultima_audit_deleted(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $client = $this->makeClientWithUser();
        $client->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertSame('Ana Torres', $mapa[$client->id]);
    }

    public function test_id_sem_audit_deleted_nao_aparece_no_mapa(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();

        // Nunca foi arquivado: não há audit `deleted`.
        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertArrayNotHasKey($client->id, $mapa);
    }

    public function test_autor_nulo_quando_a_audit_nao_tem_usuario(): void
    {
        // Arquivado sem sessão (seeder, console): a audit existe, o autor não.
        $client = $this->makeClientWithUser();
        $client->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$client->id]);

        $this->assertArrayHasKey($client->id, $mapa);
        $this->assertNull($mapa[$client->id]);
    }

    public function test_le_varios_ids_de_uma_vez(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = $this->makeClientWithUser(['legal_name' => 'A']);
        $b = $this->makeClientWithUser(['legal_name' => 'B']);
        $a->delete();
        $b->delete();

        $mapa = ArchiveTrailQuery::archivedBy(Client::class, [$a->id, $b->id]);

        $this->assertSame('Ana Torres', $mapa[$a->id]);
        $this->assertSame('Ana Torres', $mapa[$b->id]);
    }

    public function test_lista_de_ids_vazia_nao_consulta_e_devolve_vazio(): void
    {
        $this->assertSame([], ArchiveTrailQuery::archivedBy(Client::class, []));
    }
}
