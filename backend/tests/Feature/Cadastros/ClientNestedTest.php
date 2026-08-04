<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ClientNestedTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_adiciona_endereco_aninhado(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);

        $this->postJson("/api/clients/{$client->id}/addresses", [
            'commune' => 'Ñuñoa', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true,
        ])->assertCreated()->assertJsonPath('commune', 'Ñuñoa');

        $this->assertDatabaseHas('client_addresses', ['client_id' => $client->id, 'commune' => 'Ñuñoa']);
    }

    public function test_adiciona_contato_aninhado(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'ACME Ltda']);

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Nelson Gonzalez', 'email' => 'n@acme.cl',
        ])->assertCreated()->assertJsonPath('name', 'Nelson Gonzalez');

        $this->assertDatabaseHas('client_contacts', ['client_id' => $client->id, 'name' => 'Nelson Gonzalez']);
    }
}
