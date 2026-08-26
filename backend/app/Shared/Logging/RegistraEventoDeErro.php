<?php

namespace App\Shared\Logging;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Traduz em evento de segurança os dois erros do handler global que são sinal
 * de acesso, não de defeito: `403` (autorização negada) e `429` (taxa
 * excedida).
 *
 * **Mora aqui e não num `$exceptions->report()`:** o `Handler` do Laravel traz
 * `AuthorizationException`, `HttpException` e `ValidationException` na lista
 * interna de "não reportar", então um `report()` NUNCA veria estes dois. O
 * `render()` do `bootstrap/app.php` já é o ponto que o projeto possui para
 * comportamento transversal de erro de API — é dele que esta classe é chamada.
 *
 * Não formata resposta e não decide status: quem faz isso é o `ProblemDetails`.
 * Esta classe só registra.
 *
 * **Detecção por status, não só por `AuthorizationException`:** nenhum
 * controller deste repositório chama `$this->authorize()`/`Gate::authorize()`
 * — zero ocorrência (conferido em 2026-08-26). Todo 403 real hoje nasce do
 * RBAC do spatie/laravel-permission (`permission:`/`role:`/`role_or_permission:`,
 * `Spatie\Permission\Exceptions\UnauthorizedException`) ou de um
 * `HttpException(403)` próprio (`ImmutableSystemRoleException`,
 * `abort_unless(..., 403, ...)` em `ProfileDocumentController`) — nenhum deles
 * estende `AuthorizationException`. Checar só essa classe deixaria
 * `acesso.negado` mudo em todo 403 de verdade da API; o teto por
 * `getStatusCode() === 403` cobre os quatro caminhos sem duplicar a
 * classificação do `ProblemDetails` (`AuthenticationException` e
 * `ValidationException` não implementam `HttpExceptionInterface`, então não
 * colidem aqui, e 404/422/401 ficam de fora do teto por não serem 403).
 *
 * **Isto é intencional, não uma lacuna a fechar depois:** a spec do bloco
 * (`docs/superpowers/specs/2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md`
 * §4.6, decisão D6) define o ponto de captura da família "sequência de 403"
 * como o "braço 403 do `ProblemDetails:26`" — o MESMO arco genérico que
 * responde qualquer 403, de RBAC ou de regra de negócio, não um evento
 * exclusivo do RBAC. `acesso.negado` portanto mistura os dois sinais sob um
 * único teto de propósito. Separar por origem (RBAC vs.
 * `ImmutableSystemRoleException`/`abort_unless`) seria mudar o escopo do
 * DoD 8, não corrigir este detector — não restrinja para `AuthorizationException`
 * ou para `UnauthorizedException` sem reabrir a spec.
 */
class RegistraEventoDeErro
{
    public static function handle(Throwable $e, Request $request): void
    {
        $usuarioId = $request->user()?->getAuthIdentifier();
        $rota = $request->path();

        if ($e instanceof ThrottleRequestsException) {
            EventoDeSeguranca::taxaExcedida($usuarioId, $request->ip(), $rota);

            return;
        }

        if (self::isAcessoNegado($e)) {
            EventoDeSeguranca::acessoNegado($usuarioId, $request->ip(), $rota);
        }
    }

    private static function isAcessoNegado(Throwable $e): bool
    {
        if ($e instanceof AuthorizationException) {
            return true;
        }

        return $e instanceof HttpExceptionInterface && $e->getStatusCode() === 403;
    }
}
