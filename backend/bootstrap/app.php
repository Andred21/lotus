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
            // Ponta B da revogação (spec D5): conta desligada ou com `type`
            // fora de {admin, redator} perde acesso no request seguinte, e não
            // só no próximo login. Apendado ao grupo, não listado por rota —
            // rota autenticada nova nasce coberta.
            EnsureAccountIsActive::class,
        ]);

        // Risco medido (spec D5): middleware de grupo sem prioridade roda
        // ANTES do `auth:sanctum` da rota, então `$request->user()` ainda
        // vinha `null` aqui e o middleware passava tudo reto — os dois testes
        // de login real (AccountDeactivationMidSessionTest) confirmaram 200
        // em vez de 401 antes desta declaração. Lista completa do framework
        // (Kernel::$middlewarePriority), com a nossa logo após o
        // `AuthenticatesRequests` — é o ponto em que o guard já resolveu o
        // usuário da sessão.
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
