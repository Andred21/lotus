<?php

namespace Tests\Feature\Shared;

use App\Shared\Http\Middleware\EnsureAccountIsActive;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

/**
 * Q-1 do review de 2026-08-23. O `EnsureAccountIsActive` nasceu apendado ao
 * grupo `api` inteiro, buscando a propriedade "rota autenticada nova nasce
 * coberta". O preço era invisível: as rotas propositalmente anônimas rodam no
 * MESMO grupo `api`, `$request->user()` resolve nelas pelo guard `web` sem
 * `auth:sanctum` nenhum, e um cookie de conta recém desativada devolvia 401 na
 * validação pública do QR (peso legal) e na tela de login — a porta por onde a
 * pessoa sairia do buraco.
 *
 * A cobertura passou a vir do grupo `auth.active` (`auth:sanctum` +
 * `EnsureAccountIsActive`), e a propriedade que se ganhava de graça agora é
 * verificada aqui: quem autentica leva a checagem, quem não autentica não leva,
 * e a lista das anônimas é DECLARADA — rota nova só é pública por escrita
 * explícita.
 *
 * Este teste lê o roteador montado, não o texto dos arquivos: `auth:sanctum`
 * escrito à mão numa rota nova cai no primeiro caso, venha de onde vier.
 */
class AuthenticatedRouteMiddlewareTest extends TestCase
{
    /**
     * As rotas `api/*` que atendem quem NÃO tem sessão. Silêncio reprova:
     * rota nova fora do `auth.active` entra aqui por escrita explícita, com o
     * motivo ao lado, ou o teste barra.
     */
    private const ANONIMAS = [
        'api/login' => 'Porta de entrada: quem chega aqui ainda não tem sessão.',
        'api/password/forgot' => 'Recuperação de senha: por definição serve quem não consegue autenticar.',
        'api/password/reset' => 'Consome o token do e-mail de recuperação; a sessão nasce depois.',
        'api/invitation/accept' => 'Convite de redator: define a primeira senha, antes de existir login.',
        'api/publico/certificados/{uuid}' => 'Validação pública do QR (RF de certificação): é anônima de propósito.',
    ];

    /** @return array<string,list<string>> uri => middleware resolvido, só rotas `api/*` */
    private function rotasDaApi(): array
    {
        $mapa = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (! str_starts_with($rota->uri(), 'api/')) {
                continue;
            }

            $mapa[$rota->uri()] = array_values(array_map(
                strval(...),
                app('router')->gatherRouteMiddleware($rota),
            ));
        }

        return $mapa;
    }

    private function autentica(array $middleware): bool
    {
        foreach ($middleware as $m) {
            // `auth:sanctum` chega aqui resolvido como `Authenticate:sanctum`.
            if (str_starts_with($m, Authenticate::class)) {
                return true;
            }
        }

        return false;
    }

    public function test_toda_rota_autenticada_leva_a_checagem_de_conta_ativa(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if ($this->autentica($middleware) && ! in_array(EnsureAccountIsActive::class, $middleware, true)) {
                $descobertas[] = $uri;
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Rota autenticada sem `EnsureAccountIsActive` — a ponta B da spec D5 não a alcança.',
                'Use o grupo `auth.active` (bootstrap/app.php) no lugar de `auth:sanctum` cru. Rotas:',
            ],
            $descobertas,
        )));
    }

    public function test_rota_anonima_nao_leva_a_checagem_de_conta_ativa(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->autentica($middleware) && in_array(EnsureAccountIsActive::class, $middleware, true)) {
                $descobertas[] = $uri;
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Rota anônima gateada pelo `EnsureAccountIsActive` (Q-1 de 2026-08-23).',
                'Cookie de conta desativada devolve 401 onde deveria haver atendimento anônimo. Rotas:',
            ],
            $descobertas,
        )));
    }

    public function test_a_lista_de_rotas_anonimas_esta_declarada(): void
    {
        $reais = [];

        foreach ($this->rotasDaApi() as $uri => $middleware) {
            if (! $this->autentica($middleware)) {
                $reais[] = $uri;
            }
        }

        $reais = array_values(array_unique($reais));
        sort($reais);

        $declaradas = array_keys(self::ANONIMAS);
        sort($declaradas);

        $this->assertSame($declaradas, $reais, implode("\n", [
            'A superfície anônima da API mudou sem passar por esta lista.',
            'Rota nova sem `auth.active` entra em ANONIMAS com o motivo ao lado;',
            'rota que passou a autenticar sai de lá. Silêncio reprova de propósito.',
        ]));

        foreach (self::ANONIMAS as $uri => $motivo) {
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Rota anônima {$uri} com motivo curto demais para ser um motivo.",
            );
        }
    }
}
