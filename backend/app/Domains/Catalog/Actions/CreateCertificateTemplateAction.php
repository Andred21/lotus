<?php

namespace App\Domains\Catalog\Actions;

use App\Domains\Catalog\Data\CertificateTemplateData;
use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Escritor ÚNICO do `version` do template de certificado (spec D4/D10/D11).
 *
 * O número era input do cliente nos três caminhos de escrita, sem índice que
 * garantisse unicidade — e é ele que decide qual template o resolver escolhe,
 * logo a vigência (`valido_ate`) e a cidade de emissão do certificado. Peso
 * legal não se decide pela ordem que o banco devolve.
 *
 * A derivação é a forma literal do `seq_in_budget` (ADR-17, `CreateQuoteAction`):
 * `MAX+1` sob `lockForUpdate` DENTRO da transação, com o `UNIQUE(course_id,
 * version)` como defesa extra. `withTrashed()` não é detalhe: o
 * `UpdateCourseAction` soft-deleta todos os templates e recria, então sem os
 * arquivados na conta o MAX voltaria a 1 e o índice recusaria a segunda salvada.
 *
 * `version` e `course_id` são gravados por atribuição EXPLÍCITA. O `version`
 * está fora do `$fillable` do model de propósito: o bypass morre no model, não
 * na convenção — mesmo precedente do `created_at` de `LoginLog`.
 */
class CreateCertificateTemplateAction
{
    public function execute(Course $course, CertificateTemplateData $data): CourseCertificateTemplate
    {
        return DB::transaction(function () use ($course, $data) {
            $template = new CourseCertificateTemplate;
            $template->course_id = $course->id;
            $template->version = $this->nextVersionFor($course);
            $template->layout_config = $data->layout_config;
            $template->validity_months = $data->validity_months instanceof Optional
                ? null
                : $data->validity_months;
            $template->save();

            return $template;
        });
    }

    /** Conta os ARQUIVADOS: número de versão não se reaproveita (D5/D11). */
    private function nextVersionFor(Course $course): int
    {
        return (int) CourseCertificateTemplate::withTrashed()
            ->where('course_id', $course->id)
            ->lockForUpdate()
            ->max('version') + 1;
    }
}
