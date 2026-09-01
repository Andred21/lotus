<?php

namespace App\Shared\Logging;

use App\Shared\Alerts\DetectorDeAcessoSuspeito;
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
 * `RedatorOnlyActionException` em `ProfileDocumentController`) — nenhum deles
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
 * `ImmutableSystemRoleException`/`RedatorOnlyActionException`) seria mudar o escopo do
 * DoD 8, não corrigir este detector — não restrinja para `AuthorizationException`
 * ou para `UnauthorizedException` sem reabrir a spec.
 */
class RegistraEventoDeErro
{
    /**
     * Chamada de dentro do `render()` global (`bootstrap/app.php`), ANTES de
     * `ProblemDetails::fromException()` — nada aqui pode escapar, ou a
     * resposta de erro (403/429) que o cliente ia receber vira uma exceção
     * não tratada no meio do próprio handler de exceção. Mesma catraca 5 da
     * spec ("alerta que quebra não pode derrubar a resposta"), aplicada na
     * costura em vez de só dentro do envio de e-mail (achado do review final
     * de 2026-08-26).
     */
    public static function handle(Throwable $e, Request $request): void
    {
        try {
            self::registrar($e, $request);
        } catch (Throwable $falha) {
            FalhaDeObservabilidade::registrar(
                'Falha ao registrar evento de seguranca a partir do handler global',
                $falha,
            );
        }
    }

    private static function registrar(Throwable $e, Request $request): void
    {
        $usuarioId = $request->user()?->getAuthIdentifier();
        $rota = $request->path();

        if ($e instanceof ThrottleRequestsException) {
            EventoDeSeguranca::taxaExcedida($usuarioId, $request->ip(), $rota);

            return;
        }

        if (self::isAcessoNegado($e)) {
            EventoDeSeguranca::acessoNegado($usuarioId, $request->ip(), $rota);

            // Só há família de "sequência de 403" quando existe usuário para
            // sequenciar: 403 anônimo é ruído de varredura externa, coberto
            // pelo limitador de IP e não por alerta nominal.
            if ($usuarioId !== null) {
                app(DetectorDeAcessoSuspeito::class)->acessoNegado((int) $usuarioId, $request->ip());
            }
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
