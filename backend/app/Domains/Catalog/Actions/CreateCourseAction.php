<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o curso + templates de certificado e módulos (nested) numa transação.
 * Habilitação redator↔curso NÃO é tratada aqui — é por endpoint dedicado.
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

            // Coleção ausente (Optional) = curso nasce sem ela. Mesma leitura do
            // UpdateCourseAction — `CreateX` sincroniza o que `UpdateX` sincroniza.
            if (! $data->templates instanceof Optional) {
                foreach ($data->templates as $template) {
                    $course->certificateTemplates()->create($template->toArray());
                }
            }

            // sort_order é derivado do índice: reordenar = mandar o array na ordem
            // nova. O sort_order que venha no payload é ignorado de propósito.
            if (! $data->modules instanceof Optional) {
                foreach (array_values($data->modules) as $i => $module) {
                    $course->modules()->create([
                        ...$module->except('id', 'sort_order', 'total_hours')->toArray(),
                        'sort_order' => $i + 1,
                    ]);
                }
            }

            return $course->load(['certificateTemplates', 'redatores', 'modules']);
        });
    }
}
