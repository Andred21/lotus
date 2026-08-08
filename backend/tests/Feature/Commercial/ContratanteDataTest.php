<?php

namespace Tests\Feature\Commercial;

use App\Domains\Commercial\Models\Client;
use App\Shared\Data\ContratanteData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ContratanteDataTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /**
     * ContratanteData deve projetar razão social (legal_name) do Client,
     * não o nome do User de cadastro.
     */
    public function test_contratante_returns_legal_name_not_user_name(): void
    {
        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '12345678-K']
        );

        $contratante = $client->contratante();

        $this->assertInstanceOf(ContratanteData::class, $contratante);
        $this->assertSame('Empresa Legal SpA', $contratante->name);
        $this->assertSame('12345678-K', $contratante->rut);
    }
}
