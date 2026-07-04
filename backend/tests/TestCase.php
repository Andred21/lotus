<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum só considera a request "stateful" (sessão via cookie) se
        // Origin/Referer bater com sanctum.stateful. Sem isso, StartSession
        // nunca roda e $request->session() explode em qualquer rota autenticada.
        $this->withHeader('Referer', env('FRONTEND_URL', 'http://localhost:5173'));
    }
}
