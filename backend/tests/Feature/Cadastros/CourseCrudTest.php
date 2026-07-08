<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseCrudTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): void
    {
        $this->actingAsAdmin();
    }

    public function test_cria_curso_com_template(): void
    {
        $this->actingAdmin();

        $response = $this->postJson('/api/courses', [
            'name' => 'Alta Tensão NR-10',
            'technical_name' => 'AT-NR10',
            'description' => 'Curso regulado de alta tensão.',
            'workload_hours' => 40,
            'templates' => [
                ['version' => 1, 'layout_config' => ['orientation' => 'landscape'], 'validity_months' => 24],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'Alta Tensão NR-10')
            ->assertJsonPath('templates.0.version', 1)
            ->assertJsonPath('templates.0.layout_config.orientation', 'landscape');

        $this->assertDatabaseHas('courses', ['name' => 'Alta Tensão NR-10', 'workload_hours' => 40]);
        $this->assertDatabaseHas('course_certificate_templates', ['version' => 1, 'validity_months' => 24]);
    }

    public function test_name_obrigatorio(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/courses', ['workload_hours' => 10])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_lista_mostra_edita_remove(): void
    {
        $this->actingAdmin();

        $id = $this->postJson('/api/courses', [
            'name' => 'Curso X', 'workload_hours' => 8,
            'templates' => [['version' => 1, 'layout_config' => ['orientation' => 'portrait']]],
        ])->json('id');

        $this->getJson('/api/courses')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/courses/{$id}")->assertOk()->assertJsonPath('id', $id);

        // update: replace templates
        $this->putJson("/api/courses/{$id}", [
            'name' => 'Curso X Editado', 'workload_hours' => 16,
            'templates' => [['version' => 2, 'layout_config' => ['color' => 'blue']]],
        ])->assertOk()->assertJsonPath('name', 'Curso X Editado')
            ->assertJsonPath('templates.0.version', 2);

        $this->assertDatabaseHas('courses', ['id' => $id, 'workload_hours' => 16]);
        $this->assertSame(1, Course::find($id)->certificateTemplates()->count());

        $this->deleteJson("/api/courses/{$id}")->assertNoContent();
        $this->assertSoftDeleted('courses', ['id' => $id]);
    }
}
