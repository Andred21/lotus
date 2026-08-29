<?php

namespace App\Shared\RateLimiting;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Fonte única da política de taxa da API (RNF-SEC-06). Nenhum número de
 * throttle mora em `routes.php`: quem quer saber a política lê ESTE arquivo.
 *
 * O desenho é teto global + nomeados (spec D2). O teto do grupo `api` existe
 * para que rota nova nasça coberta — foi a ausência dele que deixou `/login`
 * sem limite três linhas acima do único grupo que tinha. Os nomeados são os que
 * apertam de verdade, cada um na operação que custa caro.
 *
 * Os contadores vão para a tabela `cache` do MySQL (`CACHE_STORE=database`).
 * Redis fica fora: ~10 usuários internos não o justificam.
 *
 * A chave do balde já é prefixada pelo framework com o NOME do limitador
 * (`ThrottleRequests` compõe `md5($limiterName.$limit->key)`), então dois
 * limitadores podem chavear pelo mesmo IP sem se misturarem.
 */
final class RateLimits
{
    /** Teto largo por pessoa: ~16 telas cheias do SPA por minuto. */
    public const API_AUTENTICADO = 240;

    /** Backstop da superfície anônima — impede pulverização de e-mails de uma origem só. */
    public const API_ANONIMO = 60;

    /** Padrão do Fortify. Chave `email|ip` (spec D3). */
    public const LOGIN = 5;

    /** Validação pública do QR: peso legal, então largo o bastante para conferência na mão. */
    public const CERTIFICADO_PUBLICO = 30;

    /** O `throttle:6,1` de hoje, revisado e mantido — nenhuma medição justifica mexer. */
    public const SENHA = 6;

    /** Cada upload custa um scan de antivírus antes da escrita. */
    public const UPLOAD = 20;

    public const IMPORT = 5;

    public const LOTE_CERTIFICADO = 5;

    /** Renderiza no Gotenberg a cada requisição — a rota mais cara do sistema. */
    public const PDF_CERTIFICADO = 30;

    public static function register(): void
    {
        RateLimiter::for('api', fn (Request $request) => $request->user()
            ? Limit::perMinute(self::API_AUTENTICADO)->by(self::porUsuario($request))
            : Limit::perMinute(self::API_ANONIMO)->by('ip:'.$request->ip()));

        // `email|ip` (D3): só-IP trancaria os ~10 usuários da Lotus juntos atrás
        // do mesmo NAT; só-e-mail deixaria trancar de fora uma conta conhecida.
        // Normalizado porque `Ana@Lotus.CL` e `ana@lotus.cl` são a mesma conta —
        // sem isto a contenção cai por uma tecla de shift.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(self::LOGIN)
            ->by(self::chaveDeLogin($request)));

        RateLimiter::for('public-certificate', fn (Request $request) => Limit::perMinute(self::CERTIFICADO_PUBLICO)
            ->by($request->ip()));

        RateLimiter::for('password', fn (Request $request) => Limit::perMinute(self::SENHA)
            ->by($request->ip()));

        RateLimiter::for('upload', fn (Request $request) => Limit::perMinute(self::UPLOAD)
            ->by(self::porUsuario($request)));

        RateLimiter::for('import', fn (Request $request) => Limit::perMinute(self::IMPORT)
            ->by(self::porUsuario($request)));

        RateLimiter::for('certificate-batch', fn (Request $request) => Limit::perMinute(self::LOTE_CERTIFICADO)
            ->by(self::porUsuario($request)));

        RateLimiter::for('certificate-pdf', fn (Request $request) => Limit::perMinute(self::PDF_CERTIFICADO)
            ->by(self::porUsuario($request)));
    }

    /**
     * A closure do limitador roda ANTES de qualquer validação, com o corpo cru
     * que o cliente mandou. `email` não é necessariamente string: com
     * `{"email":["a","b"]}` o cast `(string)` emitia um warning, o
     * `HandleExceptions` do Laravel o promovia a `ErrorException` e a rota mais
     * exposta da API devolvia 500 em vez de 422 (achado Q-1 do review de
     * 2026-08-25, medido contra a API real). Entrada que não é string vira
     * balde vazio: quem manda lixo compartilha o balde do lixo, e a validação
     * do controller é quem diz o que está errado.
     *
     * **Pública desde o bloco de observabilidade:** o detector de acesso
     * suspeito conta na MESMA chave em que o limitador conta. Duas definições
     * de "mesma chave" divergiriam na primeira vez que uma delas mudasse de
     * normalização, e o alerta passaria a falar de um agrupamento que o
     * throttle não usa.
     */
    public static function chaveDeLogin(Request $request): string
    {
        $email = $request->input('email');

        return (is_string($email) ? Str::lower(trim($email)) : '').'|'.$request->ip();
    }

    /**
     * Todos estes limitadores vivem atrás de `auth.active`, então `user()` está
     * resolvido — `ThrottleRequests` roda DEPOIS do `AuthenticatesRequests` na
     * prioridade declarada em `bootstrap/app.php`. O fallback para IP existe
     * para não haver balde nulo se a rota mudar de lugar um dia.
     */
    private static function porUsuario(Request $request): string
    {
        return $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();
    }
}
