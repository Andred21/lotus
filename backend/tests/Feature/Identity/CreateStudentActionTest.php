<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CreateStudentActionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function data(Client $client, string $rut = '12.876.543-K'): StudentData
    {
        return StudentData::from([
            'name' => 'María González Rojas',
            'rut' => $rut,
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
            'client_id' => $client->id,
        ]);
    }

    public function test_cria_user_inativo_student_e_o_primeiro_vinculo(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);

        $student = app(CreateStudentAction::class)->execute($this->data($client));

        $this->assertDatabaseHas('users', [
            'email' => 'mgonzalez@transelec.cl',
            'type' => 'aluno',
            'is_active' => false,
        ]);
        $this->assertSame($client->id, $student->current_client_id);
        $this->assertDatabaseHas('student_client_logs', [
            'student_id' => $student->id,
            'client_id' => $client->id,
            'ended_on' => null,
        ]);
    }

    public function test_rut_duplicado_vira_erro_de_validacao_e_nao_associacao_silenciosa(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        app(CreateStudentAction::class)->execute($this->data($client));

        $this->expectException(ValidationException::class);

        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Outro Aluno',
            'rut' => '12.876.543-K',
            'email' => 'outro@transelec.cl',
            'client_id' => $client->id,
        ]));
    }

    public function test_cliente_e_obrigatorio_no_cadastro(): void
    {
        $this->expectException(ValidationException::class);

        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
        ]));
    }

    public function test_falha_no_meio_nao_deixa_user_orfao(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        User::factory()->create(['email' => 'colisao@transelec.cl']);

        try {
            app(CreateStudentAction::class)->execute(StudentData::from([
                'name' => 'Colisão',
                'rut' => '16.543.210-9',
                'email' => 'colisao@transelec.cl',
                'client_id' => $client->id,
            ]));
            $this->fail('esperava ValidationException por e-mail duplicado');
        } catch (ValidationException) {
            // esperado
        }

        $this->assertDatabaseMissing('users', ['rut' => '16.543.210-9']);
    }
}
