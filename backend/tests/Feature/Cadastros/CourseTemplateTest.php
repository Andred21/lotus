<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): void
    {
        $this->actingAsAdmin();
    }

    public function test_gerencia_template_individual_do_curso(): void
    {
        $this->actingAdmin();
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);

        $templateId = $this->postJson("/api/courses/{$course->id}/templates", [
            'version' => 1,
            'layout_config' => ['orientation' => 'portrait'],
            'validity_months' => 12,
        ])->assertCreated()->assertJsonPath('version', 1)->json('id');

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $templateId, 'course_id' => $course->id, 'version' => 1,
        ]);

        $this->putJson("/api/templates/{$templateId}", [
            'version' => 2,
            'layout_config' => ['orientation' => 'landscape'],
        ])->assertOk()->assertJsonPath('version', 2)
            ->assertJsonPath('layout_config.orientation', 'landscape');

        $this->deleteJson("/api/templates/{$templateId}")->assertNoContent();
        $this->assertSoftDeleted('course_certificate_templates', ['id' => $templateId]);
    }

    public function test_replace_de_templates_via_update_do_curso_registra_auditoria(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $antigo = Course::find($id)->certificateTemplates()->firstOrFail();

        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 2, 'layout_config' => ['orientation' => 'landscape']]],
        ])->assertOk();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_certificate_template',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_update_sem_o_campo_templates_preserva_os_templates(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        // Payload da tela de curso: não manda `templates`. Não pedir para mexer
        // na coleção não pode apagá-la (peso legal).
        $this->putJson("/api/courses/{$id}", ['name' => 'Curso Y', 'workload_hours' => 8])
            ->assertOk()
            ->assertJsonPath('name', 'Curso Y')
            ->assertJsonPath('templates.0.id', $template->id)
            ->assertJsonPath('templates.0.version', 1);

        $this->assertDatabaseHas('course_certificate_templates', [
            'id' => $template->id, 'deleted_at' => null,
        ]);
    }

    public function test_update_com_templates_vazio_apaga_explicitamente(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        // `[]` é ordem explícita de esvaziar — segue apagando.
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X', 'workload_hours' => 8, 'templates' => [],
        ])->assertOk()->assertJsonCount(0, 'templates');

        $this->assertSoftDeleted('course_certificate_templates', ['id' => $template->id]);
    }

    public function test_delete_de_curso_audita_o_soft_delete_dos_templates(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $template = Course::find($id)->certificateTemplates()->firstOrFail();

        $this->deleteJson("/api/courses/{$id}")->assertNoContent();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'course_certificate_template',
            'auditable_id' => $template->id,
            'event' => 'deleted',
        ]);
    }
}
