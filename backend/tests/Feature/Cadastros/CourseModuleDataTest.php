<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseModuleDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_totais_sao_derivados_do_model_sem_coluna(): void
    {
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 40]);
        $course->modules()->create(['sort_order' => 1, 'name' => 'M1', 'theory_hours' => 6, 'practice_hours' => 2]);
        $course->modules()->create(['sort_order' => 2, 'name' => 'M2', 'theory_hours' => 4, 'practice_hours' => 0]);

        $data = CourseData::fromModel($course->load(['certificateTemplates', 'redatores', 'modules']));

        $this->assertSame(8, $data->modules[0]->total_hours);
        $this->assertSame(4, $data->modules[1]->total_hours);
        $this->assertSame(12, $data->modules_total_hours);
        // Total do curso é contratado, independente da soma — não se ajusta.
        $this->assertSame(40, $data->workload_hours);
    }

    public function test_curso_sem_modulos_soma_zero(): void
    {
        $course = Course::create(['name' => 'Curso Y', 'workload_hours' => 8]);

        $data = CourseData::fromModel($course->load(['certificateTemplates', 'redatores', 'modules']));

        $this->assertSame([], $data->modules);
        $this->assertSame(0, $data->modules_total_hours);
    }
}
