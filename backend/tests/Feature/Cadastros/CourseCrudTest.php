<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesCertificateTemplates;
use Tests\TestCase;

class CourseCrudTest extends TestCase
{
    use CreatesCertificateTemplates, RefreshDatabase;

    public function test_rotas_de_template_respondem_404_e_nao_tocam_o_legado(): void
    {
        $this->actingAsAdmin();
        $course = Course::create(['name' => 'Curso Legado', 'workload_hours' => 8]);
        $template = $this->makeTemplate($course->id, ['version' => 1]);

        $this->postJson("/api/courses/{$course->id}/templates", ['layout_config' => []])->assertNotFound();
        $this->putJson("/api/templates/{$template->id}", ['layout_config' => []])->assertNotFound();
        $this->deleteJson("/api/templates/{$template->id}")->assertNotFound();

        $this->assertNotSoftDeleted('course_certificate_templates', ['id' => $template->id]);
    }

    public function test_payload_com_templates_nao_grava_template_nem_devolve_a_chave(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', [
            'name' => 'Alta Tensão NR-10',
            'technical_name' => 'AT-NR10',
            'description' => 'Curso regulado de alta tensão.',
            'workload_hours' => 40,
            'templates' => [
                ['version' => 1, 'layout_config' => ['orientation' => 'landscape'], 'validity_months' => 24],
            ],
        ])->assertCreated()
            ->assertJsonPath('name', 'Alta Tensão NR-10')
            ->assertJsonMissingPath('templates');

        $this->assertDatabaseHas('courses', ['name' => 'Alta Tensão NR-10', 'workload_hours' => 40]);
        $this->assertDatabaseCount('course_certificate_templates', 0);
    }

    public function test_editar_curso_com_templates_vazio_nao_arquiva_o_legado(): void
    {
        $this->actingAsAdmin();
        $course = Course::create(['name' => 'Curso Legado', 'workload_hours' => 8]);
        $template = $this->makeTemplate($course->id, ['version' => 1]);

        $this->putJson("/api/courses/{$course->id}", [
            'name' => 'Curso Legado', 'workload_hours' => 8, 'templates' => [],
        ])->assertOk()->assertJsonMissingPath('templates');

        $this->assertNotSoftDeleted('course_certificate_templates', ['id' => $template->id]);
    }

    public function test_name_obrigatorio(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/courses', ['workload_hours' => 10])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_lista_mostra_edita_remove(): void
    {
        $this->actingAsAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
        ])->json('id');

        $this->getJson('/api/courses')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/courses/{$id}")->assertOk()->assertJsonPath('id', $id);

        // update
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X Editado', 'workload_hours' => 16,
        ])->assertOk()->assertJsonPath('name', 'Curso X Editado');

        $this->assertDatabaseHas('courses', ['id' => $id, 'workload_hours' => 16]);

        $this->deleteJson("/api/courses/{$id}")->assertNoContent();
        $this->assertSoftDeleted('courses', ['id' => $id]);
    }
}
