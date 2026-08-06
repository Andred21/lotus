<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Actions\IssueCertificateAction;
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Data\IssueCertificateData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CertificateController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.certificate.issue', only: ['store']),
        ];
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
}
