<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\UpdateStaffUserAction;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\SuperadminGuard;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SuperadminGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_bloqueia_ultimo_superadmin_ativo(): void
    {
        $sa = User::factory()->create();
        $sa->assignRole('superadmin');

        $this->expectException(ValidationException::class);
        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa);
    }

    public function test_permite_quando_existe_outro_superadmin_ativo(): void
    {
        $sa1 = User::factory()->create();
        $sa1->assignRole('superadmin');
        $sa2 = User::factory()->create();
        $sa2->assignRole('superadmin');

        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa1);

        $this->assertTrue(true); // não lançou
    }

    public function test_ignora_alvo_que_nao_e_superadmin(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($admin);

        $this->assertTrue(true); // não lançou
    }

    /**
     * O `->where('is_active', true)` do guard é o que impede o lock-out real:
     * um superadmin inativo não loga (RN-01), então ele não é saída de
     * emergência nenhuma. Sem este caso, remover o filtro deixa a suíte inteira
     * verde e o sistema pode ficar sem NENHUM superadmin capaz de entrar.
     */
    public function test_outro_superadmin_inativo_nao_conta_como_ativo(): void
    {
        $sa1 = User::factory()->create();
        $sa1->assignRole('superadmin');
        $sa2 = User::factory()->inactive()->create();
        $sa2->assignRole('superadmin');

        try {
            app(SuperadminGuard::class)->assertNotLastActiveSuperadmin($sa1);
            $this->fail('esperava ValidationException: o outro superadmin está inativo');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('role', $e->errors());
        }
    }

    /**
     * O guard decide por uma leitura TRAVADA do conjunto de superadmins ativos.
     * Fora da transação que escreve, esse lock morre no autocommit e o par
     * check/write volta a ser dois passos independentes: duas demoções
     * concorrentes passam as duas e o sistema fica sem nenhum superadmin
     * (review de 2026-08-11, Q-1).
     *
     * sqlite não prova serialização (`SQLiteGrammar::compileLock()` devolve
     * `''`, o `for update` some). O que ele prova — e é a condição sem a qual o
     * lock não valeria nem em MySQL — é a POSIÇÃO: a leitura do guard acontece
     * dentro da transação da Action e antes da escrita.
     */
    public function test_leitura_do_guard_acontece_dentro_da_transacao_da_action_e_antes_da_escrita(): void
    {
        $alvo = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $alvo->assignRole('superadmin');
        $outro = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $outro->assignRole('superadmin');

        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = [$query->sql, DB::transactionLevel()];
        });

        // Demove o alvo para admin: é o que aciona o guard.
        // Nome forçado a mudar: a omissão de rut/phone não suja mais (BD-14),
        // então o update só emite se algum atributo muda de verdade.
        app(UpdateStaffUserAction::class)->execute($alvo, UserData::from([
            'name' => 'Alvo Demovido',
            'email' => $alvo->email,
            'role' => 'admin',
            'is_active' => true,
        ]));

        // A varredura do guard é a única que filtra `users` por um EXISTS sobre
        // roles — `hasRole()` carrega a relação (select em `roles`), não isto.
        // O delimitador de identificador fica curinga: sqlite cita com aspas e
        // MySQL com crase, e este caso roda nos dois.
        $leituras = [];
        $escrita = null;

        foreach ($queries as $indice => [$sql, $nivel]) {
            if (preg_match('/from .users. where exists \(select \* from .roles./', $sql) === 1) {
                $leituras[] = [$indice, $nivel];
            }

            if ($escrita === null && preg_match('/^update .users./', $sql) === 1) {
                $escrita = $indice;
            }
        }

        $this->assertNotEmpty($leituras, 'o guard não chegou a ler o conjunto de superadmins ativos');
        $this->assertNotNull($escrita, 'a Action não chegou a escrever o usuário');

        foreach ($leituras as [$indice, $nivel]) {
            // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta
            // durante o teste inteiro. Asserir `> 0` mediria o RefreshDatabase.
            $this->assertSame(2, $nivel, 'a leitura do guard rodou fora da transação da Action');
            $this->assertLessThan($escrita, $indice, 'o guard leu depois de a Action já ter escrito');
        }
    }
}
