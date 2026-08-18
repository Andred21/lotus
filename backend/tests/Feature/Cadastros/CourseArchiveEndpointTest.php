<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CourseArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeCourse(['name' => 'Vivo']);
        $arquivado = $this->makeCourse(['name' => 'Arquivado']);
        $arquivado->delete();

        $this->getJson('/api/courses/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.course.id', $arquivado->id)
            ->assertJsonPath('0.course.name', 'Arquivado')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/courses')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_restaura_e_devolve_o_curso(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse(['name' => 'Volta']);
        $course->delete();

        $this->postJson("/api/courses/{$course->id}/restore")
            ->assertOk()
            ->assertJsonPath('name', 'Volta');

        $this->assertNull($course->fresh()->deleted_at);
    }

    public function test_restaurar_curso_ativo_da_404(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse();

        $this->postJson("/api/courses/{$course->id}/restore")->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('catalog.course.view');
        $this->actingAs($user, 'web');

        $course = $this->makeCourse();
        $course->delete();

        $this->getJson('/api/courses/archived')->assertOk();
        $this->postJson("/api/courses/{$course->id}/restore")->assertForbidden();
    }
}
