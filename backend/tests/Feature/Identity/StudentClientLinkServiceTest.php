<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\LinkOutcome;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentClientLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentClientLinkServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_primeiro_vinculo_abre_log_e_seta_ponteiro(): void
    {
        $student = $this->makeStudent();
        $client = $this->makeClient('A');

        $outcome = (new StudentClientLinkService)->link($student, $client);

        $this->assertSame(LinkOutcome::Linked, $outcome);
        $student->refresh();
        $this->assertSame($client->id, $student->current_client_id);
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
    }

    public function test_mesmo_cliente_e_noop(): void
    {
        $student = $this->makeStudent();
        $client = $this->makeClient('A');
        $service = new StudentClientLinkService;

        $service->link($student, $client);
        $outcome = $service->link($student, $client);

        $this->assertSame(LinkOutcome::AlreadyLinked, $outcome);
        $this->assertSame(1, $student->logs()->count());
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
    }

    public function test_move_fecha_o_antigo_e_deixa_exatamente_um_aberto(): void
    {
        $student = $this->makeStudent();
        $clientA = $this->makeClient('A');
        $clientB = $this->makeClient('B');
        $service = new StudentClientLinkService;

        $service->link($student, $clientA);
        $outcome = $service->link($student, $clientB);

        $this->assertSame(LinkOutcome::Moved, $outcome);
        $student->refresh();
        $this->assertSame($clientB->id, $student->current_client_id);
        // Exatamente 1 vínculo aberto, e é o do cliente B.
        $this->assertSame(1, $student->logs()->whereNull('ended_on')->count());
        $this->assertSame($clientB->id, $student->openLog->client_id);
        // O vínculo antigo (cliente A) foi fechado.
        $this->assertNotNull($student->logs()->where('client_id', $clientA->id)->first()->ended_on);
    }

    private function makeStudent(): Student
    {
        $user = User::factory()->aluno()->create();

        return Student::create(['user_id' => $user->id]);
    }

    private function makeClient(string $suffix): Client
    {
        $user = User::factory()->create(['type' => 'cliente', 'is_active' => false]);

        return Client::create(['user_id' => $user->id, 'legal_name' => "Empresa {$suffix}"]);
    }
}
