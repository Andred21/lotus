<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentClientLogConstraintTest extends TestCase
{
    use RefreshDatabase;

    public function test_banco_rejeita_segundo_vinculo_aberto_do_mesmo_aluno(): void
    {
        [$studentId, $clientId] = $this->makeStudentAndClient();

        DB::table('student_client_logs')->insert([
            'student_id' => $studentId,
            'client_id' => $clientId,
            'started_on' => '2026-01-01',
            'ended_on' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        DB::table('student_client_logs')->insert([
            'student_id' => $studentId,
            'client_id' => $clientId,
            'started_on' => '2026-02-01',
            'ended_on' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_permite_multiplos_vinculos_fechados(): void
    {
        [$studentId, $clientId] = $this->makeStudentAndClient();

        DB::table('student_client_logs')->insert([
            ['student_id' => $studentId, 'client_id' => $clientId, 'started_on' => '2026-01-01', 'ended_on' => '2026-01-31', 'created_at' => now(), 'updated_at' => now()],
            ['student_id' => $studentId, 'client_id' => $clientId, 'started_on' => '2026-02-01', 'ended_on' => '2026-02-28', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->assertSame(2, DB::table('student_client_logs')->where('student_id', $studentId)->count());
    }

    /** @return array{0:int,1:int} */
    private function makeStudentAndClient(): array
    {
        $studentUser = User::factory()->create(['type' => 'aluno', 'is_active' => false]);
        $studentId = DB::table('students')->insertGetId([
            'user_id' => $studentUser->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $clientUser = User::factory()->create(['type' => 'cliente', 'is_active' => false]);
        $client = Client::create(['user_id' => $clientUser->id, 'legal_name' => 'Empresa X']);

        return [$studentId, $client->id];
    }
}
