<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Models\Certificate;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificatePdfService
{
    public function render(Certificate $certificate): string
    {
        $url = rtrim(config('app.frontend_url'), '/')."/validar/{$certificate->uuid}";
        $qr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate($url));
        $html = view('certification.certificate', [
            'certificate' => $certificate,
            'qr' => $qr,
            // Embutida como o QR, e pelo mesmo motivo: o Gotenberg recebe só o
            // HTML, então referência a arquivo ou URL do frontend não resolve.
            'logo' => base64_encode((string) file_get_contents(
                resource_path('images/lotus-logo.png'),
            )),
        ])->render();

        $response = Http::attach('files', $html, 'index.html')
            ->post(rtrim(config('services.gotenberg.url'), '/').'/forms/chromium/convert/html');

        if ($response->failed()) {
            throw new RuntimeException(
                "Gotenberg falhou ao converter o certificado (HTTP {$response->status()}).",
            );
        }

        return $response->body();
    }
}
