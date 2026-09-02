<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Data\ClientData;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class RespostaDeRecursoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $rutSeq = 0;

    /** RUT único por usuário — a UserFactory não define um, e a projeção exige string. */
    private function nextRut(): string
    {
        return '1.000.'.str_pad((string) ++$this->rutSeq, 3, '0', STR_PAD_LEFT).'-0';
    }

    public function test_carimba_200_onde_o_data_forcaria_201(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser([], ['rut' => $this->nextRut()]);
        $data = ClientData::fromModel($client);

        // Torna a request corrente um POST — é a única condição em que
        // `ResponsableData::calculateResponseStatus` devolve 201.
        $this->post('/api/__sonda-resposta', []);

        // O DEFEITO, carimbado. Sem esta asserção o teste passa mesmo sem a
        // linha acima (provado no review de 2026-09-02): fora de POST o
        // `toResponse()` já devolve 200 sozinho e a peça sob teste não é
        // exercitada — cobertura fantasma da lição 10.
        $this->assertSame(201, $data->toResponse(request())->getStatusCode());

        // A CURA.
        $this->assertSame(200, RespostaDeRecurso::ok($data)->getStatusCode());
    }

    public function test_o_corpo_e_o_mesmo_do_to_response(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser([], ['rut' => $this->nextRut()]);

        $data = ClientData::fromModel($client);

        $this->assertSame(
            $data->toResponse(request())->getContent(),
            RespostaDeRecurso::ok($data)->getContent(),
        );
    }
}
