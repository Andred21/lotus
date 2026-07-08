<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o curso + templates de certificado (nested) numa transação. Habilitação
 * redator↔curso NÃO é tratada aqui — é por endpoint dedicado.
 */
class CreateCourseAction
{
    public function execute(CourseData $data): Course
    {
        return DB::transaction(function () use ($data) {
            $course = Course::create([
                'name' => $data->name,
                'technical_name' => $data->technical_name instanceof Optional ? null : $data->technical_name,
                'description' => $data->description instanceof Optional ? null : $data->description,
                'workload_hours' => $data->workload_hours,
            ]);

            foreach ($data->templates as $template) {
                $course->certificateTemplates()->create($template->toArray());
            }

            return $course->load(['certificateTemplates', 'redatores']);
        });
    }
}
