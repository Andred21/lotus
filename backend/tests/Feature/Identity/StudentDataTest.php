<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\StudentDetailData;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentDataTest extends TestCase
{
    use RefreshDatabase;

    private function client(string $legalName): Client
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    public function test_data_achata_os_campos_do_user_e_o_cliente_atual(): void
    {
        $client = $this->client('Transelec');
        $user = User::factory()->aluno()->create([
            'name' => 'María González Rojas',
            'rut' => '12.876.543-K',
            'email' => 'mgonzalez@transelec.cl',
            'phone' => '+56 9 8765 4321',
        ]);
        $student = Student::create(['user_id' => $user->id, 'current_client_id' => $client->id]);

        $data = StudentData::fromModel($student->fresh(['user', 'currentClient']));

        $this->assertSame('María González Rojas', $data->name);
        $this->assertSame('12.876.543-K', $data->rut);
        $this->assertSame('mgonzalez@transelec.cl', $data->email);
        $this->assertSame('+56 9 8765 4321', $data->phone);
        $this->assertSame($client->id, $data->current_client_id);
        $this->assertSame('Transelec', $data->current_client_name);
        $this->assertSame(0, $data->enrollments_count);
    }

    public function test_data_aceita_aluno_sem_cliente_atual(): void
    {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create(['rut' => '12.876.543-K'])->id,
        ]);

        $data = StudentData::fromModel($student->fresh(['user', 'currentClient']));

        $this->assertNull($data->current_client_id);
        $this->assertNull($data->current_client_name);
    }

    public function test_detail_data_traz_o_historico_de_vinculos_do_mais_recente_ao_mais_antigo(): void
    {
        $antigo = $this->client('Transelec');
        $atual = $this->client('Subestación Norte S.A.');
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create(['rut' => '12.876.543-K'])->id,
            'current_client_id' => $atual->id,
        ]);
        $student->logs()->create(['client_id' => $antigo->id, 'started_on' => '2024-01-01', 'ended_on' => '2025-02-28']);
        $student->logs()->create(['client_id' => $atual->id, 'started_on' => '2025-03-01', 'ended_on' => null]);

        $data = StudentDetailData::fromModel($student->fresh(['user', 'currentClient', 'logs.client', 'enrollments.turma.quote', 'enrollments.turma.course']));

        $this->assertCount(2, $data->links);
        $this->assertSame('Subestación Norte S.A.', $data->links[0]->client_name);
        $this->assertNull($data->links[0]->ended_on);
        $this->assertSame('Transelec', $data->links[1]->client_name);
        $this->assertSame([], $data->turmas);
    }
}
