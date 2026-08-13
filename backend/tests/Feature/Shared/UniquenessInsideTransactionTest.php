<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Actions\UpdateStaffUserAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A checagem de unicidade (RUT/e-mail) tem de rodar DENTRO da transação que
 * escreve. Fora dela, check e write são duas operações independentes e a janela
 * entre as duas é real.
 *
 * Desde o bloco `contrato-de-entrada-identidade-e-nested`, os NOVE caminhos de
 * escrita de identidade passam pela mesma porta (`ensureIdentityAvailable`), e
 * os três aqui exercem as duas colunas — a assimetria que este arquivo
 * registrava (staff com ['rut','email'], cliente e redator só com ['rut'])
 * deixou de existir.
 *
 * A suíte roda sqlite `:memory:`: este teste NÃO fecha a corrida. Ele prova a
 * atomicidade de check+write, que é a condição sem a qual nada mais adianta. A
 * corrida em si continua aberta e declarada (spec §4): duas escritas
 * concorrentes com o mesmo RUT colidem no índice único de `users.rut` — que não
 * distingue `deleted_at`, razão de o check existir com `withTrashed` — e sobem
 * 500, não 422.
 */
class UniquenessInsideTransactionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_unicidade_do_staff_roda_dentro_da_transacao(): void
    {
        $user = User::factory()->create(['rut' => '12.345.678-5', 'email' => 'ana@lotus.cl']);
        $user->assignRole('admin');

        $niveis = $this->niveisDeUnicidade(['rut', 'email'], fn () => app(UpdateStaffUserAction::class)->execute(
            $user,
            UserData::from([
                'name' => 'Ana Renomeada',
                'email' => 'ana@lotus.cl',
                'rut' => '12.345.678-5',
                'role' => 'admin',
                'is_active' => true,
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
        $this->assertChecouDentroDaTransacao($niveis, 'email');
    }

    public function test_unicidade_do_cliente_roda_dentro_da_transacao(): void
    {
        $client = $this->makeClientWithUser([], ['rut' => '13.456.789-9']);

        $niveis = $this->niveisDeUnicidade(['rut', 'email'], fn () => app(UpdateClientAction::class)->execute(
            $client,
            ClientData::from([
                'name' => 'ACME',
                'legal_name' => 'ACME',
                'rut' => '13.456.789-9',
                'email' => $client->user->email,
                'type' => 'client',
                'contacts' => [['name' => 'Ana', 'is_primary' => true]],
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
        $this->assertChecouDentroDaTransacao($niveis, 'email');
    }

    public function test_unicidade_do_redator_roda_dentro_da_transacao(): void
    {
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => '13.456.789-9'])->id,
        ]);

        $niveis = $this->niveisDeUnicidade(['rut', 'email'], fn () => app(UpdateRedatorAction::class)->execute(
            $redator,
            RedatorData::from([
                'name' => $redator->user->name,
                'rut' => '13.456.789-9',
                'email' => $redator->user->email,
            ]),
        ));

        $this->assertChecouDentroDaTransacao($niveis, 'rut');
        $this->assertChecouDentroDaTransacao($niveis, 'email');
    }

    /**
     * Níveis de transação observados em cada SELECT de checagem de unicidade
     * que cita a coluna, na ordem em que rodaram.
     *
     * @param  array<int, string>  $colunas
     * @return array<string, array<int, int>>
     */
    private function niveisDeUnicidade(array $colunas, callable $operacao): array
    {
        $niveis = [];

        DB::listen(function (QueryExecuted $query) use (&$niveis, $colunas): void {
            // A checagem projeta `deleted_at` (é ela que distingue "já
            // cadastrado" de "cadastro arquivado"), e o UPDATE de `users`
            // também contém `rut = ?` — daí o filtro por SELECT + a coluna
            // projetada, em vez de pelo nome da coluna sozinho. O caractere de
            // citação muda entre sqlite e MySQL, então nada de aspas no match.
            if (! str_starts_with($query->sql, 'select') || ! str_contains($query->sql, 'deleted_at')) {
                return;
            }

            foreach ($colunas as $coluna) {
                if (str_contains($query->sql, $coluna)) {
                    $niveis[$coluna][] = $query->connection->transactionLevel();
                }
            }
        });

        $operacao();

        return $niveis;
    }

    /** @param  array<string, array<int, int>>  $niveis */
    private function assertChecouDentroDaTransacao(array $niveis, string $coluna): void
    {
        $this->assertArrayHasKey($coluna, $niveis, "a checagem de unicidade de {$coluna} não rodou");
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não o código
        // sob teste.
        $this->assertSame(2, $niveis[$coluna][0], "a unicidade de {$coluna} foi checada FORA da transação que escreve");
    }
}
