<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Companheiro de RUNTIME da projeção de `last_login`.
 *
 * Concentrar a leitura numa relação troca duplicação visível por N+1 invisível
 * se a carga ficar para trás — medido em 2026-08-08 no seam do B4: 4 turmas
 * custaram 4 SELECTs extras em `users`, um por turma.
 *
 * `Model::preventLazyLoading()` só marca a instância quando ela vem de um
 * `hydrate()` com MAIS de uma linha (`Builder::hydrate()`, condicional a
 * `count($items) > 1`) — por isso cada cenário aqui materializa DUAS linhas, e
 * não uma.
 */
class LastLoginEagerLoadTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Model::preventLazyLoading(false);

        parent::tearDown();
    }

    public function test_listagem_de_usuarios_nao_lazy_loada_o_ultimo_login(): void
    {
        $this->actingAsAdmin();

        foreach (['Staff Um', 'Staff Dois'] as $nome) {
            $user = User::factory()->create(['type' => 'admin', 'name' => $nome]);
            $user->loginLogs()->create([]);
        }

        Model::preventLazyLoading();

        $this->getJson('/api/users')->assertOk();
    }

    public function test_listagem_de_redatores_nao_lazy_loada_o_ultimo_login(): void
    {
        $this->actingAsAdmin();

        // `rut` explícito: `RedatorData::$rut` é `string` não-nula (a criação
        // real sempre valida `rut` antes de chegar aqui), mas este teste monta
        // o Redator direto no Eloquent, sem passar pela Action/rules — sem
        // isso o `fromModel` estoura TypeError antes de chegar na guarda de
        // lazy-load, por um motivo que nada tem a ver com esta task. Ver
        // mesmo comentário em `LastLoginProjectionTest`.
        foreach (['12.345.678-5', '12.345.679-3'] as $rut) {
            $user = User::factory()->redator()->create(['rut' => $rut]);
            Redator::create(['user_id' => $user->id]);
            $user->loginLogs()->create([]);
        }

        Model::preventLazyLoading();

        $this->getJson('/api/redatores')->assertOk()->assertJsonCount(2);
    }
}
