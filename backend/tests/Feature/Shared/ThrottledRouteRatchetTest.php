<?php

namespace Tests\Feature\Shared;

use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

/**
 * Catraca 1 do bloco de hardening (spec §5). O teto global do grupo `api`
 * cobre toda rota por construção; esta catraca é o que impede que ele seja
 * removido, ou que uma rota nasça fora do grupo, sem alguém escrever por quê.
 *
 * Lê o roteador MONTADO, não o texto dos arquivos: `throttle` escrito à mão
 * numa rota nova conta igual, venha de onde vier.
 *
 * Molde e razão: `AuthenticatedRouteMiddlewareTest`. Silêncio reprova.
 */
class ThrottledRouteRatchetTest extends TestCase
{
    /**
     * Rotas `api/*` que podem rodar SEM limite de taxa. Hoje: nenhuma.
     *
     * Entrada nova aqui é decisão consciente e precisa do motivo ao lado —
     * exatamente como a lista de anônimas do `AuthenticatedRouteMiddlewareTest`.
     *
     * @var array<string,string>
     */
    private const ISENTAS = [];

    /** @return array<string,list<string>> uri => middleware resolvido, só rotas `api/*` */
    private function rotasDaApi(): array
    {
        $mapa = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (str_starts_with($rota->uri(), 'api/')) {
                $mapa[$rota->uri()] = array_values(array_map(
                    strval(...),
                    app('router')->gatherRouteMiddleware($rota),
                ));
            }
        }

        return $mapa;
    }

    private function temThrottle(array $middleware): bool
    {
        foreach ($middleware as $m) {
            if (str_starts_with($m, ThrottleRequests::class)) {
                return true;
            }
        }

        return false;
    }

    public function test_toda_rota_da_api_esta_sob_limite_de_taxa(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->temThrottle($middleware) && ! array_key_exists($uri, self::ISENTAS)) {
                $descobertas[] = $uri;
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Rota `api/*` sem limite de taxa (RNF-SEC-06).',
                'O teto do grupo `api` deveria cobri-la — se não cobre, ou ela nasceu',
                'fora do grupo, ou o teto saiu do bootstrap/app.php. Rotas:',
            ],
            $descobertas,
        )));
    }

    public function test_a_lista_de_isentas_esta_declarada_com_motivo(): void
    {
        $reais = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->temThrottle($middleware)) {
                $reais[] = $uri;
            }
        }

        $reais = array_values(array_unique($reais));
        sort($reais);

        $declaradas = array_keys(self::ISENTAS);
        sort($declaradas);

        $this->assertSame($declaradas, $reais, implode("\n", [
            'A superfície sem limite de taxa mudou sem passar por esta lista.',
            'Rota que passa a rodar sem throttle entra em ISENTAS com o motivo ao lado;',
            'rota que voltou a ser limitada sai de lá. Silêncio reprova de propósito.',
        ]));

        foreach (self::ISENTAS as $uri => $motivo) {
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Rota isenta {$uri} com motivo curto demais para ser um motivo.",
            );
        }
    }
}
