<?php

namespace App\Domains\Certification\Data;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\EmissionBlockReason;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A turma no painel de emissão. Toda turma concluída aparece — a bloqueada
 * também, com o motivo em `emission_blocked` (D-P1/D-P3): esconder a turma sem
 * template deixava o admin sem nada para clicar E sem nada para ler.
 *
 * `emission_blocked` é calculado no SERVIDOR, pelo mesmo
 * `CertificateTemplateResolver` que as portas do `CertificateEligibility`
 * consultam. Re-derivar a cidade de emissão ou o redator no cliente é a mesma
 * classe de bug que as portas fecharam: a lista prometendo o que o POST recusa.
 */
#[TypeScript]
class EmissionPanelTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        public string $client_name,
        public string $end_date,
        public ?int $template_validity_months,
        /** `null` quando a turma é emitível; o motivo da porta fechada quando não. */
        public ?EmissionBlockReason $emission_blocked,
        /** @var array<EmissionPanelEnrollmentData> */
        public array $enrollments,
        /** @var array<EmissionPanelRedatorData> */
        public array $redatores,
    ) {}

    /** @param  Collection<int, Certificate>  $vigentesPorEnrollment  keyBy `enrollment_id` */
    public static function fromModel(
        Turma $turma,
        ?CourseCertificateTemplate $template,
        ?EmissionBlockReason $emissionBlocked,
        Collection $vigentesPorEnrollment,
    ): self {
        return new self(
            turma_id: $turma->id,
            course_name: $turma->course->name,
            // Razão social (`clients.legal_name`), não o nome do User: é o
            // `{{EMPRESA}}` do documento oficial — o seam `Turma::contratante()`.
            client_name: $turma->contratante()->name,
            end_date: $turma->end_date->toDateString(),
            template_validity_months: $template?->validity_months,
            emission_blocked: $emissionBlocked,
            enrollments: $turma->enrollments
                ->map(fn (Enrollment $enrollment) => EmissionPanelEnrollmentData::fromModel(
                    $enrollment,
                    $vigentesPorEnrollment->get($enrollment->id),
                ))
                ->all(),
            redatores: $turma->redatores
                ->map(fn (Redator $redator) => EmissionPanelRedatorData::fromModel($redator))
                ->all(),
        );
    }
}
