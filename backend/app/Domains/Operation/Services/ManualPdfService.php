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
        // `converterDefault` preserva o comportamento atual: a Blade do manual
        // não declara `@page`, então não há tamanho próprio a honrar. Quando o
        // manual virar documento oficial (bloco do frontend), ela declara o
        // papel e esta linha vira `fromCss()` — o resto do transporte já está
        // pronto.
        return $this->pdf->render($this->html($turma), PageOptions::converterDefault());
    }

    private function html(Turma $turma): string
    {
        $turma->load(['course.modules', 'quote.budget.client', 'redatores.user', 'enrollments.student.user']);

        return view('operation.manual-turma', ['turma' => $turma])->render();
    }
}
