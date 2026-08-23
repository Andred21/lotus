<?php

use App\Shared\Exceptions\ProblemDetails;
use App\Shared\Http\Middleware\EnsureAccountIsActive;
use App\Shared\Http\Middleware\SetLocale;
use Illuminate\Auth\Middleware\Authorize;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Contracts\Session\Middleware\AuthenticatesSessions;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Routing\Middleware\ThrottleRequestsWithRedis;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        // Aliases de autorização do spatie/laravel-permission (ADR-07).
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        // Localização por request: Accept-Language -> locale (i18n front↔back, ADR-15).
        $middleware->api(append: [
            SetLocale::class,
        ]);

        // Ponta B da revogação (spec D5): conta desligada ou com `type` fora de
        // {admin, redator} perde acesso no request seguinte, e não só no
        // próximo login.
        //
        // Grupo casado com o `auth:sanctum`, e NÃO `api(append:)`: apendada ao
        // grupo `api` a checagem alcançava também as rotas propositalmente
        // anônimas, que rodam nesse mesmo grupo sem `auth:sanctum` — `login`,
        // `password/forgot`, `password/reset`, `invitation/accept` e
        // `publico/certificados/{uuid}`. `$request->user()` resolve nelas pelo
        // guard `web` de qualquer jeito, então um cookie de conta recém
        // desativada devolvia 401 na validação pública do QR e na própria tela
        // de login, que é justamente por onde a pessoa sairia do buraco (Q-1 do
        // review de 2026-08-23).
        //
        // A cobertura pretendida ("rota autenticada nova nasce coberta") não se
        // perde: quem pede autenticação pede `auth.active`, e a guarda de que
        // ninguém volta a escrever `auth:sanctum` cru está no
        // `AuthenticatedRouteMiddlewareTest`.
        $middleware->group('auth.active', [
            'auth:sanctum',
            EnsureAccountIsActive::class,
        ]);

        // Risco medido (spec D5): sem prioridade declarada a nossa pode rodar
        // ANTES do `auth:sanctum`, e aí `$request->user()` vem `null` e o
        // middleware passa tudo reto — os dois testes de login real
        // (AccountDeactivationMidSessionTest) confirmaram 200 em vez de 401
        // antes desta declaração. A ordem do array do `auth.active` acima já é
        // a certa, mas ordem literal não é garantia: o framework reordena pela
        // lista abaixo. Lista completa dele (Kernel::$middlewarePriority), com
        // a nossa logo após o `AuthenticatesRequests` — é o ponto em que o
        // guard já resolveu o usuário da sessão.
        $middleware->priority([
            HandlePrecognitiveRequests::class,
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            ShareErrorsFromSession::class,
            AuthenticatesRequests::class,
            EnsureAccountIsActive::class,
            ThrottleRequests::class,
            ThrottleRequestsWithRedis::class,
            AuthenticatesSessions::class,
            SubstituteBindings::class,
            Authorize::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ProblemDetails::fromException($e, $request);
            }

            return null;
        });
    })->create();
