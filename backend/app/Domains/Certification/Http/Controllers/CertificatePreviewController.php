<?php

namespace App\Domains\Certification\Http\Controllers;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Domains\Certification\Services\CertificatePreviewBuilder;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CertificatePreviewController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:certification.certificate.view'),
        ];
    }

    /**
     * Amostra do certificado do curso, com a marca "MUESTRA — SIN VALIDEZ".
     * Renderiza no conversor a cada requisição, como o PDF real, e por isso
     * divide com ele o limitador `certificate-pdf`.
     */
    public function show(Course $course, CertificatePreviewBuilder $builder, CertificatePdfService $pdf): Response
    {
        return response($pdf->renderMuestra($builder->build($course)), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"certificado-muestra-{$course->id}.pdf\"",
        ]);
    }
}
