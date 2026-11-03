<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Tests\TestCase;

/**
 * Bloco 55, spec D5/D6 (D-17). O `PermissionCatalog` é a fonte das permissões
 * que o seeder cria. Permissão no catálogo que nada consome é papel que o admin
 * concede sem efeito algum (falsa sensação de controle); permissão exigida por
 * uma rota e ausente do catálogo nunca é criada, e a rota responde 403 para todos.
 *
 * Consumidor = rota (`permission:` no middleware resolvido) ou checagem literal
 * em código (`->can('x.y.z')`, `hasPermissionTo`, ...). Permissão órfã que for
 * real não se remove aqui: é decisão do João (spec D6).
 */
class PermissionCatalogOrphanTest extends TestCase
{
    /**
     * Extrai os nomes de um middleware `PermissionMiddleware:a|b,guard`.
     *
     * @return list<string>
     */
    private static function parsePermissionMiddleware(string $middleware): array
    {
        $arg = substr($middleware, (int) strpos($middleware, ':') + 1);
        $arg = explode(',', $arg, 2)[0];

        return array_values(array_filter(array_map('trim', explode('|', $arg)), fn (string $p) => $p !== ''));
    }

    /** @return list<string> nomes de `permission:` no middleware resolvido de toda rota */
    private function permissoesDoRoteador(): array
    {
        $nomes = [];

        /** @var Route $rota */
        foreach (RouteFacade::getRoutes() as $rota) {
            foreach (app('router')->gatherRouteMiddleware($rota) as $m) {
                $m = (string) $m;
                if (str_starts_with($m, PermissionMiddleware::class.':')) {
                    array_push($nomes, ...self::parsePermissionMiddleware($m));
                }
            }
        }

        $nomes = array_values(array_unique($nomes));
        sort($nomes);

        return $nomes;
    }

    /** @return list<string> nomes literais checados em código */
    private function permissoesEmCodigo(): array
    {
        $catalogo = realpath(app_path('Domains/Identity/Support/PermissionCatalog.php'));
        $padrao = '/->(?:can|cannot|hasPermissionTo|canAny|hasAnyPermission|checkPermissionTo)\(\s*\'([a-z_]+\.[a-z_.]+)\'/';
        $nomes = [];

        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(app_path(), RecursiveDirectoryIterator::SKIP_DOTS));
        foreach ($it as $arquivo) {
            if ($arquivo->getExtension() !== 'php' || $arquivo->getRealPath() === $catalogo) {
                continue;
            }

            foreach (file($arquivo->getRealPath()) as $linha) {
                $t = ltrim($linha);
                if (str_starts_with($t, '*') || str_starts_with($t, '//') || str_starts_with($t, '/*')) {
                    continue;
                }
                if (preg_match_all($padrao, $linha, $m)) {
                    array_push($nomes, ...$m[1]);
                }
            }
        }

        $nomes = array_values(array_unique($nomes));
        sort($nomes);

        return $nomes;
    }

    public function test_toda_permissao_do_catalogo_tem_consumidor(): void
    {
        $orfas = array_values(array_diff(
            array_keys(PermissionCatalog::descriptions()),
            $this->permissoesDoRoteador(),
            $this->permissoesEmCodigo(),
        ));

        sort($orfas);

        $this->assertSame([], $orfas, implode("\n", array_merge(
            [
                'Permissão no PermissionCatalog sem consumidor (nem rota, nem checagem em código).',
                'Não remova: decidir é do João (spec D6). Permissões:',
            ],
            $orfas,
        )));
    }

    public function test_toda_permissao_de_rota_existe_no_catalogo(): void
    {
        $fantasmas = array_values(array_diff(
            $this->permissoesDoRoteador(),
            array_keys(PermissionCatalog::descriptions()),
        ));

        $this->assertSame([], $fantasmas, implode("\n", array_merge(
            [
                'Rota exige permissão ausente do PermissionCatalog: o seeder nunca a cria',
                'e a rota responde 403 para todos (typo?). Permissões:',
            ],
            $fantasmas,
        )));
    }

    public function test_parse_de_permission_com_pipe_e_guard(): void
    {
        $classe = PermissionMiddleware::class;

        $this->assertSame(['a.b.c', 'd.e.f'], self::parsePermissionMiddleware("{$classe}:a.b.c|d.e.f"));
        $this->assertSame(['a.b.c'], self::parsePermissionMiddleware("{$classe}:a.b.c,web"));
    }
}
