<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class StudentModelTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_student_navega_user_client_e_logs(): void
    {
        $studentUser = User::factory()->aluno()->create();
        $student = Student::create(['user_id' => $studentUser->id]);

        $client = $this->makeClientWithUser(['legal_name' => 'Empresa X']);

        $student->update(['current_client_id' => $client->id]);
        $student->logs()->create(['client_id' => $client->id, 'started_on' => '2026-01-01', 'ended_on' => null]);

        $student->refresh();

        $this->assertTrue($student->user->is($studentUser));
        $this->assertTrue($student->currentClient->is($client));
        $this->assertCount(1, $student->logs);
        $this->assertNotNull($student->openLog);
        $this->assertTrue($studentUser->student->is($student));
    }

    public function test_soft_delete_do_student_cascateia_para_o_user(): void
    {
        $studentUser = User::factory()->aluno()->create();
        $student = Student::create(['user_id' => $studentUser->id]);

        $student->delete();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertSoftDeleted('users', ['id' => $studentUser->id]);
    }
}
