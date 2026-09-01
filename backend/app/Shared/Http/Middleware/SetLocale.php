<?php

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Localização por request (i18n front↔back). O front manda o idioma via
 * Accept-Language (ex.: "es-CL"); normalizamos hífen->underscore e, se
 * suportado, ajustamos o locale da app para as mensagens (validação, auth)
 * saírem no idioma certo dentro do envelope RFC 7807 (ADR-03 / ADR-15).
 */
class SetLocale
{
    /**
     * Locales suportados — casam com os diretórios em lang/ e com os TRÊS do
     * front (`shared/config/i18n.ts`). `es` puro saiu em 2026-08-29: era
     * byte-idêntico ao `es_CL` e o Laravel não funde arquivo parcialmente, então
     * manter os dois significava duplicar 100% do conteúdo para sempre. Quem
     * mandar `Accept-Language: es` cai no fallback, que é es-CL (ADR-15).
     */
    private const SUPPORTED = ['en', 'es_CL', 'pt_BR'];

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Accept-Language');

        if ($header) {
            $locale = $this->normalize(trim(explode(',', $header)[0]));

            if (in_array($locale, self::SUPPORTED, true)) {
                app()->setLocale($locale);
            }
        }

        return $next($request);
    }

    /** "es-cl"/"es-CL" -> "es_CL"; "en" -> "en"; "pt-BR;q=0.9" -> "pt_BR". */
    private function normalize(string $locale): string
    {
        // Strip quality factor and other parameters
        $locale = explode(';', $locale)[0];
        $locale = str_replace('-', '_', $locale);

        if (! str_contains($locale, '_')) {
            return strtolower($locale);
        }

        [$lang, $region] = explode('_', $locale, 2);

        return strtolower($lang).'_'.strtoupper($region);
    }
}
