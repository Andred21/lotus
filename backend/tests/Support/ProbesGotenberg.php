<?php

namespace Tests\Support;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Sonda do Gotenberg real, no molde do `ProbesMysqlConcurrency`. A suíte usa
 * `FakeHtmlToPdf` em toda parte e o CI não tem o serviço: o que só o Chromium
 * real prova (a paginação do certificado, spec D11) é pulado quando o host do
 * Gotenberg nem resolve (fora do container, CI), com o motivo, em vez de
 * maquiado.
 *
 * Se o host resolve (estamos no container com o serviço configurado) e a sonda
 * falha mesmo assim, o teste FALHA: máquina carregada não pode virar um
 * "pulado" que parece verde. O resultado é memoizado por processo, e a sonda
 * tenta até 3 vezes com timeout de 5 s.
 */
trait ProbesGotenberg
{
    /** @var array{vivo: bool, resolve: bool, url: string}|null */
    private static ?array $sondaGotenberg = null;

    protected function skipUnlessGotenberg(): void
    {
        self::$sondaGotenberg ??= $this->sondarGotenberg();
        ['vivo' => $vivo, 'resolve' => $resolve, 'url' => $url] = self::$sondaGotenberg;

        if ($vivo) {
            return;
        }

        if ($resolve) {
            $this->fail("Gotenberg configurado em {$url} (o host resolve), mas {$url}/health não respondeu em 3 tentativas de 5 s; a matriz do certificado não pode ser pulada aqui. Suba o serviço ou reduza a carga da máquina.");
        }

        $this->markTestSkipped("Gotenberg fora do ar em {$url}/health (o host não resolve); a matriz do certificado exige o serviço real (rode no container).");
    }

    /** @return array{vivo: bool, resolve: bool, url: string} */
    private function sondarGotenberg(): array
    {
        $url = rtrim((string) config('services.gotenberg.url'), '/');
        $host = (string) parse_url($url, PHP_URL_HOST);
        $resolve = $host !== '' && gethostbyname($host) !== $host;

        if (! $resolve) {
            return ['vivo' => false, 'resolve' => false, 'url' => $url];
        }

        for ($tentativa = 1; $tentativa <= 3; $tentativa++) {
            try {
                if (Http::timeout(5)->connectTimeout(5)->get("{$url}/health")->successful()) {
                    return ['vivo' => true, 'resolve' => true, 'url' => $url];
                }
            } catch (Throwable) {
                // tenta de novo
            }
        }

        return ['vivo' => false, 'resolve' => true, 'url' => $url];
    }
}
