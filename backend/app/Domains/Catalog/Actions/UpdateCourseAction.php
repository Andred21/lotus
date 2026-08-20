<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
use App\Shared\Data\WritableAttributes;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza o curso + templates e módulos (nested). Ambos são substituídos
 * (replace) — simples e previsível para ~10 usuários internos. Habilitação
 * fica de fora.
 *
 * Coleção `Optional` (ausente do payload) NÃO entra no replace: quem não
 * mandou a coleção não pediu para apagá-la. `[]` explícito apaga.
 */
class UpdateCourseAction
{
    public function __construct(private CreateCertificateTemplateAction $templates) {}

    public function execute(Course $course, CourseData $data): Course
    {
        return DB::transaction(function () use ($course, $data) {

            $course->update(WritableAttributes::from([
                'name' => $data->name,
                'technical_name' => $data->technical_name,
                'description' => $data->description,
                'workload_hours' => $data->workload_hours,
            ]));

            // Replace dos nested. Soft-delete por instância para a auditoria
            // registrar o que saiu (o builder emitiria UPDATE sem eventos).
            if (! $data->templates instanceof Optional) {
                $course->certificateTemplates()->get()->each(fn (CourseCertificateTemplate $t) => $t->delete());
                foreach ($data->templates as $template) {
                    $this->templates->execute($course, $template);
                }
            }

            // sort_order é derivado do índice: reordenar = mandar o array na ordem
            // nova. O sort_order que venha no payload é ignorado de propósito.
            if (! $data->modules instanceof Optional) {
                $course->modules()->get()->each(fn (CourseModule $m) => $m->delete());
                foreach (array_values($data->modules) as $i => $module) {
                    $course->modules()->create([
                        ...$module->except('id', 'sort_order', 'total_hours')->toArray(),
                        'sort_order' => $i + 1,
                    ]);
                }
            }

            return $course->fresh()->loadListingData();
        });
    }
}
