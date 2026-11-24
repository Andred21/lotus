<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Certification\Data\LookupPublicCertificateData;
use App\Domains\Certification\Data\PublicCertificateData;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\PublicCertificateAccess;
use App\Http\Controllers\Controller;
use App\Shared\Http\RespostaDeRecurso;
use App\Shared\Support\Rut;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PublicCertificateController extends Controller
{
    public function show(string $uuid): PublicCertificateData
    {
        $certificate = Certificate::query()->firstWhere('uuid', $uuid);

        if ($certificate === null) {
            abort(404);
        }

        return PublicCertificateData::fromModel($certificate);
    }

    /**
     * `RespostaDeRecurso::ok`: o laravel-data responde 201 a todo POST, e esta
     * consulta não cria nada.
     */
    public function lookup(LookupPublicCertificateData $data, PublicCertificateAccess $access, Request $request): JsonResponse
    {
        $certificate = $access->porCodigoERut($data->codigo, Rut::parse($data->rut), (string) $request->ip());

        return RespostaDeRecurso::ok(PublicCertificateData::fromLookup($certificate));
    }

    /**
     * Anexo, não `inline`: quem chega pelo QR guarda o arquivo. `no-store` e
     * `noindex` porque o papel tem o RUT do aluno e não se indexa nem se
     * guarda em cache compartilhado.
     */
    public function pdf(string $uuid, PublicCertificateAccess $access, CertificatePdfService $pdf): Response
    {
        $certificate = $access->paraDownload($uuid);

        return response($pdf->render($certificate), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"certificado-{$certificate->codigo}.pdf\"",
            'Cache-Control' => 'no-store',
            'X-Robots-Tag' => 'noindex',
        ]);
    }
}
