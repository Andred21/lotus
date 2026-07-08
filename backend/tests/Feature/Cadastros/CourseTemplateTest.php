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
}
