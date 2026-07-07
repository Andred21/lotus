<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientNestedTest extends TestCase
{
    use RefreshDatabase;

    private function makeClient(): Client
    {
        $this->actingAs(User::factory()->create(['type' => 'admin', 'is_active' => true]));
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return $user->client()->create([
            'legal_name' => 'ACME Ltda',
            'type'       => 'client',
        ]);
    }

    public function test_adiciona_endereco_aninhado(): void
    {
        $client = $this->makeClient();

        $this->postJson("/api/clients/{$client->id}/addresses", [
            'commune' => 'Ñuñoa', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true,
        ])->assertCreated()->assertJsonPath('commune', 'Ñuñoa');

        $this->assertDatabaseHas('client_addresses', ['client_id' => $client->id, 'commune' => 'Ñuñoa']);
    }

    public function test_adiciona_contato_aninhado(): void
    {
        $client = $this->makeClient();

        $this->postJson("/api/clients/{$client->id}/contacts", [
            'name' => 'Nelson Gonzalez', 'email' => 'n@acme.cl',
        ])->assertCreated()->assertJsonPath('name', 'Nelson Gonzalez');

        $this->assertDatabaseHas('client_contacts', ['client_id' => $client->id, 'name' => 'Nelson Gonzalez']);
    }
}
