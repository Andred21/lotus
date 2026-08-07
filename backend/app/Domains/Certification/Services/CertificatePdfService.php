<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Exceptions\CorruptedSnapshotException;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PageOptions;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificatePdfService
{
    public function __construct(private readonly HtmlToPdf $pdf) {}

    public function render(Certificate $certificate): string
    {
        // `fromCss`: o tamanho do papel é declarado UMA vez, no `@page` do
        // Blade, onde o `min-height: 297mm` do documento já está calibrado.
        return $this->pdf->render($this->html($certificate), PageOptions::fromCss());
    }

    private function html(Certificate $certificate): string
    {
        $missing = $certificate->snapshot->missingRequiredFields();

        // Um certificado com o nome do aluno em branco não é um certificado
        // incompleto — é um documento que atesta o que ninguém sabe.
        if ($missing !== []) {
            throw CorruptedSnapshotException::missingFields($certificate->codigo, $missing);
        }

        $url = rtrim(config('app.frontend_url'), '/')."/validar/{$certificate->uuid}";
        $qr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate($url));

        return view('certification.certificate', [
            'certificate' => $certificate,
            'qr' => $qr,
            // Embutida como o QR, e pelo mesmo motivo: o conversor recebe só o
            // HTML, então referência a arquivo ou URL do frontend não resolve.
            'logo' => base64_encode((string) file_get_contents(
                resource_path('images/lotus-logo.png'),
            )),
        ])->render();
    }
}
