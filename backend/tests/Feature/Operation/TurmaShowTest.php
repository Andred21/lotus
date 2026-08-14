<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaShowTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function actingViewer(): User
    {
        Permission::findOrCreate('operation.turma.view', 'web');
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('operation.turma.view');

        return $user;
    }

    public function test_show_projeta_turma_enriquecida(): void
    {
        $clientId = $this->makeClientWithUser(['legal_name' => 'Subestación Norte S.A.'], ['rut' => '77.888.999-4'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 9']);
        $courseId = $this->makeCourse(['name' => 'Trabajos en líneas 220kV', 'workload_hours' => 24])->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 12, 'value_uf' => 30, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $res = $this->actingAs($this->actingViewer())
            ->getJson("/api/turmas/{$turma->id}");

        $res->assertOk()
            ->assertJsonPath('course_name', 'Trabajos en líneas 220kV')
            ->assertJsonPath('client_name', 'Subestación Norte S.A.')
            ->assertJsonPath('enrolled_count', 1)
            ->assertJsonPath('quote_code', "Scap {$budget->id} - Cot 1")
            ->assertJsonPath('budget_code', 'Scap 9')
            ->assertJsonPath('budget_id', $budget->id);
    }

    /**
     * O que se prova aqui é a serialização do redator DESIGNADO, não a
     * designação: `redatores` é um array simples de Data (sem
     * `#[DataCollectionOf]`), e o `WithTransformer` de `photo_url` precisa
     * atravessar esse aninhamento. Se não atravessar, o campo volta com o
     * path cru do bucket em vez da URL assinada (spec §3).
     */
    public function test_show_projeta_email_e_foto_assinada_do_redator(): void
    {
        Storage::fake('s3');

        $clientId = $this->makeClientWithUser([], ['rut' => '11.222.333-4'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 3']);
        $courseId = $this->makeCourse()->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $redatorUser = User::factory()->redator()->create([
            'email' => 'ana.silva@lotus.cl',
            'photo_path' => 'user-photos/9/foto.jpg',
        ]);
        $redator = Redator::create(['user_id' => $redatorUser->id]);
        $turma->redatores()->attach($redator->id);

        $res = $this->actingAs($this->actingViewer())
            ->getJson("/api/turmas/{$turma->id}");

        $res->assertOk()
            ->assertJsonPath('redatores.0.email', 'ana.silva@lotus.cl');

        // URL assinada, não o path cru: é o que o <img> do frontend consome.
        $this->assertStringStartsWith('http', $res->json('redatores.0.photo_url'));
    }
}
