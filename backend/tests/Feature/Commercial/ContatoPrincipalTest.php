<?php

namespace Tests\Feature\Commercial;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A invariante do contato principal, decidida na D-09: entrada explícita sem
 * principal RECUSA; zero principal por efeito colateral PROMOVE. A tela já se
 * comportava assim; este bloco fez o contrato dizer o mesmo.
 */
class ContatoPrincipalTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsSuperadmin();

        $user = User::create([
            'name' => 'Contacto SpA',
            'rut' => '76.111.000-1',
            'email' => 'contacto@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);

        $this->client = Client::create([
            'user_id' => $user->id,
            'legal_name' => 'Contacto SpA',
            'type' => 'client',
        ]);
    }

    private function contato(string $name, bool $primary): ClientContact
    {
        return $this->client->contacts()->create(['name' => $name, 'is_primary' => $primary]);
    }

    public function test_apagar_o_principal_promove_o_mais_antigo_dos_restantes(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);
        $terceiro = $this->contato('Carla', false);

        $this->deleteJson("/api/contacts/{$principal->id}")
            ->assertNoContent();

        $this->assertTrue($segundo->fresh()->is_primary, 'O mais antigo dos restantes devia assumir.');
        $this->assertFalse($terceiro->fresh()->is_primary);
    }

    public function test_apagar_contato_comum_nao_move_o_principal(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);

        $this->deleteJson("/api/contacts/{$segundo->id}")
            ->assertNoContent();

        $this->assertTrue($principal->fresh()->is_primary);
    }

    /** D20 da spec: o serviço é compartilhado, então endereço herda a PROMOÇÃO
     * — não a recusa de entrada, que fica só em contatos porque `contacts` é
     * obrigatório e endereço não é. */
    public function test_endereco_tambem_promove_quando_fica_sem_principal(): void
    {
        $principal = $this->client->addresses()->create(['line1' => 'Av. Uno 1', 'is_primary' => true]);
        $segundo = $this->client->addresses()->create(['line1' => 'Av. Dos 2', 'is_primary' => false]);

        $this->deleteJson("/api/addresses/{$principal->id}")
            ->assertNoContent();

        $this->assertTrue($segundo->fresh()->is_primary);
    }
}
