<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateNumberService;
use App\Domains\Certification\Services\CertificateSnapshotBuilder;
use App\Domains\Certification\Services\CertificateTemplateResolver;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class IssueCertificateAction
{
    public function __construct(
        private readonly CertificateNumberService $numbers,
        private readonly CertificateSnapshotBuilder $snapshots,
        private readonly CertificateTemplateResolver $templates,
    ) {}

    public function execute(Enrollment $enrollment, Redator $redator): Certificate
    {
        return DB::transaction(function () use ($enrollment, $redator) {
            // Um instante para a emissão inteira. A sequência espera pelo lock,
            // e três `now()` separados deixam uma emissão da virada do ano
            // gravar data de 2027 num código LOT-2026.
            $now = now();
            $turma = $enrollment->turma;

            if ($turma->status !== TurmaStatus::Concluida) {
                throw ValidationException::withMessages([
                    'turma' => 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
                ]);
            }

            if ($enrollment->approval_status !== EnrollmentApprovalStatus::Aprobado) {
                throw ValidationException::withMessages([
                    'enrollment' => 'El alumno no fue aprobado: no se puede emitir el certificado.',
                ]);
            }

            $vigente = Certificate::where('enrollment_id', $enrollment->id)
                ->where('status', CertificateStatus::Emitido)
                ->lockForUpdate()
                ->exists();

            if ($vigente) {
                throw ValidationException::withMessages([
                    'enrollment' => 'Ya existe un certificado vigente para esta matrícula.',
                ]);
            }

            $template = $this->templates->latestForCourse($turma->course_id);

            if ($template === null) {
                throw ValidationException::withMessages([
                    'template' => 'El curso no tiene una plantilla de certificado aprobada.',
                ]);
            }

            $ciudadEmision = $this->templates->emissionCityFor($turma, $template);

            if ($ciudadEmision === null) {
                throw ValidationException::withMessages([
                    'template' => 'La plantilla del curso no define una ciudad de emisión válida.',
                ]);
            }

            if (! $turma->redatores()->whereKey($redator->id)->exists()) {
                throw ValidationException::withMessages([
                    'redator_id' => 'El redactor no está designado en esta clase.',
                ]);
            }

            $validoAte = $template->validity_months === null
                ? null
                : $now->copy()->addMonths((int) $template->validity_months)->toDateString();

            return Certificate::create([
                'uuid' => (string) Str::uuid(),
                'enrollment_id' => $enrollment->id,
                'course_id' => $turma->course_id,
                'redator_id' => $redator->id,
                'codigo' => $this->numbers->next((int) $now->year),
                'snapshot' => $this->snapshots->build(
                    $enrollment,
                    $redator,
                    $template,
                    $now,
                    $ciudadEmision,
                ),
                'valido_ate' => $validoAte,
                'status' => CertificateStatus::Emitido,
                'revoked_at' => null,
                'revocation_reason' => null,
            ]);
        });
    }
}
