<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Shared\Support\TetosImpressos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StudentResolverTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function resolver(): StudentResolver
    {
        return app(StudentResolver::class);
    }

    public function test_rut_novo_cria_aluno_inativo_sem_role_e_vincula(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::Created, $result->outcome);
        $this->assertDatabaseHas('users', ['email' => 'ana@x.cl', 'type' => 'aluno', 'is_active' => false]);
        $this->assertEmpty($result->student->user->getRoleNames());
        $this->assertSame($client->id, $result->student->current_client_id);
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_mesmo_cliente_e_already_linked(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
        $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(StudentResolutionOutcome::AlreadyLinked, $result->outcome);
        $this->assertSame(1, Student::count());
        $this->assertSame(1, $result->student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_rut_outro_cliente_move_e_reporta_o_anterior(): void
    {
        $clientA = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
        $clientB = $this->makeClientWithUser(['legal_name' => 'Empresa B']);
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
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);

        try {
            $this->resolver()->resolveByRut('12.345.678-0', 'X', 'x@x.cl', null, $client);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('rut', $e->errors());
        }
    }

    public function test_rut_de_redator_lanca_conflito_de_tipo(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
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
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
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
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
        $first = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);
        $first->student->delete();

        $result = $this->resolver()->resolveByRut('12.345.678-5', 'Ana Díaz', 'ana@x.cl', null, $client);

        $this->assertSame(1, Student::count());
        $this->assertFalse($result->student->trashed());
        $this->assertFalse($result->student->user->trashed());
    }

    public function test_aluno_novo_sem_email_recusa_por_linha(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);

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
        $client = $this->makeClientWithUser(['legal_name' => 'Empresa A']);
        // cria o aluno com email (1ª passada)
        $first = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', 'juan@acme.cl', null, $client);
        // 2ª passada SEM email: email só é usado no ramo de criação
        $again = $this->resolver()->resolveByRut('11.111.111-1', 'Juan Soto', null, null, $client);

        $this->assertSame($first->student->id, $again->student->id);
    }

    public function test_assert_can_create_recusa_email_ausente(): void
    {
        foreach ([null, ''] as $email) {
            try {
                $this->resolver()->assertCanCreate('11.111.111-1', 'Juan Soto', $email);
                $this->fail('esperava ValidationException');
            } catch (ValidationException $e) {
                $this->assertSame(['email'], array_keys($e->errors()));
                $this->assertSame([__('identity.errors.student_email_required')], $e->errors()['email']);
            }
        }
    }

    public function test_assert_name_provided_recusa_nome_vazio_ou_em_branco(): void
    {
        foreach (['', '   '] as $nome) {
            try {
                $this->resolver()->assertNameProvided($nome);
                $this->fail('esperava ValidationException');
            } catch (ValidationException $e) {
                $this->assertSame(['name'], array_keys($e->errors()));
                $this->assertSame(
                    [__('validation.required', ['attribute' => __('validation.attributes.name')])],
                    $e->errors()['name'],
                );
            }
        }

        $this->resolver()->assertNameProvided('Juan Soto');
    }

    public function test_assert_can_create_recusa_nome_vazio(): void
    {
        try {
            $this->resolver()->assertCanCreate('11.111.111-1', '', 'juan@acme.cl');
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(['name'], array_keys($e->errors()));
        }
    }

    public function test_assert_can_create_recusa_nome_acima_do_teto(): void
    {
        $nome = str_repeat('a', TetosImpressos::NOME_ALUNO + 1);

        try {
            $this->resolver()->assertCanCreate('11.111.111-1', $nome, 'juan@acme.cl');
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(['name'], array_keys($e->errors()));
        }

        // No teto exato passa.
        $this->resolver()->assertCanCreate('11.111.111-1', str_repeat('a', TetosImpressos::NOME_ALUNO), 'juan@acme.cl');
    }

    public function test_assert_can_create_recusa_email_de_outro_usuario_inclusive_arquivado(): void
    {
        $vivo = User::factory()->redator()->create(['rut' => '12.345.678-5', 'email' => 'vivo@x.cl']);
        $arquivado = User::factory()->redator()->create(['rut' => '7.654.321-6', 'email' => 'arq@x.cl']);
        $arquivado->delete();

        foreach (['vivo@x.cl', 'arq@x.cl'] as $email) {
            try {
                $this->resolver()->assertCanCreate('11.111.111-1', 'Juan Soto', $email);
                $this->fail('esperava ValidationException');
            } catch (ValidationException $e) {
                $this->assertSame(['email'], array_keys($e->errors()));
            }
        }
        $this->assertNotNull($vivo->id);
    }

    public function test_assert_can_create_nao_escreve(): void
    {
        $contar = fn () => [DB::table('users')->count(), DB::table('students')->count(), DB::table('audits')->count()];
        $antes = $contar();

        $this->resolver()->assertCanCreate('11.111.111-1', 'Juan Soto', 'juan@acme.cl');

        $this->assertSame($antes, $contar());
    }
}
