<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_curso_navega_templates_e_redatores_habilitados(): void
    {
        $course = Course::create([
            'name' => 'Alta Tensão NR-10',
            'technical_name' => 'AT-NR10',
            'workload_hours' => 40,
        ]);

        $course->certificateTemplates()->create([
            'version' => 1,
            'layout_config' => ['orientation' => 'landscape'],
            'validity_months' => 24,
        ]);

        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);
        $course->redatores()->attach($redator->id);

        $course->refresh();

        $this->assertCount(1, $course->certificateTemplates);
        $this->assertSame('landscape', $course->certificateTemplates->first()->layout_config['orientation']);
        $this->assertCount(1, $course->redatores);
        $this->assertTrue($redator->courses->first()->is($course));
    }

    public function test_soft_delete_do_curso_cascateia_para_templates(): void
    {
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);
        $template = $course->certificateTemplates()->create([
            'version' => 1,
            'layout_config' => [],
        ]);

        $course->delete();

        $this->assertSoftDeleted('courses', ['id' => $course->id]);
        $this->assertSoftDeleted('course_certificate_templates', ['id' => $template->id]);
    }
}
