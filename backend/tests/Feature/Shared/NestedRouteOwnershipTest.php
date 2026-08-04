<?php

namespace Tests\Feature\Shared;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Posse em rota nested era instrução espalhada: duas rotas usavam
 * `->scopeBindings()`, três checavam `abort_unless` no controller, e nada
 * impedia a próxima de nascer sem nenhum dos dois. Este teste é a fonte única.
 *
 * A assertiva é sobre a DECLARAÇÃO, não sobre o texto do controller: toda rota
 * com dois ou mais bindings de model declara `scopeBindings()` **ou**
 * `withoutScopedBindings()`. Silêncio reprova — que é o ponto. Uma allowlist
 * dentro do teste envelheceria longe da rota; a declaração é lida por quem
 * edita a rota.
 *
 * Os parâmetros vêm de `signatureParameters(['subClass' => Model::class])`, a
 * assinatura tipada do controller — não de regex sobre a URI. Regex erraria nos
 * dois sentidos: `{file}` não diz que é model, e `users/{user}/photo` tem um
 * binding só apesar de parecer nested.
 */
class NestedRouteOwnershipTest extends TestCase
{
    public function test_toda_rota_com_dois_bindings_de_model_declara_escopo(): void
    {
        $indefinidas = [];

        foreach (Route::getRoutes() as $route) {
            $models = $route->signatureParameters(['subClass' => Model::class]);

            if (count($models) < 2) {
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
            "Rota com dois ou mais bindings de model sem declarar escopo de posse.\n".
            "Declare `->scopeBindings()` quando o filho pertence ao pai, ou\n".
            "`->withoutScopedBindings()` com o motivo em comentário quando não pertence.\n".
            'Rotas: '.implode(', ', $indefinidas),
        );
    }
}
