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
            'rut' => '76.111.000-4',
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

    /** O payload de replace-total que o cadastro manda, com os contatos dados. */
    private function payload(array $contacts): array
    {
        return [
            'name' => 'Contacto SpA',
            'legal_name' => 'Contacto SpA',
            'rut' => '76.111.000-4',
            'email' => 'contacto@example.test',
            'type' => 'client',
            'contacts' => $contacts,
        ];
    }

    public function test_atualizar_sem_nenhum_principal_e_422(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => false],
            ['name' => 'Bruno', 'is_primary' => false],
        ]))->assertStatus(422)->assertJsonPath('errors.contacts.0', 'El cliente necesita exactamente un contacto principal.');
    }

    public function test_atualizar_com_dois_principais_e_422(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => true],
            ['name' => 'Bruno', 'is_primary' => true],
        ]))->assertStatus(422);
    }

    public function test_atualizar_com_exatamente_um_principal_passa(): void
    {
        $this->contato('Ana', true);

        $this->putJson("/api/clients/{$this->client->id}", $this->payload([
            ['name' => 'Ana', 'is_primary' => true],
            ['name' => 'Bruno', 'is_primary' => false],
        ]))->assertOk();

        $this->assertSame(1, $this->client->contacts()->where('is_primary', true)->count());
    }

    public function test_desmarcar_o_unico_principal_pela_rota_nested_e_422(): void
    {
        $principal = $this->contato('Ana', true);
        $this->contato('Bruno', false);

        $this->putJson("/api/contacts/{$principal->id}", [
            'name' => 'Ana', 'is_primary' => false,
        ])->assertStatus(422);

        $this->assertTrue($principal->fresh()->is_primary, 'O principal não podia ter sido desmarcado.');
    }

    public function test_promover_outro_pela_rota_nested_passa(): void
    {
        $principal = $this->contato('Ana', true);
        $segundo = $this->contato('Bruno', false);

        $this->putJson("/api/contacts/{$segundo->id}", [
            'name' => 'Bruno', 'is_primary' => true,
        ])->assertOk();

        $this->assertTrue($segundo->fresh()->is_primary);
        $this->assertFalse($principal->fresh()->is_primary);
    }
}
