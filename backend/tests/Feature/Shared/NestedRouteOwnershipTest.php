<?php

namespace Tests\Feature\Shared;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Posse em rota nested era instrução espalhada: duas rotas usavam
 * `->scopeBindings()`, três checavam `abort_unless` no controller, e nada
 * impedia a próxima de nascer sem nenhum dos dois. Este teste é a fonte única.
 *
 * A assertiva é sobre a DECLARAÇÃO, não sobre o texto do controller: toda rota
 * com dois ou mais segmentos de parâmetro declara `scopeBindings()` **ou**
 * `withoutScopedBindings()`. Silêncio reprova — que é o ponto. Uma allowlist
 * dentro do teste envelheceria longe da rota; a declaração é lida por quem
 * edita a rota.
 *
 * O universo é a URI, não a assinatura. Até 2026-08-10 era
 * `signatureParameters(['subClass' => Model::class])`, e quem esquecesse de
 * TIPAR o binding saía do universo em silêncio — guarda com escape conhecido
 * é pior que nenhuma (Q-2 do review de 2026-08-05). A objeção que este arquivo
 * carregava contra ler a URI ("`{file}` não diz que é model") continua válida e
 * é respondida pela própria válvula do teste: rota cujo segundo parâmetro não é
 * model declara `withoutScopedBindings()` com o motivo ao lado, como as duas
 * rotas N:N de redator já fazem. Nenhuma rota reprovava quando isto entrou.
 */
class NestedRouteOwnershipTest extends TestCase
{
    public function test_toda_rota_com_dois_parametros_declara_escopo(): void
    {
        $indefinidas = [];

        foreach (Route::getRoutes() as $route) {
            if (preg_match_all('/\{[^}]+\}/', $route->uri()) < 2) {
                continue;
            }

            if ($route->enforcesScopedBindings() || $route->preventsScopedBindings()) {
                continue;
            }

            $indefinidas[] = implode('|', $route->methods()).' '.$route->uri();
        }

        sort($indefinidas);

        $this->assertSame(
            [],
            $indefinidas,
            "Rota com dois ou mais parametros sem declarar escopo de posse.\n".
            "Declare `->scopeBindings()` quando o filho pertence ao pai, ou\n".
            "`->withoutScopedBindings()` com o motivo em comentario quando nao pertence\n".
            "(inclusive quando o segundo parametro nao e model).\n".
            'Rotas: '.implode(', ', $indefinidas),
        );
    }
}
