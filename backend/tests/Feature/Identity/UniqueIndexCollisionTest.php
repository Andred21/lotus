<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * P-29: o check de unicidade roda dentro da transação, mas não trava linha
 * inexistente — dois cadastros simultâneos do mesmo RUT passam os dois pelo
 * check e o perdedor estoura no índice único. O handler devolvia 500 mascarado.
 */
class UniqueIndexCollisionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * As quatro formas vieram de reproduzir a violação de verdade, não de
     * memória. Contra o `mysql` deste compose (`mysql:8.0`, 8.0.45):
     *
     *   CREATE TABLE users (..., UNIQUE KEY users_rut_unique (rut), UNIQUE KEY users_email_unique (email));
     *   INSERT INTO users (rut, email) VALUES ('11.111.111-1', 'ana@lotus.cl');
     *   INSERT INTO users (rut, email) VALUES ('22.222.222-2', 'ana@lotus.cl');
     *     -> ERROR 1062 (23000): Duplicate entry 'ana@lotus.cl' for key 'users.users_email_unique'
     *   INSERT INTO users (rut, email) VALUES ('11.111.111-1', 'outro@lotus.cl');
     *     -> ERROR 1062 (23000): Duplicate entry '11.111.111-1' for key 'users.users_rut_unique'
     *
     * A forma QUALIFICADA (`users.users_x_unique`) é a que o MySQL 8.0.32+
     * emite — é a real, reproduzida acima. A forma SEM qualificador
     * (`users_x_unique`) é a de antes da 8.0.32; como a versão do MySQL do
     * RDS em produção não é conhecida, as duas seguem cobertas em vez de só
     * a que a review conseguiu reproduzir localmente.
     */
    #[DataProvider('mensagensDoMysql')]
    public function test_traduz_a_mensagem_do_mysql(string $mensagem, string $colunaEsperada): void
    {
        $e = new QueryException(
            'mysql',
            'update `users` set `'.$colunaEsperada.'` = ?',
            [],
            new \RuntimeException($mensagem),
        );

        try {
            app(UserProvisioner::class)->writing(fn () => throw $e);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $validacao) {
            $this->assertArrayHasKey($colunaEsperada, $validacao->errors());
        }
    }

    public static function mensagensDoMysql(): array
    {
        return [
            'email, forma qualificada (MySQL 8.0.32+)' => [
                "Duplicate entry 'ana@lotus.cl' for key 'users.users_email_unique'",
                'email',
            ],
            'email, forma sem qualificador (MySQL anterior a 8.0.32)' => [
                "Duplicate entry 'ana@lotus.cl' for key 'users_email_unique'",
                'email',
            ],
            'rut, forma qualificada (MySQL 8.0.32+)' => [
                "Duplicate entry '11.111.111-1' for key 'users.users_rut_unique'",
                'rut',
            ],
            'rut, forma sem qualificador (MySQL anterior a 8.0.32)' => [
                "Duplicate entry '11.111.111-1' for key 'users_rut_unique'",
                'rut',
            ],
        ];
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
     * Violação de NOT NULL na PRÓPRIA tabela `users` também não pode virar
     * 422 de unicidade: a mensagem do sqlite pra NOT NULL é
     * `NOT NULL constraint failed: users.email`, que contém "users.email" e
     * casaria pelo `str_contains` de `duplicateColumn` se a checagem não
     * exigisse primeiro o marcador de violação de UNICIDADE. Reproduzido,
     * não hipotético.
     */
    public function test_nao_sequestra_violacao_de_not_null_da_mesma_tabela(): void
    {
        $e = new QueryException(
            'sqlite',
            'insert into "users"',
            [],
            new \RuntimeException('NOT NULL constraint failed: users.email'),
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
