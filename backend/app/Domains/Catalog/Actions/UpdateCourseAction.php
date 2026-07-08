<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza o curso + templates (nested). Templates são substituídos (replace) —
 * simples e previsível para ~10 usuários internos. Habilitação fica de fora.
 */
class UpdateCourseAction
{
    public function execute(Course $course, CourseData $data): Course
    {
        return DB::transaction(function () use ($course, $data) {
            $course->update([
                'name' => $data->name,
                'technical_name' => $data->technical_name instanceof Optional ? null : $data->technical_name,
                'description' => $data->description instanceof Optional ? null : $data->description,
                'workload_hours' => $data->workload_hours,
            ]);

            $course->certificateTemplates()->delete();
            foreach ($data->templates as $template) {
                $course->certificateTemplates()->create($template->toArray());
            }

            return $course->fresh()->load(['certificateTemplates', 'redatores']);
        });
    }
}
