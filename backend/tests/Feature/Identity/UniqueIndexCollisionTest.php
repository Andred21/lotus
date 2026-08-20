<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * P-29: o check de unicidade roda dentro da transação, mas não trava linha
 * inexistente — dois cadastros simultâneos do mesmo RUT passam os dois pelo
 * check e o perdedor estoura no índice único. O handler devolvia 500 mascarado.
 */
class UniqueIndexCollisionTest extends TestCase
{
    use RefreshDatabase;

    /** MySQL é o banco de produção; a suíte roda sqlite. As duas grafias contam. */
    public function test_traduz_a_mensagem_do_mysql(): void
    {
        $e = new QueryException(
            'mysql',
            'update `users` set `email` = ?',
            [],
            new \RuntimeException("Duplicate entry 'ana@lotus.cl' for key 'users_email_unique'"),
        );

        try {
            app(UserProvisioner::class)->writing(fn () => throw $e);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $validacao) {
            $this->assertArrayHasKey('email', $validacao->errors());
        }
    }

    public function test_traduz_a_mensagem_do_sqlite(): void
    {
        $e = new QueryException(
            'sqlite',
            'update "users" set "rut" = ?',
            [],
            new \RuntimeException('UNIQUE constraint failed: users.rut'),
        );

        try {
            app(UserProvisioner::class)->writing(fn () => throw $e);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $validacao) {
            $this->assertArrayHasKey('rut', $validacao->errors());
        }
    }

    /** Violação de OUTRA tabela continua subindo como está — 500 honesto. */
    public function test_nao_sequestra_violacao_de_outra_tabela(): void
    {
        $e = new QueryException(
            'sqlite',
            'insert into "quotes"',
            [],
            new \RuntimeException('UNIQUE constraint failed: quotes.budget_id, quotes.seq_in_budget'),
        );

        $this->expectException(QueryException::class);

        app(UserProvisioner::class)->writing(fn () => throw $e);
    }

    /**
     * Prova pelo caminho HTTP: a linha colidente nasce DEPOIS do check, dentro
     * da mesma transação, então o UPDATE é que estoura no índice.
     */
    public function test_colisao_real_no_update_devolve_422_com_o_campo(): void
    {
        $this->actingAsSuperadmin();

        $alvo = User::factory()->create(['type' => 'admin', 'email' => 'alvo@lotus.cl']);
        $alvo->assignRole('admin');

        $jaInseriu = false;
        User::updating(function () use (&$jaInseriu) {
            if ($jaInseriu) {
                return;
            }
            $jaInseriu = true;
            User::factory()->create(['type' => 'admin', 'email' => 'corrida@lotus.cl']);
        });

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo',
            'email' => 'corrida@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertStatus(422)->assertJsonPath('errors.email.0', fn ($m) => $m !== null);
    }

    /**
     * Mesma prova do teste acima, mas no CREATE: a linha colidente nasce
     * DEPOIS do check de `CreateStaffUserAction`, dentro da mesma transação,
     * então o INSERT do próprio staff é que estoura no índice.
     */
    public function test_colisao_real_no_create_devolve_422_com_o_campo(): void
    {
        $this->actingAsSuperadmin();

        $jaInseriu = false;
        User::creating(function () use (&$jaInseriu) {
            if ($jaInseriu) {
                return;
            }
            $jaInseriu = true;
            User::factory()->create(['type' => 'admin', 'email' => 'corrida-create@lotus.cl']);
        });

        $this->postJson('/api/users', [
            'name' => 'Novo Admin',
            'email' => 'corrida-create@lotus.cl',
            'password' => 'senha1234',
            'role' => 'admin',
            'is_active' => true,
        ])->assertStatus(422)->assertJsonPath('errors.email.0', fn ($m) => $m !== null);
    }
}
