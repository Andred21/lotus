<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\DeleteClientContactAction;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O cliente tem UM OU MAIS contatos (fonte canônica: Drive,
 * `entidade-contato-cliente.md`; ratificado pelo João em 2026-07-31). A API
 * aceitava coleção vazia — divergência real, fechada aqui.
 *
 * Interação com a regra de coleção nested: `ClientData::$contacts` é
 * `Optional` desde o bloco `contrato-de-entrada-identidade-e-nested`. Ausente =
 * não mexe (o caso de preservação abaixo); `[]` = apaga, e aí o `min:1`
 * recusa. A obrigatoriedade no create mora na `CreateClientAction`, porque
 * `rules()` é estático e não distingue verbo.
 */
class ClientContactMinimumTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

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
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

        $this->putJson("/api/clients/{$client->id}", $this->payload(['contacts' => []]))
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        // O contato existente NÃO foi apagado pelo replace-total.
        $this->assertSame(1, $client->contacts()->count());
    }

    /**
     * A omissão deixou de ser 422 e passou a ser preservação: `contacts` é
     * `Optional`, e ausente significa "não mexi na coleção". O `min:1` continua
     * valendo para quando a chave VIER — o caso acima prova isso —, e a
     * obrigatoriedade no create mora na `CreateClientAction`.
     */
    public function test_update_sem_a_chave_contacts_preserva_a_colecao(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();
        $ana = $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $payload = $this->payload();
        unset($payload['contacts']);

        $this->putJson("/api/clients/{$client->id}", $payload)->assertOk();

        $this->assertSame([$ana->id], $client->contacts()->pluck('id')->all());
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
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

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
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $contact = $client->contacts()->first();

        $this->deleteJson("/api/contacts/{$contact->id}")
            ->assertStatus(422)
            ->assertJsonPath('errors.contacts.0', fn ($m) => is_string($m));

        $this->assertSame(1, $client->contacts()->count());
    }

    public function test_delete_de_contato_com_outro_restante_continua_passando(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $segundo = $client->contacts()->create(['name' => 'Beatriz', 'is_primary' => false]);

        $this->deleteJson("/api/contacts/{$segundo->id}")->assertNoContent();

        $this->assertSame(1, $client->contacts()->count());
    }

    /**
     * Q-5. A suíte roda sqlite `:memory:`, onde `lockForUpdate()` é no-op —
     * este teste NÃO prova serialização. Prova o que dá para provar aqui: que
     * a contagem e o delete acontecem dentro de uma transação, que é a
     * condição sem a qual o lock não teria efeito nem em MySQL. A serialização
     * real é provada à mão contra MySQL no gate de fechamento.
     */
    public function test_exclusao_roda_dentro_de_transacao(): void
    {
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $client->contacts()->create(['name' => 'Bruno']);
        $client->contacts()->create(['name' => 'Carla']);
        $alvo = $client->contacts()->where('name', 'Carla')->firstOrFail();

        $niveis = [];
        Event::listen('eloquent.deleting: '.ClientContact::class, function () use (&$niveis): void {
            $niveis[] = DB::transactionLevel();
        });

        app(DeleteClientContactAction::class)->execute($alvo);

        $this->assertNotEmpty($niveis, 'o evento de delete não disparou');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante
        // o teste inteiro. Asserir `> 0` passaria sem o Action abrir transação
        // nenhuma — mediria o RefreshDatabase, não o código sob teste.
        $this->assertSame(2, $niveis[0], 'o delete não abriu transação própria sobre a do RefreshDatabase');
    }
}
