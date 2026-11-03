<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Card 10 / spec D7: toda rota `{user}` só enxerga staff (`type=admin`), por
 * binding e não por `abort_unless` em cada método. D7a: com o binding, o id
 * não-staff dá 404 também para ator sem permissão (antes era 403).
 */
class StaffUserBindingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Rotas de `api/*` com `{user}`, por método. Lê o roteador, então rota nova
     * com `{user}` entra no laço sem ninguém lembrar (spec objetivo 4).
     *
     * @return list<array{0: string, 1: string}>
     */
    private function rotasComParametroUser(): array
    {
        $rotas = [];

        foreach (Route::getRoutes() as $rota) {
            if (! str_starts_with($rota->uri(), 'api/') || ! str_contains($rota->uri(), '{user}')) {
                continue;
            }

            foreach ($rota->methods() as $metodo) {
                if ($metodo === 'HEAD') {
                    continue;
                }

                $rotas[] = [$metodo, $rota->uri()];
            }
        }

        return $rotas;
    }

    /**
     * Parâmetros da rota além de `{user}`. O laço abaixo só troca `{user}`: um
     * `{turma}` ficaria literal na URL, o binding do pai daria o 404 e a catraca
     * passaria sem o escopo staff ter sido exercido (revisão do bloco 55, Q-1).
     *
     * @return list<string>
     */
    private function outrosParametros(RoutingRoute $rota): array
    {
        return array_values(array_diff($rota->parameterNames(), ['user']));
    }

    private function actingAsRedator(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_toda_rota_com_user_recusa_id_nao_staff_com_404(): void
    {
        $this->actingAsSuperadmin();
        $vivo = User::factory()->create(['type' => 'redator', 'rut' => '12.345.679-3']);
        $arquivado = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.680-7']);
        $arquivado->delete();

        $rotas = $this->rotasComParametroUser();
        $this->assertNotEmpty($rotas);

        foreach ($rotas as [$metodo, $uri]) {
            foreach ([$vivo->id, $arquivado->id] as $id) {
                $this->json($metodo, '/'.str_replace('{user}', (string) $id, $uri))
                    ->assertNotFound("$metodo $uri id=$id");
            }
        }
    }

    public function test_rota_com_user_nao_tem_outro_parametro(): void
    {
        $aninhadas = [];

        foreach (Route::getRoutes() as $rota) {
            if (str_starts_with($rota->uri(), 'api/') && str_contains($rota->uri(), '{user}') && $this->outrosParametros($rota) !== []) {
                $aninhadas[] = $rota->uri();
            }
        }

        $this->assertSame([], $aninhadas, implode("\n", array_merge(
            [
                'Rota com `{user}` e outro parâmetro: o 404 da catraca pode vir do binding do pai.',
                'Estenda test_toda_rota_com_user_recusa_id_nao_staff_com_404 para montar os demais parâmetros com registro válido. Rotas:',
            ],
            $aninhadas,
        )));
    }

    public function test_catraca_ve_rota_aninhada(): void
    {
        $aninhada = new RoutingRoute(['GET'], 'api/turmas/{turma}/users/{user}', fn () => null);
        $simples = new RoutingRoute(['GET'], 'api/users/{user}', fn () => null);

        $this->assertSame(['turma'], $this->outrosParametros($aninhada));
        $this->assertSame([], $this->outrosParametros($simples));
    }

    public function test_controle_positivo_staff_resolve(): void
    {
        $this->actingAsSuperadmin();
        $staff = User::factory()->create(['type' => 'admin']);

        $this->getJson("/api/users/{$staff->id}")->assertOk();
    }

    public function test_user_nao_numerico_da_404(): void
    {
        $this->actingAsSuperadmin();

        $this->getJson('/api/users/abc')->assertNotFound();
    }

    public function test_ator_sem_permissao_e_id_nao_staff_recebe_404_d7a(): void
    {
        $this->actingAsRedator();
        $vivo = User::factory()->create(['type' => 'aluno', 'rut' => '12.345.681-5']);

        $this->getJson("/api/users/{$vivo->id}")->assertNotFound();
    }

    public function test_index_e_archived_listam_so_staff(): void
    {
        $this->actingAsSuperadmin();
        $adminVivo = User::factory()->create(['type' => 'admin', 'rut' => '12.345.682-3']);
        $redatorVivo = User::factory()->create(['type' => 'redator', 'rut' => '12.345.683-1']);
        $adminArquivado = User::factory()->create(['type' => 'admin', 'rut' => '12.345.684-K']);
        $redatorArquivado = User::factory()->create(['type' => 'redator', 'rut' => '12.345.685-8']);
        $adminArquivado->delete();
        $redatorArquivado->delete();

        $index = collect($this->getJson('/api/users')->assertOk()->json())->pluck('id');
        $this->assertTrue($index->contains($adminVivo->id));
        $this->assertFalse($index->contains($redatorVivo->id));
        $this->assertFalse($index->contains($adminArquivado->id));
        $this->assertFalse($index->contains($redatorArquivado->id));

        $arquivados = collect($this->getJson('/api/users/archived')->assertOk()->json())->pluck('user.id');
        $this->assertSame([$adminArquivado->id], $arquivados->all());
    }
}
