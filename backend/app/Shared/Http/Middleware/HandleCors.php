<?php

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\HandleCors as BaseHandleCors;
use Illuminate\Http\Request;

/**
 * CORS com duas políticas.
 *
 * O site institucional é same-site com o app (`lotusotec.cl` e `app.lotusotec.cl`), então
 * credencial para ele levaria o cookie de sessão de um admin logado. Por isso a política do
 * site (`cors.publico`) só vale em `api/publico/*`, para a origem exata da lista
 * `CORS_PUBLIC_ORIGINS`, sem credenciais e sem curinga. Todo o resto cai na política do app
 * (`cors`, com `FRONTEND_URL` e credenciais), que não muda.
 *
 * O fluxo de `handle()` é o do `Illuminate\Http\Middleware\HandleCors`; a única troca é o
 * `setOptions(...)`.
 */
class HandleCors extends BaseHandleCors
{
    public function handle($request, Closure $next)
    {
        foreach (static::$skipCallbacks as $callback) {
            if ($callback($request)) {
                return $next($request);
            }
        }

        if (! $this->hasMatchingPath($request)) {
            return $next($request);
        }

        $this->cors->setOptions($this->opcoesPara($request));

        if ($this->cors->isPreflightRequest($request)) {
            $response = $this->cors->handlePreflightRequest($request);

            $this->cors->varyHeader($response, 'Access-Control-Request-Method');

            return $response;
        }

        $response = $next($request);

        if ($request->getMethod() === 'OPTIONS') {
            $this->cors->varyHeader($response, 'Access-Control-Request-Method');
        }

        return $this->cors->addActualRequestHeaders($response, $request);
    }

    /**
     * @return array<string, mixed>
     */
    private function opcoesPara(Request $request): array
    {
        $config = $this->container['config'];
        $permitidas = $this->origensPublicas();

        if ($request->is('api/publico/*') && in_array((string) $request->headers->get('Origin'), $permitidas, true)) {
            // A lista FILTRADA é a que chega ao `CorsService`, e não a do config: um `*` na
            // mesma lista do site exato ligaria `allowAllOrigins` e a resposta sairia
            // `Allow-Origin: *`.
            return ['allowed_origins' => $permitidas] + $config->get('cors.publico', []);
        }

        return $config->get('cors', []);
    }

    /**
     * As origens do site SEM nenhuma entrada com `*`: o `CorsService` transformaria
     * `https://*.cl` em padrão, e `*` abriria a API pública a qualquer origem por causa de um
     * env mal escrito.
     *
     * @return list<string>
     */
    private function origensPublicas(): array
    {
        return array_values(array_filter(
            (array) $this->container['config']->get('cors.publico.allowed_origins', []),
            static fn ($entrada) => is_string($entrada) && $entrada !== '' && ! str_contains($entrada, '*'),
        ));
    }
}
