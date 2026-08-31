<?php

use App\Shared\Exceptions\ProblemDetails;
use App\Shared\Http\Middleware\EnsureAccountIsActive;
use App\Shared\Http\Middleware\SetLocale;
use App\Shared\Logging\RegistraEventoDeErro;
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

        // Teto global (spec D2): rota nova do grupo `api` nasce coberta. É
        // largo de propósito — quem aperta são os limitadores nomeados de cada
        // operação cara. A ordem real não vem daqui: `ThrottleRequests` está na
        // lista de prioridade abaixo, logo após o `AuthenticatesRequests`, e é
        // isso que garante que o balde por usuário veja o usuário resolvido.
        $middleware->api(prepend: [
            'throttle:api',
        ]);

        // GLOBAL, e não `api(append:)` (Q-4 do review de 2026-08-30).
        //
        // Middleware de grupo só roda em rota que CASOU. Uma URL que não existe
        // levanta `NotFoundHttpException` durante o roteamento — antes da pilha
        // do grupo —, então o `SetLocale` apendado ao `api` nunca rodava ali e
        // todo 404 de rota inválida saía no locale padrão, ignorando o
        // `Accept-Language`. A pilha global roda ANTES do roteamento, que é o
        // único ponto que alcança as duas famílias de 404 (a de rota inexistente
        // e a de model binding).
        //
        // Seguro por não decidir nada: lê um header, normaliza e escolhe entre
        // três valores fixos. Não toca sessão, usuário, banco nem cookie, então
        // rodar antes da autenticação não abre superfície — o que ele define é o
        // idioma da resposta, e a resposta de quem não autenticou também tem
        // idioma.
        $middleware->append(SetLocale::class);

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
        //
        // `SetLocale` NÃO entra nesta lista: ela é global (acima), e a
        // ordenação por prioridade só vale para middleware DE ROTA. Ela esteve
        // aqui entre 2026-08-29 e o Q-4 do review de 2026-08-30, quando era
        // appendada ao grupo `api` — e precisava estar, porque o sort empurrava
        // `AuthenticatesRequests` para antes dela e o 401 do `auth:sanctum`
        // disparava com o locale ainda no padrão (`SetLocaleTest`, 3/8 casos
        // reprovando). Ser global resolve o mesmo problema mais cedo e resolve
        // junto o 404 de rota inexistente, que nenhuma posição nesta lista
        // alcançaria.
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
                // 403 e 429 são sinal de ACESSO e não de defeito, e a lista
                // interna de "não reportar" do Handler impede que um
                // `$exceptions->report()` os enxergue. Registrar aqui é o único
                // ponto que vê os dois sem duplicar a classificação.
                RegistraEventoDeErro::handle($e, $request);

                return ProblemDetails::fromException($e, $request);
            }

            return null;
        });
    })->create();
