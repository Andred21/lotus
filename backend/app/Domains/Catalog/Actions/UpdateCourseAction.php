<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza o curso + templates e módulos (nested). Ambos são substituídos
 * (replace) — simples e previsível para ~10 usuários internos. Habilitação
 * fica de fora.
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

            // Replace dos nested. Soft-delete por instância para a auditoria
            // registrar o que saiu (o builder emitiria UPDATE sem eventos).
            $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => $t->delete());
            foreach ($data->templates as $template) {
                $course->certificateTemplates()->create($template->toArray());
            }

            // sort_order é derivado do índice: reordenar = mandar o array na ordem
            // nova. O sort_order que venha no payload é ignorado de propósito.
            $course->modules()->get()->each(fn (CourseModule $m) => $m->delete());
            foreach (array_values($data->modules) as $i => $module) {
                $course->modules()->create([
                    ...$module->except('id', 'sort_order', 'total_hours')->toArray(),
                    'sort_order' => $i + 1,
                ]);
            }

            return $course->fresh()->load(['certificateTemplates', 'redatores', 'modules']);
        });
    }
}
