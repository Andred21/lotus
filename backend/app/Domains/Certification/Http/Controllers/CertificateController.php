<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Actions\IssueCertificateAction;
use App\Domains\Certification\Actions\RevokeCertificateAction;
use App\Domains\Certification\Data\BatchIssueData;
use App\Domains\Certification\Data\BatchIssueItemResultData;
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Data\EmissionPanelTurmaData;
use App\Domains\Certification\Data\IssueCertificateData;
use App\Domains\Certification\Data\RevokeCertificateData;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\EmissionPanelQuery;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;

class CertificateController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.certificate.view', only: ['index', 'show', 'pdf']),
            new Middleware('permission:certification.certificate.issue', only: ['store', 'emissionPanel', 'batch']),
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

    /** @return array<EmissionPanelTurmaData> */
    public function emissionPanel(EmissionPanelQuery $panel): array
    {
        return $panel->get();
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

    /**
     * Relatório por item, não transação: cada `execute()` já é a sua própria
     * transação (portas + D9 + auditoria). Abrir uma transação por fora faria
     * um item falho reverter os que já tinham sido commitados — e, pior,
     * consumir um número de sequência que nunca vira certificado.
     *
     * @return array<BatchIssueItemResultData>
     */
    public function batch(BatchIssueData $data, IssueCertificateAction $action): array
    {
        $redator = Redator::query()->findOrFail($data->redator_id);

        return collect($data->enrollment_ids)
            ->map(function (int $enrollmentId) use ($action, $redator): BatchIssueItemResultData {
                $enrollment = Enrollment::query()->findOrFail($enrollmentId);

                try {
                    $certificate = $action->execute($enrollment, $redator);

                    return new BatchIssueItemResultData(
                        enrollment_id: $enrollmentId,
                        ok: true,
                        codigo: $certificate->codigo,
                        certificate_id: $certificate->id,
                        error: null,
                    );
                } catch (ValidationException $e) {
                    return new BatchIssueItemResultData(
                        enrollment_id: $enrollmentId,
                        ok: false,
                        codigo: null,
                        certificate_id: null,
                        error: collect($e->errors())->flatten()->first(),
                    );
                }
            })
            ->all();
    }
}
