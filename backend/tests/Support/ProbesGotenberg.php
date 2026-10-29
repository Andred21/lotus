<?php

namespace Tests\Support;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Sonda do Gotenberg real, no molde do `ProbesMysqlConcurrency`. A suíte usa
 * `FakeHtmlToPdf` em toda parte e o CI não tem o serviço: o que só o Chromium
 * real prova (a paginação do certificado, spec D11) é pulado fora do
 * container, com o motivo, em vez de maquiado.
 */
trait ProbesGotenberg
{
    protected function skipUnlessGotenberg(): void
    {
        $url = rtrim((string) config('services.gotenberg.url'), '/');

        try {
            $vivo = Http::timeout(2)->connectTimeout(2)->get("{$url}/health")->successful();
        } catch (Throwable) {
            $vivo = false;
        }

        if (! $vivo) {
            $this->markTestSkipped("Gotenberg fora do ar em {$url}/health; a matriz do certificado exige o serviço real (rode no container).");
        }
    }
}
