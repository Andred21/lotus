<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Models\Certificate;
use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PageOptions;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificatePdfService
{
    /**
     * A marca da amostra: impressa em diagonal no documento e gravada no QR no
     * lugar da URL de validação, para a amostra nunca ser lida como real.
     */
    public const TEXTO_MUESTRA = 'MUESTRA — SIN VALIDEZ';

    public function __construct(
        private readonly HtmlToPdf $pdf,
        private readonly CertificateValidationUrl $validationUrl,
    ) {}

    public function render(Certificate $certificate): string
    {
        // `fromCss`: o tamanho do papel é declarado UMA vez, no `@page` do
        // Blade, onde o `min-height: 297mm` do documento já está calibrado.
        return $this->pdf->render($this->html($certificate, false), PageOptions::fromCss());
    }

    /**
     * Amostra do documento de um curso: o mesmo caminho do `render()`, com a
     * marca d'água e um QR que não aponta para validação nenhuma.
     */
    public function renderMuestra(Certificate $certificate): string
    {
        return $this->pdf->render($this->html($certificate, true), PageOptions::fromCss());
    }

    private function html(Certificate $certificate, bool $muestra): string
    {
        // Um certificado com o nome do aluno em branco não é um certificado
        // incompleto — é um documento que atesta o que ninguém sabe.
        $certificate->snapshot->assertPresentable($certificate->codigo);

        // P-79: a base do QR é conteúdo de documento, com dono próprio — em
        // produção, sem ela em https, o PDF não é montado. A amostra não tem
        // o que validar, então o QR leva a marca.
        $url = $muestra ? self::TEXTO_MUESTRA : $this->validationUrl->para($certificate);
        // O default do gerador é ISO-8859-1, que não codifica o travessão da
        // marca; a fachada é compartilhada, então os dois ramos fixam a
        // codificação e uma amostra não vaza UTF-8 para o QR real seguinte.
        $qr = base64_encode((string) QrCode::format('svg')
            ->encoding($muestra ? 'UTF-8' : 'ISO-8859-1')
            ->size(180)
            ->margin(0)
            ->generate($url));

        return view('certification.certificate', [
            'certificate' => $certificate,
            'qr' => $qr,
            'muestra' => $muestra ? self::TEXTO_MUESTRA : null,
            // Embutida como o QR, e pelo mesmo motivo: o conversor recebe só o
            // HTML, então referência a arquivo ou URL do frontend não resolve.
            'logo' => base64_encode((string) file_get_contents(
                resource_path('images/lotus-logo.png'),
            )),
            // Embutida como o QR e o logo, e pelo mesmo motivo: o conversor
            // recebe só o HTML. JPEG e não PNG — o mesmo fundo, nas mesmas
            // dimensões, pesa 98.258 bytes dentro do certificado aprovado pela
            // Lotus contra 1.245.172 do PNG entregue.
            'fundo' => base64_encode((string) file_get_contents(
                resource_path('images/fundo-certificado.jpg'),
            )),
            // Fontes VARIÁVEIS: um arquivo cobre 400/700/800 do Lexend, então
            // são duas faces e não quatro. Subset latino (~39 KB + ~19 KB).
            'lexend' => base64_encode((string) file_get_contents(
                resource_path('fonts/lexend-latin.woff2'),
            )),
            'montserrat' => base64_encode((string) file_get_contents(
                resource_path('fonts/montserrat-800-latin.woff2'),
            )),
        ])->render();
    }
}
