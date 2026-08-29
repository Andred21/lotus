<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentClientLinkService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StudentCrudTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_lista_alunos_com_cliente_atual(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Carlos Pérez Muñoz')
            ->assertJsonPath('data.0.current_client_name', 'Transelec')
            ->assertJsonPath('data.0.enrollments_count', 0);
    }

    public function test_cria_aluno_pela_api_e_grava_o_primeiro_vinculo(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);

        $response = $this->postJson('/api/students', [
            'name' => 'María González Rojas',
            'rut' => '12.345.678-5',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
            'client_id' => $client->id,
        ]);

        $id = $response->assertCreated()->json('id');
        $this->assertDatabaseHas('users', ['email' => 'mgonzalez@transelec.cl', 'type' => 'aluno', 'is_active' => false]);
        $this->assertDatabaseHas('student_client_logs', ['student_id' => $id, 'client_id' => $client->id, 'ended_on' => null]);
    }

    public function test_rut_invalido_vira_422_com_a_chave_rut(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);

        $this->postJson('/api/students', [
            'name' => 'RUT Ruim',
            'rut' => '15.234.567-0',
            'email' => 'ruim@transelec.cl',
            'client_id' => $client->id,
        ])->assertStatus(422)->assertJsonPath('errors.rut.0', fn ($m) => is_string($m));
    }

    public function test_rut_duplicado_vira_422(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));

        $this->postJson('/api/students', [
            'name' => 'Homônimo',
            'rut' => '15.234.567-8',
            'email' => 'outro@subnorte.cl',
            'client_id' => $client->id,
        ])->assertStatus(422);
    }

    public function test_detalhe_traz_vinculos_e_turmas(): void
    {
        $this->actingAsAdmin();
        $antigo = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        $atual = $this->makeClientWithUser(['legal_name' => 'Subestación Norte S.A.']);
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $antigo->id,
        ]));
        app(StudentClientLinkService::class)->link($student, $atual);

        $this->getJson("/api/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('current_client_name', 'Subestación Norte S.A.')
            ->assertJsonCount(2, 'links')
            ->assertJsonPath('links.0.ended_on', null)
            ->assertJsonPath('turmas', [])
            // D5: o detalhe carrega os campos do StudentData + os históricos.
            ->assertJsonPath('enrollments_count', 0);
    }

    /**
     * O UpdateStudentAction ignora `client_id` de propósito (D3), então validar
     * a existência do cliente no PUT recusava uma edição de dados pessoais que
     * nem tocaria o vínculo.
     */
    public function test_update_ignora_client_id_invalido_em_vez_de_recusar(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales Roas',
            'rut' => '12.345.678-5',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => $client->id,
        ]));

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'María González Rojas',
            'rut' => '12.345.678-5',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => 999999,
        ])
            ->assertOk()
            ->assertJsonPath('name', 'María González Rojas')
            ->assertJsonPath('current_client_id', $client->id);
    }

    /** Cliente inexistente no cadastro é erro de preenchimento: 422 no campo, não 404. */
    public function test_store_com_cliente_inexistente_vira_422_no_campo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/students', [
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '12.345.678-5',
            'email' => 'cperez@subnorte.cl',
            'client_id' => 999999,
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.client_id.0', 'Cliente não encontrado.');
    }

    public function test_atualiza_dados_pessoais(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeClientWithUser(['legal_name' => 'Transelec']);
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales Roas',
            'rut' => '12.345.678-5',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => $client->id,
        ]));

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'María González Rojas',
            'rut' => '12.345.678-5',
            'email' => 'mgonzalez@transelec.cl',
        ])->assertOk()->assertJsonPath('name', 'María González Rojas');
    }

    public function test_redator_autenticado_nao_acessa_alunos(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/students')->assertForbidden();
        $this->postJson('/api/students', [])->assertForbidden();
    }
}
