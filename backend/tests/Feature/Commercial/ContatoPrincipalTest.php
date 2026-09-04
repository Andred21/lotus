<?php

namespace Tests\Feature\Commercial;

use App\Domains\Commercial\Actions\UpdateClientContactAction;
use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;
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

    /**
     * O create pela MESMA porta do update. A D-09 não distingue verbo — a
     * regra mora no `ClientData`, que os dois atravessam —, mas prova que só
     * cobre o PUT deixa o POST livre para regredir sozinho (o `sometimes` da
     * coleção é justamente o ponto onde os dois verbos poderiam divergir).
     * RUT e e-mail próprios de propósito: com os do cliente do `setUp` o 422
     * viria da unicidade, e o teste passaria pela porta errada.
     */
    public function test_criar_sem_nenhum_principal_e_422(): void
    {
        $this->postJson('/api/clients', [
            ...$this->payload([
                ['name' => 'Ana', 'is_primary' => false],
                ['name' => 'Bruno', 'is_primary' => false],
            ]),
            'name' => 'Nueva SpA',
            'legal_name' => 'Nueva SpA',
            'rut' => '77.222.000-6',
            'email' => 'nueva@example.test',
        ])->assertStatus(422)->assertJsonPath('errors.contacts.0', 'El cliente necesita exactamente un contacto principal.');
    }

    public function test_criar_com_exatamente_um_principal_passa(): void
    {
        $this->postJson('/api/clients', [
            ...$this->payload([
                ['name' => 'Ana', 'is_primary' => true],
                ['name' => 'Bruno', 'is_primary' => false],
            ]),
            'name' => 'Nueva SpA',
            'legal_name' => 'Nueva SpA',
            'rut' => '77.222.000-6',
            'email' => 'nueva@example.test',
        ])->assertCreated();
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

    /**
     * O `$contact` chega do route binding, resolvido ANTES do `lockForWrite`.
     * Aqui a instância é deliberadamente velha — Bruno foi promovido no banco
     * depois de carregada —, que é o que uma exclusão concorrente do principal
     * produz. Sem o `refresh()` dentro da transação a guarda lê `is_primary`
     * false, não dispara o 422, grava o desmarque e o `ensureExactlyOne`
     * re-promove: 200 dizendo que aceitou o que não aceitou.
     */
    public function test_a_guarda_le_o_estado_de_depois_do_lock_e_nao_o_do_binding(): void
    {
        $ana = $this->contato('Ana', true);
        $bruno = $this->contato('Bruno', false);

        $brunoVelho = ClientContact::findOrFail($bruno->id);
        $ana->delete();
        $this->client->contacts()->whereKey($bruno->id)->update(['is_primary' => true]);
        $this->assertFalse($brunoVelho->is_primary, 'A instância precisa estar velha para o teste valer.');

        $this->expectException(ValidationException::class);

        app(UpdateClientContactAction::class)->execute($brunoVelho, new ClientContactData(
            id: $bruno->id,
            name: 'Bruno',
            email: new Optional,
            phone: new Optional,
            job_title: new Optional,
            is_primary: false,
        ));
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
