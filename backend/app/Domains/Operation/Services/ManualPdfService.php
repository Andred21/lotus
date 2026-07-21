<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Manual de classe (RF-TUR-04): Blade única padronizada (D6) renderizada com
 * os dados ATUAIS e convertida em PDF pelo Gotenberg — nada materializado
 * (D7, mesmo racional do certificado RF-CER-03).
 */
class ManualPdfService
{
    public function render(Turma $turma): string
    {
        $turma->load(['course.modules', 'quote.budget.client', 'redatores.user', 'enrollments.student.user']);

        $html = view('operation.manual-turma', ['turma' => $turma])->render();

        $response = Http::attach('files', $html, 'index.html')
            ->post(rtrim(config('services.gotenberg.url'), '/').'/forms/chromium/convert/html');

        if ($response->failed()) {
            throw new RuntimeException("Gotenberg falhou ao converter o manual (HTTP {$response->status()}).");
        }

        return $response->body();
    }
}
