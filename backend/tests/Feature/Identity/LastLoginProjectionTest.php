<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A projeção do último acesso nos dois DTOs.
 *
 * O caso dos DOIS logins é o que discrimina `latestOfMany()` de um `hasOne`
 * qualquer: uma implementação que devolvesse a linha MAIS ANTIGA passaria em
 * todos os outros casos deste arquivo.
 */
class LastLoginProjectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_data_projeta_o_login_mais_recente_em_iso(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create(['type' => 'admin', 'name' => 'Alvo Staff']);
        // `created_at` NÃO é `$fillable` de propósito (a data do acesso não se
        // forja por mass assignment), então backdatar em teste é `forceFill`.
        // Passar a chave no `create()` seria descartado em SILÊNCIO e as duas
        // linhas nasceriam com a mesma data — o caso pararia de discriminar.
        $user->loginLogs()->create([])
            ->forceFill(['created_at' => '2026-01-10 08:00:00'])->save();
        $recente = $user->loginLogs()->create([]);
        $recente->forceFill(['created_at' => '2026-08-12 14:32:00'])->save();
        $recente->refresh();

        $linha = collect($this->getJson('/api/users')->assertOk()->json())
            ->firstWhere('id', $user->id);

        $this->assertSame(
            $recente->created_at->toISOString(),
            $linha['last_login'],
        );
    }

    public function test_user_data_projeta_null_para_quem_nunca_acessou(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create(['type' => 'admin', 'name' => 'Nunca Acessou']);

        $linha = collect($this->getJson('/api/users')->assertOk()->json())
            ->firstWhere('id', $user->id);

        $this->assertNull($linha['last_login']);
    }

    public function test_redator_data_projeta_o_login_do_usuario(): void
    {
        $this->actingAsAdmin();

        // `rut` explícito: `RedatorData::$rut` é `string` não-nula (a criação
        // real sempre valida `rut` antes de chegar aqui), mas este teste
        // monta o Redator direto no Eloquent, sem passar pela Action/rules —
        // sem isso o `fromModel` estoura TypeError antes de chegar em
        // `last_login`, por um motivo que nada tem a ver com esta task.
        $user = User::factory()->redator()->create(['rut' => '12.345.678-5']);
        $redator = Redator::create(['user_id' => $user->id]);
        $recente = $user->loginLogs()->create([]);
        $recente->forceFill(['created_at' => '2026-08-12 09:15:00'])->save();
        $recente->refresh();

        $linha = collect($this->getJson('/api/redatores')->assertOk()->json())
            ->firstWhere('id', $redator->id);

        $this->assertSame($recente->created_at->toISOString(), $linha['last_login']);
    }
}
