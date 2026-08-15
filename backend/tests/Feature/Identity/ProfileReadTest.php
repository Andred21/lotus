<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ProfileReadTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create([
            'type' => 'redator',
            'is_active' => true,
            'rut' => '12.345.678-5',
        ]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    public function test_visitante_nao_autenticado_recebe_401(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
    }

    public function test_admin_le_o_proprio_perfil_sem_bloco_de_redator(): void
    {
        $admin = $this->actingAsAdmin();

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('email', $admin->email)
            ->assertJsonPath('redator', null);
    }

    /**
     * A permissão administrativa NÃO é o gate desta rota (spec D7): um redator,
     * que não tem `identity.user.update`, lê o próprio perfil normalmente.
     */
    public function test_redator_sem_permissao_administrativa_le_o_proprio_perfil(): void
    {
        $this->actingAsRedator();

        $this->getJson('/api/profile')
            ->assertOk()
            ->assertJsonCount(4, 'redator.documentos')
            ->assertJsonPath('redator.documentos.0.status', 'ausente')
            ->assertJsonPath('redator.cursos_habilitados', 0);
    }

    /**
     * Guarda de N+1 por INVARIÂNCIA, não por número mágico: mais cursos e mais
     * documentos não podem custar mais queries.
     *
     * `Model::preventLazyLoading()` não serve aqui e a spec §9 registra o
     * porquê — ele não está ligado globalmente na suíte, e `Builder::hydrate()`
     * só marca a instância quando hidrata MAIS DE UMA linha. O perfil hidrata
     * um usuário, então a guarda nunca dispararia e o teste passaria verde com
     * o N+1 presente.
     *
     * `forgetGuards()` + reautenticação entre as duas chamadas — sem isso o
     * teste mede lixo. Medido, não suposto: a rota autentica por
     * `auth:sanctum`, que resolve via `Illuminate\Auth\RequestGuard` (Sanctum
     * registra com `Auth::viaRequest`). Esse guard CACHEIA o usuário
     * internamente na primeira resolução e é singleton no container durante
     * todo o método de teste — `actingAs($novoUser, 'web')` sozinho não basta,
     * porque só troca o guard `web`; `$request->user()` continua batendo no
     * `sanctum`, que devolve o objeto velho, com `redator` já carregado da
     * primeira chamada (`loadMissing` vira no-op: 0 queries, corpo com dado
     * velho). `forgetGuards()` derruba os guards resolvidos, forçando o
     * `sanctum` a se reconstruir e reler o `web` que acabou de ser trocado. É
     * artefato do container persistir entre chamadas de teste, não do
     * comportamento em produção: lá cada request boota o guard do zero.
     */
    public function test_perfil_nao_faz_n_mais_um(): void
    {
        $redator = $this->actingAsRedator();
        $redator->courses()->attach($this->makeCourse(['name' => 'Um'])->id);
        $redator->documents()->create([
            'type' => RedatorDocumentType::CV->value,
            'path' => 'p/1.pdf', 'original_name' => '1.pdf', 'mime' => 'application/pdf', 'size' => 1,
        ]);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/profile')->assertOk();
        $magro = count(DB::getQueryLog());

        $redator->courses()->attach([
            $this->makeCourse(['name' => 'Dois'])->id,
            $this->makeCourse(['name' => 'Tres'])->id,
        ]);
        foreach ([RedatorDocumentType::REUF, RedatorDocumentType::TITULO] as $tipo) {
            $redator->documents()->create([
                'type' => $tipo->value,
                'path' => "p/{$tipo->value}.pdf", 'original_name' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 1,
            ]);
        }

        $this->app['auth']->forgetGuards();
        $this->actingAs(User::findOrFail($redator->user_id), 'web');
        DB::flushQueryLog();
        $this->getJson('/api/profile')->assertOk();
        $gordo = count(DB::getQueryLog());

        $this->assertSame($magro, $gordo, 'A leitura do perfil cresce em queries com o volume: há N+1.');
    }
}
