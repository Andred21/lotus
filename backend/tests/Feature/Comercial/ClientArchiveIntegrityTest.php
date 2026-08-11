<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\CreateClientAddressAction;
use App\Domains\Commercial\Actions\CreateClientContactAction;
use App\Domains\Commercial\Actions\DeleteClientAction;
use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Arquivar cliente é enumerar-e-apagar: o hook `deleting` do model lê a coleção
 * e apaga item a item. Sem transação e sem mutex isso é check-then-act, e o
 * contato criado no meio sobrevive ATIVO sob um cliente arquivado — filho órfão
 * de pai arquivado, com peso legal (review de 2026-08-11, Q-2).
 *
 * Aqui ficam as guardas que sqlite consegue provar: a cascata dentro de UMA
 * transação e a recusa de escrever sob cliente arquivado. A serialização real
 * (o mutex sendo pedido ANTES de tocar na coleção) só se prova em MySQL —
 * `PrimaryConcurrencyTest::test_arquivamento_de_cliente_espera_pelo_mutex_no_mysql`.
 */
class ClientArchiveIntegrityTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_cascata_do_arquivamento_roda_dentro_de_uma_transacao(): void
    {
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        $client->addresses()->create(['line1' => 'Rua A', 'is_primary' => true]);

        $niveis = [];
        Event::listen('eloquent.deleting: '.ClientContact::class, function () use (&$niveis): void {
            $niveis[] = DB::transactionLevel();
        });

        app(DeleteClientAction::class)->execute($client);

        $this->assertNotEmpty($niveis, 'a cascata não apagou o contato');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não a Action.
        $this->assertSame(2, $niveis[0], 'a cascata rodou fora da transação da Action');

        $this->assertSoftDeleted('clients', ['id' => $client->id]);
        $this->assertSame(0, $client->contacts()->count());
        $this->assertSame(0, $client->addresses()->count());
    }

    public function test_criar_contato_em_cliente_arquivado_e_recusado(): void
    {
        $client = $this->makeClientWithUser();
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);
        app(DeleteClientAction::class)->execute($client);

        // O binding de rota resolve cliente VIVO — este é o cliente que a
        // requisição concorrente já tinha em mãos quando o arquivamento passou.
        try {
            app(CreateClientContactAction::class)->execute(
                $client,
                ClientContactData::from(['name' => 'Bruno', 'is_primary' => true]),
            );
            $this->fail('esperava ValidationException: cliente arquivado não aceita contato novo');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('client', $e->errors());
        }

        $this->assertSame(0, ClientContact::where('client_id', $client->id)->count());
    }

    public function test_criar_endereco_em_cliente_arquivado_e_recusado(): void
    {
        $client = $this->makeClientWithUser();
        app(DeleteClientAction::class)->execute($client);

        $this->expectException(ValidationException::class);
        app(CreateClientAddressAction::class)->execute(
            $client,
            ClientAddressData::from(['line1' => 'Rua B', 'is_primary' => true]),
        );
    }

    /**
     * O mutex descartava o resultado do `first()` e devolvia `void`: se a linha
     * não existisse, ele não travava nada e ninguém ficava sabendo — no-op
     * indetectável (review de 2026-08-11, Q-5). Agora falha alto.
     */
    public function test_mutex_de_cliente_inexistente_falha_em_vez_de_seguir_sem_lock(): void
    {
        $this->expectException(ModelNotFoundException::class);

        Client::lockForWrite(999_999);
    }
}
