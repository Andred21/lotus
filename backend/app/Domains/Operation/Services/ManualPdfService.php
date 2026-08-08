<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;
use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PageOptions;

/**
 * Manual de classe (RF-TUR-04): Blade única padronizada (D6) renderizada com
 * os dados ATUAIS e convertida em PDF pelo conversor compartilhado — nada
 * materializado (D7, mesmo racional do certificado RF-CER-03).
 */
class ManualPdfService
{
    public function __construct(private readonly HtmlToPdf $pdf) {}

    public function render(Turma $turma): string
    {
        // `fromCss`: a Blade do manual declara `@page { size: A4 portrait }`, e
        // sem esta opção o Chromium ignora o CSS e imprime no papel default do
        // conversor (Letter) — o mesmo defeito que o certificado já pagou
        // (`CertificatePdfService`). A4 é o papel que o cliente arquiva.
        return $this->pdf->render($this->html($turma), PageOptions::fromCss());
    }

    private function html(Turma $turma): string
    {
        $turma->load(['course.modules', 'quote.budget.client.user', 'redatores.user', 'enrollments.student.user']);

        return view('operation.manual-turma', ['turma' => $turma])->render();
    }
}
