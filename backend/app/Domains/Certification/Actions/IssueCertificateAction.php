<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateEligibility;
use App\Domains\Certification\Services\CertificateNumberService;
use App\Domains\Certification\Services\CertificateSnapshotBuilder;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IssueCertificateAction
{
    public function __construct(
        private readonly CertificateNumberService $numbers,
        private readonly CertificateSnapshotBuilder $snapshots,
        private readonly CertificateEligibility $eligibility,
    ) {}

    public function execute(Enrollment $enrollment, Redator $redator): Certificate
    {
        return DB::transaction(function () use ($enrollment, $redator) {
            // Um instante para a emissão inteira. A sequência espera pelo lock,
            // e três `now()` separados deixam uma emissão da virada do ano
            // gravar data de 2027 num código LOT-2026.
            $now = now();

            // As seis portas — as mesmas que o `issuable` usa para montar a
            // lista, e por isso a lista não promete o que aqui recusa.
            $context = $this->eligibility->assert($enrollment, $redator);

            $validoAte = $context->template->validity_months === null
                ? null
                : $now->copy()->addMonths((int) $context->template->validity_months)->toDateString();

            return Certificate::create([
                'uuid' => (string) Str::uuid(),
                'enrollment_id' => $enrollment->id,
                'course_id' => $context->turma->course_id,
                'redator_id' => $redator->id,
                'codigo' => $this->numbers->next((int) $now->year),
                'snapshot' => $this->snapshots->build(
                    $enrollment,
                    $redator,
                    $context->template,
                    $now,
                    $context->ciudadEmision,
                ),
                'valido_ate' => $validoAte,
                'status' => CertificateStatus::Emitido,
                'revoked_at' => null,
                'revocation_reason' => null,
            ]);
        });
    }
}
