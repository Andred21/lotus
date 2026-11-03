<?php

namespace Tests\Feature\Shared;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P-91: /api/* sem sessão e SEM `Accept: application/json` não pode virar 500
 * (`Route [login] not defined`); tem de sair o 401 RFC 7807 do handler global.
 */
class UnauthenticatedWithoutAcceptTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_sem_sessao_e_sem_accept_devolve_401_problem_json(): void
    {
        // `get()` e não `getJson()`: o caso do P-91 é justamente o pedido sem Accept.
        $this->get('/api/courses/archived')
            ->assertStatus(401)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_api_sem_sessao_com_accept_continua_401(): void
    {
        $this->getJson('/api/courses/archived')
            ->assertStatus(401)
            ->assertHeader('Content-Type', 'application/problem+json');
    }
}
