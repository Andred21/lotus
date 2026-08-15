<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class CertificationMetricsQuery
{
    public function certificadosAEmitir(): int
    {
        return $this->pendingEnrollmentQuery()->count();
    }

    /** @return PendingItemData[] */
    public function pendencias(): array
    {
        return $this->pendingEnrollmentQuery()
            ->select('turma_id')
            ->distinct()
            ->with('turma:id,concluded_at')
            ->orderBy('turma_id')
            ->get()
            ->map(fn (Enrollment $enrollment): PendingItemData => new PendingItemData(
                module: DashboardModule::Certification,
                type: PendingItemType::EnrollmentAwaitingCertificate,
                severity: DashboardSeverity::Normal,
                entity_id: $enrollment->turma_id,
                description: 'Clase concluida con matrículas aprobadas pendientes de certificado.',
                date: $enrollment->turma->concluded_at?->toDateString(),
                navigation: ['turma_id' => $enrollment->turma_id],
            ))
            ->all();
    }

    /**
     * Só certificado. Documento de idoneidade de relator é dado de Identity e
     * sai pelo `IdentityMetricsQuery`, sob o gate `identity.user.view`.
     *
     * @return AlertData[]
     */
    public function alertas(): array
    {
        $today = CarbonImmutable::today();
        $horizon = DashboardWindows::expiryHorizon();

        return Certificate::query()
            ->where('status', CertificateStatus::Emitido)
            ->whereNotNull('valido_ate')
            ->whereDate('valido_ate', '<=', $horizon)
            ->orderBy('valido_ate')
            ->orderBy('id')
            ->get(['id', 'valido_ate'])
            ->map(function (Certificate $certificate) use ($today): AlertData {
                $expired = $certificate->valido_ate->isBefore($today);

                return new AlertData(
                    type: $expired
                        ? DashboardAlertType::CertificateExpired
                        : DashboardAlertType::CertificateExpiringSoon,
                    severity: $expired
                        ? DashboardSeverity::High
                        : DashboardSeverity::Medium,
                    entity_id: $certificate->id,
                    description: $expired
                        ? 'Certificado vencido.'
                        : 'Certificado próximo a vencer.',
                    date: $certificate->valido_ate->toDateString(),
                    navigation: ['certificate_id' => $certificate->id],
                );
            })
            ->all();
    }

    /** @return Builder<Enrollment> */
    private function pendingEnrollmentQuery(): Builder
    {
        return Enrollment::query()
            ->where('approval_status', EnrollmentApprovalStatus::Aprobado)
            ->whereHas(
                'turma',
                fn (Builder $query): Builder => $query->where('status', TurmaStatus::Concluida),
            )
            ->whereNotIn('id', Certificate::query()->select('enrollment_id'));
    }
}
