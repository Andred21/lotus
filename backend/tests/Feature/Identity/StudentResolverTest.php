<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StudentResolverTest extends TestCase
{
    use RefreshDatabase;

    private function resolver(): StudentResolver
    {
        return app(StudentResolver::class);
    }

    private function makeClient(string $suffix): Client
    {
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return Client::create(['user_id' => $user->id, 'legal_name' => "Empresa {$suffix}"]);
    }

    public function test_rut_novo_cria_aluno_inativo_sem_role_e_vincula(): void
    {
        $client = $this->makeClient('A');

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::Created, $result->outcome);
        $this->assertDatabaseHas('users', ['email' => 'ana@x.cl', 'type' => 'aluno', 'is_active' => false]);
        $this->assertEmpty($result->student->user->getRoleNames());
        $this->assertSame($client->id, $result->student->current_client_id);
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_mesmo_cliente_e_already_linked(): void
    {
        $client = $this->makeClient('A');
        $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::AlreadyLinked, $result->outcome);
        $this->assertSame(1, Student::count());
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_outro_cliente_move_e_reporta_o_anterior(): void
    {
        $clientA = $this->makeClient('A');
        $clientB = $this->makeClient('B');
        $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $clientA);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $clientB);

        $this->assertSame(StudentResolutionOutcome::Moved, $result->outcome);
        $this->assertNotNull($result->previousClient);
        $this->assertSame($clientA->id, $result->previousClient->id);
        $result->student->refresh();
        $this->assertSame($clientB->id, $result->student->current_client_id);
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_rut_invalido_lanca_validation_na_chave_rut(): void
    {
        $client = $this->makeClient('A');

        try {
            $this->resolver()->resolveByRut('12.345.678-0', 'X', 'x@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }
    }

    public function test_rut_de_redator_lanca_conflito_de_tipo(): void
    {
        $client = $this->makeClient('A');
        User::factory()->redator()->create(['rut' => '12.345.678-5']);

        try {
            $this->resolver()->resolveByRut('12.345.678-5', 'X', 'x@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }
    }

    public function test_email_ja_usado_por_outro_usuario_lanca_validation_na_chave_email(): void
    {
        $client = $this->makeClient('A');
        User::factory()->redator()->create(['rut' => '12.345.678-5', 'email' => 'dup@x.cl']);

        try {
            $this->resolver()->resolveByRut('7.654.321-6', 'X', 'dup@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email', $e->errors());
        }

        // Nenhuma linha parcial: sem Student e sem novo user aluno com o RUT da linha.
        $this->assertSame(0, Student::count());
        $this->assertDatabaseMissing('users', ['rut' => '7.654.321-6', 'type' => 'aluno']);
    }

    public function test_aluno_soft_deletado_e_restaurado_sem_duplicar(): void
    {
        $client = $this->makeClient('A');
        $first = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);
        $first->student->delete();

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(1, Student::count());
        $this->assertFalse($result->student->trashed());
        $this->assertFalse($result->student->user->trashed());
    }

    public function test_aluno_novo_sem_email_recusa_por_linha(): void
    {
        $client = $this->makeClient('A');

        $this->expectException(ValidationException::class);
        try {
            $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', null, null, $client);
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('email', $e->errors());
            throw $e;
        }
    }

    public function test_aluno_existente_sem_email_resolve_normal(): void
    {
        $client = $this->makeClient('A');
        // cria o aluno com email (1ª passada)
        $first = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', 'juan@acme.cl', null, $client);
        // 2ª passada SEM email: email só é usado no ramo de criação
        $again = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', null, null, $client);

        $this->assertSame($first->student->id, $again->student->id);
    }
}
