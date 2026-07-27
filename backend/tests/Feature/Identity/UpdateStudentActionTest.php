<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Actions\CreateStudentAction;
use App\Domains\Identity\Actions\UpdateStudentAction;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UpdateStudentActionTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName = 'Transelec'): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    public function test_corrige_nome_vindo_errado_da_planilha_sem_tocar_o_vinculo(): void
    {
        $client = $this->client();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Maria Gonzales Roas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'client_id' => $client->id,
        ]));

        $updated = app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 1111 2222',
        ]));

        $this->assertSame('María González Rojas', $updated->user->name);
        $this->assertSame('+56 9 1111 2222', $updated->user->phone);
        $this->assertSame($client->id, $updated->current_client_id);
        $this->assertDatabaseCount('student_client_logs', 1);
    }

    public function test_ignora_client_id_no_update(): void
    {
        $origem = $this->client('Transelec');
        $outro = $this->client('Enel Distribución');
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Pedro Ramírez Silva',
            'rut' => '16.543.210-9',
            'email' => 'pramirez@enel.cl',
            'client_id' => $origem->id,
        ]));

        $updated = app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'Pedro Ramírez Silva',
            'rut' => '16.543.210-9',
            'email' => 'pramirez@enel.cl',
            'client_id' => $outro->id,
        ]));

        $this->assertSame($origem->id, $updated->current_client_id);
        $this->assertDatabaseCount('student_client_logs', 1);
    }

    public function test_rut_de_outro_usuario_vira_erro_de_validacao(): void
    {
        $client = $this->client();
        $student = app(CreateStudentAction::class)->execute(StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '15.234.567-8',
            'email' => 'cperez@subnorte.cl',
            'client_id' => $client->id,
        ]));
        User::factory()->create(['rut' => '12.876.543-K']);

        $this->expectException(ValidationException::class);

        app(UpdateStudentAction::class)->execute($student, StudentData::from([
            'name' => 'Carlos Pérez Muñoz',
            'rut' => '12.876.543-K',
            'email' => 'cperez@subnorte.cl',
        ]));
    }
}
