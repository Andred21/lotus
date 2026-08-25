<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Models\User;
use App\Shared\RateLimiting\RateLimits;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Os limitadores são lidos do registro, não das rotas: assim o teste prova a
 * CHAVE e o número de cada balde sem depender de 241 requisições HTTP.
 *
 * A prova de que a chave separa de verdade (mesmo e-mail de outro IP, mesmo IP
 * de outro e-mail) é o coração do D3 e está aqui; a versão pela API real é o
 * DoD 1 da Task 12.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<Limit> */
    private function limites(string $nome, Request $request): array
    {
        $limiter = RateLimiter::limiter($nome);
        $this->assertNotNull($limiter, "O limitador `{$nome}` não foi registrado.");

        // `Collection::wrap`, e nunca `collect()`: o limitador pode devolver um
        // `Limit` solto, e `collect()` sobre um objeto casta as PROPRIEDADES dele
        // para array. É o mesmo `wrap` que o `ThrottleRequests` usa.
        return Collection::wrap($limiter($request))->all();
    }

    private function requisicao(string $ip, array $corpo = [], ?User $user = null): Request
    {
        $request = Request::create('/api/login', 'POST', $corpo, [], [], ['REMOTE_ADDR' => $ip]);

        if ($user !== null) {
            $request->setUserResolver(fn () => $user);
        }

        return $request;
    }

    public function test_todos_os_limitadores_do_bloco_estao_registrados(): void
    {
        foreach ([
            'api', 'login', 'public-certificate', 'password',
            'upload', 'import', 'certificate-batch', 'certificate-pdf',
        ] as $nome) {
            $this->assertNotNull(
                RateLimiter::limiter($nome),
                "O limitador `{$nome}` não foi registrado — a rota que o cita daria 500.",
            );
        }
    }

    public function test_teto_global_separa_autenticado_de_anonimo(): void
    {
        $user = User::factory()->create();

        $anonimo = $this->limites('api', $this->requisicao('10.0.0.1'))[0];
        $autenticado = $this->limites('api', $this->requisicao('10.0.0.1', [], $user))[0];

        $this->assertSame(RateLimits::API_ANONIMO, $anonimo->maxAttempts);
        $this->assertSame(RateLimits::API_AUTENTICADO, $autenticado->maxAttempts);
        $this->assertNotSame($anonimo->key, $autenticado->key);
    }

    public function test_login_e_chaveado_por_email_e_ip_juntos(): void
    {
        $base = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'ana@lotus.cl']))[0];
        $outroIp = $this->limites('login', $this->requisicao('10.0.0.2', ['email' => 'ana@lotus.cl']))[0];
        $outroEmail = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'bruno@lotus.cl']))[0];

        $this->assertSame(RateLimits::LOGIN, $base->maxAttempts);
        $this->assertNotSame($base->key, $outroIp->key, 'Mesmo e-mail de outro IP tem de ter balde próprio (D3).');
        $this->assertNotSame($base->key, $outroEmail->key, 'Mesmo IP com outro e-mail tem de ter balde próprio (D3).');
    }

    public function test_login_ignora_caixa_e_espaco_do_email(): void
    {
        // Sem normalizar, `Ana@Lotus.cl ` seria outro balde e a contenção
        // cairia por uma tecla de shift.
        $a = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => 'ana@lotus.cl']))[0];
        $b = $this->limites('login', $this->requisicao('10.0.0.1', ['email' => '  Ana@Lotus.CL ']))[0];

        $this->assertSame($a->key, $b->key);
    }

    public function test_limitadores_por_usuario_separam_usuarios(): void
    {
        $ana = User::factory()->create();
        $bruno = User::factory()->create();

        foreach ([
            'upload' => RateLimits::UPLOAD,
            'import' => RateLimits::IMPORT,
            'certificate-batch' => RateLimits::LOTE_CERTIFICADO,
            'certificate-pdf' => RateLimits::PDF_CERTIFICADO,
        ] as $nome => $esperado) {
            $daAna = $this->limites($nome, $this->requisicao('10.0.0.1', [], $ana))[0];
            $doBruno = $this->limites($nome, $this->requisicao('10.0.0.1', [], $bruno))[0];

            $this->assertSame($esperado, $daAna->maxAttempts, "Número errado em `{$nome}`.");
            $this->assertNotSame($daAna->key, $doBruno->key, "`{$nome}` está juntando usuários no mesmo balde.");
        }
    }

    public function test_limitadores_por_ip_usam_o_ip(): void
    {
        foreach (['public-certificate' => RateLimits::CERTIFICADO_PUBLICO, 'password' => RateLimits::SENHA] as $nome => $esperado) {
            $a = $this->limites($nome, $this->requisicao('10.0.0.1'))[0];
            $b = $this->limites($nome, $this->requisicao('10.0.0.2'))[0];

            $this->assertSame($esperado, $a->maxAttempts, "Número errado em `{$nome}`.");
            $this->assertNotSame($a->key, $b->key, "`{$nome}` não está separando por IP.");
        }
    }

    public function test_o_grupo_api_carrega_o_teto_global(): void
    {
        $middleware = app('router')->getMiddlewareGroups()['api'] ?? [];

        $this->assertContains('throttle:api', $middleware, implode("\n", [
            'O grupo `api` perdeu o teto global. Sem ele a cobertura volta a depender',
            'de alguém lembrar de pendurar `throttle:` na rota nova — que é o buraco',
            'medido que deixou `/login` de fora por três linhas (D2).',
        ]));
    }

    /**
     * @return list<string> os middleware CRUS (não resolvidos) de uma rota, por método e URI.
     *
     * `$rota->middleware()` e não `app('router')->gatherRouteMiddleware($rota)`: o segundo
     * resolve o alias pela classe (`throttle:login` vira
     * `Illuminate\Routing\Middleware\ThrottleRequests:login`), o que nunca bateria contra o
     * nome do limitador. A checagem daqui é "esta rota está pendurada no limitador X", que só o
     * nome cru prova — é o mesmo motivo pelo qual `test_nenhum_throttle_com_numero_literal...`
     * usa a forma resolvida: para pegar número literal em QUALQUER forma de declarar o
     * middleware, não só via alias.
     */
    private function middlewareDa(string $metodo, string $uri): array
    {
        foreach (app('router')->getRoutes() as $rota) {
            if ($rota->uri() === $uri && in_array($metodo, $rota->methods(), true)) {
                return array_values($rota->middleware());
            }
        }

        $this->fail("Rota {$metodo} {$uri} não existe.");
    }

    public function test_cada_alvo_carrega_o_seu_limitador_nomeado(): void
    {
        $esperado = [
            ['POST', 'api/login', 'throttle:login'],
            ['GET', 'api/publico/certificados/{uuid}', 'throttle:public-certificate'],
            ['POST', 'api/password/forgot', 'throttle:password'],
            ['POST', 'api/password/reset', 'throttle:password'],
            ['POST', 'api/invitation/accept', 'throttle:password'],
            ['POST', 'api/profile/photo', 'throttle:upload'],
            ['POST', 'api/profile/documents', 'throttle:upload'],
            ['POST', 'api/users/{user}/photo', 'throttle:upload'],
            ['POST', 'api/redatores', 'throttle:upload'],
            ['PUT', 'api/redatores/{redator}', 'throttle:upload'],
            ['POST', 'api/redatores/{redator}/photo', 'throttle:upload'],
            ['POST', 'api/redatores/{redator}/documents', 'throttle:upload'],
            ['POST', 'api/students/{student}/photo', 'throttle:upload'],
            ['POST', 'api/clients/{client}/photo', 'throttle:upload'],
            ['POST', 'api/quotes/{quote}/files', 'throttle:upload'],
            ['POST', 'api/budgets/{budget}/files', 'throttle:upload'],
            ['POST', 'api/turmas/{turma}/documents', 'throttle:upload'],
            ['POST', 'api/turmas/{turma}/alunos/importar', 'throttle:import'],
            ['POST', 'api/certificates/batch', 'throttle:certificate-batch'],
            ['GET', 'api/certificates/{certificate}/pdf', 'throttle:certificate-pdf'],
        ];

        foreach ($esperado as [$metodo, $uri, $limitador]) {
            $this->assertContains(
                $limitador,
                $this->middlewareDa($metodo, $uri),
                "{$metodo} {$uri} está sem `{$limitador}`.",
            );
        }
    }

    public function test_nenhum_throttle_com_numero_literal_sobrou_nas_rotas(): void
    {
        // O `throttle:6,1` de `Identity/routes.php` era a política inteira do
        // repositório escrita dentro de um arquivo de rotas. A política agora
        // mora no `RateLimits`; número literal em rota é a volta do problema.
        $literais = [];

        foreach (app('router')->getRoutes() as $rota) {
            foreach (app('router')->gatherRouteMiddleware($rota) as $m) {
                if (preg_match('/^Illuminate\\\\Routing\\\\Middleware\\\\ThrottleRequests:\d/', (string) $m)) {
                    $literais[] = $rota->uri().' -> '.$m;
                }
            }
        }

        $this->assertSame([], array_values(array_unique($literais)), implode("\n", array_merge(
            ['Throttle com número literal na rota. A política é única e mora em `App\Shared\RateLimiting\RateLimits`:'],
            $literais,
        )));
    }
}
