<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * O cliente tem UM OU MAIS contatos (fonte canônica: Drive,
 * `entidade-contato-cliente.md`; ratificado pelo João em 2026-07-31). A API
 * aceitava coleção vazia — divergência real, fechada aqui.
 *
 * Interação com a regra de coleção nested: `ClientData::$contacts` é
 * `array = []`, não `Optional`, e o update faz replace-total. Antes desta
 * regra, um PUT que OMITIA `contacts` apagava a coleção em silêncio. Com
 * `required`, a omissão vira 422 em vez de apagamento mudo.
 */
class ClientContactMinimumTest extends TestCase
{
    use RefreshDatabase;

    private function client(): Client
    {
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);

        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

        return $client;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'ACME',
            'legal_name' => 'ACME',
            'rut' => '13.456.789-9',
            'email' => 'acme@lotus.cl',
            'type' => 'client',
            'contacts' => [['name' => 'Ana', 'is_primary' => true]],
        ], $override);
    }

    public function test_update_com_contacts_vazio_da_422(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $this->putJson("/api/clients/{$client->id}", $this->payload(['contacts' => []]))
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        // O contato existente NÃO foi apagado pelo replace-total.
        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_update_sem_a_chave_contacts_da_422_em_vez_de_apagar(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        $payload = $this->payload();
        unset($payload['contacts']);

        $this->putJson("/api/clients/{$client->id}", $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_store_sem_contato_da_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/clients', $this->payload(['contacts' => []]))
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));
    }

    public function test_update_com_um_contato_continua_passando(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();

        $this->putJson("/api/clients/{$client->id}", $this->payload([
            'contacts' => [['name' => 'Beatriz', 'is_primary' => true]],
        ]))->assertOk()->assertJsonPath('contacts.0.name', 'Beatriz');
    }

    /**
     * A regra de coleção vale em TODOS os caminhos de escrita, não só no da
     * tela (`backend-ddd.md`): o replace-total do pai E a rota nested da
     * própria entidade. Fechar só o `ClientData::rules()` deixa
     * `DELETE /api/contacts/{contact}` esvaziando a coleção pela porta dos
     * fundos — mesmo buraco que `PrimaryContactService::ensureSingle()` já
     * fecha para "no máximo 1 principal".
     */
    public function test_delete_do_ultimo_contato_da_422_e_nao_apaga(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        $contact = $client->contacts()->first();

        $this->deleteJson("/api/contacts/{$contact->id}")
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_delete_de_contato_com_outro_restante_continua_passando(): void
    {
        $this->actingAsAdmin();
        $client = $this->client();
        $segundo = $client->contacts()->create(['name' => 'Beatriz', 'is_primary' => false]);

        $this->deleteJson("/api/contacts/{$segundo->id}")->assertNoContent();

        $this->assertSame(1, $client->contacts()->count());
    }
}
