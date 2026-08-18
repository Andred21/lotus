<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Actions\ArchiveCourseAction;
use App\Domains\Catalog\Models\CourseModule;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CourseArchiveEndpointTest extends TestCase
{
    use CreatesCertificateTemplates;
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

    public function test_arquivado_mostra_modulos_e_templates_que_a_cascata_levou(): void
    {
        // Gêmeo do teste do cliente (Q-8): sem o eager load com `withTrashed()`
        // o payload do arquivado chega com as duas coleções vazias, negando o
        // que o curso tinha no instante do arquivamento.
        $this->actingAsAdmin();

        $course = $this->makeCourse(['name' => 'Alta Tensión']);
        $this->makeTemplate($course->id, ['version' => 1]);
        $course->modules()->create(['sort_order' => 1, 'name' => 'Módulo 1']);

        $course->delete();

        $this->getJson('/api/courses/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.course.templates')
            ->assertJsonCount(1, '0.course.modules')
            ->assertJsonPath('0.course.modules.0.name', 'Módulo 1');
    }

    public function test_arquivado_nao_mostra_o_modulo_arquivado_antes_do_pai(): void
    {
        $this->actingAsAdmin();

        $course = $this->makeCourse(['name' => 'Con Módulo Antiguo']);
        $course->modules()->create(['sort_order' => 1, 'name' => 'Antigo'])->delete();
        $course->modules()->create(['sort_order' => 2, 'name' => 'Vivo']);

        $course->delete();

        $this->getJson('/api/courses/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.course.modules')
            ->assertJsonPath('0.course.modules.0.name', 'Vivo');
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber` da rota, `int $course` estoura `TypeError` antes
        // de qualquer consulta e o handler devolve 500 (Q-6 do review).
        $this->actingAsAdmin();

        $this->postJson('/api/courses/abc/restore')->assertNotFound();
    }

    public function test_arquivar_curso_cascateia_dentro_de_transacao(): void
    {
        // Q-5: o `destroy` ganhou Action própria. A prova é o ROLLBACK — sem
        // transação, cada `delete()` do hook autocommita e uma falha no meio da
        // cascata deixa o template arquivado sob um curso que continua ativo.
        $this->actingAsAdmin();
        $course = $this->makeCourse();
        $template = $this->makeTemplate($course->id, ['version' => 1]);
        $modulo = $course->modules()->create(['sort_order' => 1, 'name' => 'Módulo 1']);

        // O hook apaga os templates ANTES dos módulos: estourar no módulo deixa
        // exatamente a escrita parcial que a transação tem de desfazer.
        Event::listen('eloquent.deleting: '.CourseModule::class, function () {
            throw new RuntimeException('falha no meio da cascata');
        });

        try {
            app(ArchiveCourseAction::class)->execute($course);
            $this->fail('a cascata deveria ter estourado');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertNull($course->fresh()->deleted_at, 'o curso ficou arquivado apesar da falha');
        $this->assertNull($template->fresh()->deleted_at, 'o template não voltou no rollback');
        $this->assertNull($modulo->fresh()->deleted_at);
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
