<?php

namespace Tests\Feature\Shared;

use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Tests\TestCase;

/**
 * Bloco 55, spec D1/D3. A permissão de uma rota mora num lugar só: o
 * `HasMiddleware` do controller, colada na ação. Antes, 11 controllers tinham a
 * permissão num `Route::middleware('permission:…')->group` do `routes.php`, e
 * os outros 15 no próprio controller — quem lia um lado não via o outro, e rota
 * autenticada nova sem permissão nenhuma passava calada.
 *
 * Duas propriedades, lidas do roteador montado (não do texto dos arquivos):
 *  - toda rota autenticada declara permissão, ou está em SEM_PERMISSAO com o
 *    motivo ao lado (silêncio reprova);
 *  - nenhuma permissão é declarada na rota ou no grupo de `routes.php`.
 *
 * A avaliação é por rota, com método + URI: `PUT api/x/{id}` e `GET api/x/{id}`
 * são a mesma URI com permissões diferentes, e um mapa só por URI esconderia
 * a diferença.
 */
class PermissionRouteMiddlewareTest extends TestCase
{
    /**
     * As rotas autenticadas que NÃO exigem permissão. A chave é
     * "{METODOS} {uri}", como o roteador lista a rota: método novo na mesma URI reprova. Rota nova sem permissão e fora desta lista
     * reprova: decidir se ela ganha permissão ou entra aqui é do João, não do
     * builder (spec D3).
     */
    private const SEM_PERMISSAO = [
        'POST api/logout' => 'Encerra a própria sessão: quem está logado sempre pode sair, não há o que autorizar.',
        'GET|HEAD api/me' => 'Devolve só a sessão de quem pergunta, sem dado de terceiros: não há recurso a proteger.',
        'GET|HEAD api/versao' => 'Versão da plataforma, informação não sensível exibida a qualquer usuário com sessão.',
        'GET|HEAD api/profile' => 'Perfil próprio (spec D4 do perfil): recurso do próprio usuário, fora do RBAC de gestão.',
        'PUT api/profile' => 'Perfil próprio (spec D4 do perfil): recurso do próprio usuário, fora do RBAC de gestão.',
        'POST api/profile/photo' => 'Foto do perfil próprio (spec D4 do perfil): recurso do próprio usuário, sem permissão.',
        'DELETE api/profile/photo' => 'Foto do perfil próprio (spec D4 do perfil): recurso do próprio usuário, sem permissão.',
        'PUT api/profile/password' => 'Senha do perfil próprio (spec D4 do perfil): recurso do próprio usuário, sem permissão.',
        'POST api/profile/documents' => 'Documentos do perfil próprio (spec D4 do perfil): recurso do próprio usuário, sem permissão.',
        'GET|HEAD api/dashboard/metricas' => 'O gate é por seção dentro do DashboardVisibilityData, não por permissão única da rota.',
        'GET|HEAD api/user' => 'Closure de scaffold do Laravel que devolve o próprio usuário; o front não usa. Decisão do João, 2026-11-03.',
    ];

    /**
     * "{METODOS} {uri}" => dados da rota, só `api/*`, uma entrada por rota.
     *
     * @return array<string,array{route:Route,permissoes:list<string>,autentica:bool}>
     */
    private function rotasDaApi(): array
    {
        $mapa = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            if (! str_starts_with($rota->uri(), 'api/')) {
                continue;
            }

            $middleware = array_values(array_map(
                strval(...),
                app('router')->gatherRouteMiddleware($rota),
            ));

            $permissoes = array_values(array_filter(
                $middleware,
                fn (string $m) => str_starts_with($m, PermissionMiddleware::class.':'),
            ));

            $autentica = false;
            foreach ($middleware as $m) {
                // `auth:sanctum` chega aqui resolvido como `Authenticate:sanctum`.
                if (str_starts_with($m, Authenticate::class)) {
                    $autentica = true;
                }
            }

            $mapa[implode('|', $rota->methods()).' '.$rota->uri()] = [
                'route' => $rota,
                'permissoes' => $permissoes,
                'autentica' => $autentica,
            ];
        }

        return $mapa;
    }

    public function test_toda_rota_autenticada_declara_permissao(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $chave => $rota) {
            if ($rota['autentica'] && $rota['permissoes'] === [] && ! array_key_exists($chave, self::SEM_PERMISSAO)) {
                $descobertas[] = $chave;
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Rota autenticada sem `permission:` e fora de SEM_PERMISSAO (spec D3).',
                'Declare a permissão em `HasMiddleware` do controller. Não acrescente à lista sem o João. Rotas:',
            ],
            $descobertas,
        )));
    }

    public function test_a_lista_sem_permissao_e_fiel(): void
    {
        $reais = [];

        foreach ($this->rotasDaApi() as $chave => $rota) {
            if ($rota['autentica'] && $rota['permissoes'] === []) {
                $reais[] = $chave;
            }
        }

        sort($reais);

        $declaradas = array_keys(self::SEM_PERMISSAO);
        sort($declaradas);

        $this->assertSame($declaradas, $reais, implode("\n", [
            'A lista de rotas autenticadas sem permissão mudou sem passar por SEM_PERMISSAO.',
            'Rota que ganhou permissão sai da lista; rota nova entra só com decisão do João.',
        ]));

        foreach (self::SEM_PERMISSAO as $chave => $motivo) {
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Rota sem permissão {$chave} com motivo curto demais para ser um motivo.",
            );
        }
    }

    public function test_permissao_vem_so_do_controller(): void
    {
        $descobertas = [];

        foreach ($this->rotasDaApi() as $chave => $rota) {
            foreach ($this->permissoesDeclaradasNaRota($rota['route']) as $m) {
                $descobertas[] = "{$chave} ({$m})";
            }
        }

        sort($descobertas);

        $this->assertSame([], $descobertas, implode("\n", array_merge(
            [
                'Permissão declarada na rota ou num grupo de `routes.php`: declare em',
                '`HasMiddleware` do controller (spec D1). Rotas:',
            ],
            $descobertas,
        )));
    }

    /**
     * Permissões que a rota e os grupos de `routes.php` declaram, já resolvidas
     * pelo roteador. `middleware()` = o que a rota e os grupos declaram; o do
     * controller vem por `controllerMiddleware()` e não passa por aqui (spec D4).
     * Resolver expande grupo nomeado e qualquer alias até a classe: alias
     * (`permission:x`), classe cheia, `PermissionMiddleware::using()`, grupo com
     * permissão dentro e alias novo do mesmo middleware viram a mesma string.
     *
     * @return list<string>
     */
    private function permissoesDeclaradasNaRota(Route $rota): array
    {
        return array_values(array_filter(
            app('router')->resolveMiddleware($rota->middleware()),
            fn ($m) => is_string($m) && str_starts_with($m, PermissionMiddleware::class.':'),
        ));
    }

    public function test_catraca_ve_permissao_dentro_de_grupo_nomeado_e_de_alias_novo(): void
    {
        // Sonda da revisão do bloco 55 (Q-2): ler o nome cru deixava passar os dois.
        app('router')->middlewareGroup('grupo-sonda-55', ['permission:sonda.grupo']);
        app('router')->aliasMiddleware('alias-sonda-55', PermissionMiddleware::class);

        $porGrupo = (new Route(['GET'], 'api/sonda-grupo', fn () => null))->middleware('grupo-sonda-55');
        $porAlias = (new Route(['GET'], 'api/sonda-alias', fn () => null))->middleware('alias-sonda-55:sonda.alias');

        $this->assertSame([PermissionMiddleware::class.':sonda.grupo'], $this->permissoesDeclaradasNaRota($porGrupo));
        $this->assertSame([PermissionMiddleware::class.':sonda.alias'], $this->permissoesDeclaradasNaRota($porAlias));
    }

    public function test_metodos_do_mesmo_uri_sao_avaliados_separados(): void
    {
        $mapa = $this->rotasDaApi();

        $this->assertArrayHasKey('GET|HEAD api/clients/{client}', $mapa);
        $this->assertArrayHasKey('PUT|PATCH api/clients/{client}', $mapa);

        $this->assertNotSame([], $mapa['GET|HEAD api/clients/{client}']['permissoes']);
        $this->assertNotSame([], $mapa['PUT|PATCH api/clients/{client}']['permissoes']);
        $this->assertNotSame(
            $mapa['GET|HEAD api/clients/{client}']['permissoes'],
            $mapa['PUT|PATCH api/clients/{client}']['permissoes'],
            'Mesma URI, métodos diferentes, permissões diferentes: a catraca avalia por método + URI.',
        );
    }
}
