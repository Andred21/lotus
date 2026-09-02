<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Client;
use App\Shared\Audit\ArchivedListing;
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
}
