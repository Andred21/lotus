<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProvisionerAccessDefaultTest extends TestCase
{
    use RefreshDatabase;

    public function test_redator_nasce_ativo(): void
    {
        $user = app(UserProvisioner::class)->provision(
            type: 'redator', name: 'Ana', rut: '11.111.111-1', email: 'ana@lotus.cl',
        );

        $this->assertTrue($user->is_active);
    }

    public function test_cliente_e_aluno_seguem_inativos(): void
    {
        $cliente = app(UserProvisioner::class)->provision(
            type: 'cliente', name: 'Empresa', rut: '22.222.222-2', email: 'empresa@lotus.cl',
        );
        $aluno = app(UserProvisioner::class)->provision(
            type: 'aluno', name: 'Aluno', rut: '33.333.333-3', email: 'aluno@lotus.cl',
        );

        $this->assertFalse($cliente->is_active);
        $this->assertFalse($aluno->is_active);
    }
}
