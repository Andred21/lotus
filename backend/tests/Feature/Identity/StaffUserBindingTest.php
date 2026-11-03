<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
