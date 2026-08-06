<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Actions\IssueCertificateAction;
use App\Domains\Certification\Actions\RevokeCertificateAction;
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Data\IssuableTurmaData;
use App\Domains\Certification\Data\IssueCertificateData;
use App\Domains\Certification\Data\RevokeCertificateData;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\CertificateTemplateResolver;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CertificateController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.certificate.view', only: ['index', 'show', 'pdf']),
            new Middleware('permission:certification.certificate.issue', only: ['store', 'issuable']),
            new Middleware('permission:certification.certificate.revoke', only: ['revoke']),
        ];
    }

    /** @return array<CertificateData> */
    public function index(): array
    {
        return Certificate::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Certificate $certificate) => CertificateData::fromModel($certificate))
            ->all();
    }

    public function show(Certificate $certificate): CertificateData
    {
        return CertificateData::fromModel($certificate);
    }

    public function pdf(Certificate $certificate, CertificatePdfService $pdf): Response
    {
        return response($pdf->render($certificate), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"certificado-{$certificate->codigo}.pdf\"",
        ]);
    }

    /** @return array<IssuableTurmaData> */
    public function issuable(CertificateTemplateResolver $templates): array
    {
        $activeEnrollmentIds = Certificate::query()
            ->where('status', CertificateStatus::Emitido)
            ->pluck('enrollment_id');
        $latestTemplates = $templates->latestByCourse();

        $eligibleEnrollments = fn ($query) => $query
            ->where('approval_status', EnrollmentApprovalStatus::Aprobado)
            ->whereNotIn('id', $activeEnrollmentIds);

        return Turma::query()
            ->where('status', TurmaStatus::Concluida)
            ->whereIn('course_id', $latestTemplates->keys())
            // Sem redator designado não existe assinatura possível (D11), e a
            // emissão recusaria qualquer `redator_id` que a UI mandasse.
            ->whereHas('redatores')
            ->whereHas('enrollments', $eligibleEnrollments)
            ->with([
                'course',
                'quote.budget.client',
                'redatores.user',
                'enrollments' => fn ($query) => $eligibleEnrollments($query)
                    ->with('student.user'),
            ])
            ->get()
            ->filter(fn (Turma $turma) => $templates->emissionCityFor(
                $turma,
                $latestTemplates[$turma->course_id],
            ) !== null)
            ->map(fn (Turma $turma) => IssuableTurmaData::fromModel($turma))
            ->values()
            ->all();
    }

    public function store(
        IssueCertificateData $data,
        Enrollment $enrollment,
        IssueCertificateAction $action,
    ): JsonResponse {
        $redator = Redator::query()->findOrFail($data->redator_id);
        $certificate = $action->execute($enrollment, $redator);

        return CertificateData::fromModel($certificate)
            ->toResponse(request())
            ->setStatusCode(201);
    }

    public function revoke(
        RevokeCertificateData $data,
        Certificate $certificate,
        RevokeCertificateAction $action,
    ): JsonResponse {
        return CertificateData::fromModel($action->execute($certificate, $data->reason))
            ->toResponse(request())
            ->setStatusCode(200);
    }
}
