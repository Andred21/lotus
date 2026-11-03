<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaDocumentActionsTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    /** Usuário com a role semeada de verdade — a permissão sai do seeder, não de um mock. */
    private function actor(string $role): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => $role === 'redator' ? 'redator' : 'admin', 'is_active' => true]);
        $user->assignRole($role);

        return $user;
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    public function test_store_grava_file_do_tipo_e_e_append(): void
    {
        $action = app(StoreTurmaDocumentAction::class);
        $redator = $this->actor('redator');

        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf(), $redator);
        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf(), $redator);

        // D8: N por tipo — o 2º upload NÃO substitui o 1º.
        $this->assertSame(2, $this->turma->files()->where('type', 'PRUEBAS')->count());
    }

    public function test_delete_e_soft_e_por_instancia(): void
    {
        $redator = $this->actor('redator');
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf(), $redator);

        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file, $redator);

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        // lição #5: delete por instância dispara evento → owen-it audita.
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $file->id, 'event' => 'deleted',
        ]);
    }

    public function test_store_pos_conclusao_recusa_quem_nao_tem_a_permissao(): void
    {
        $redator = $this->actor('redator');
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        try {
            app(StoreTurmaDocumentAction::class)
                ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf(), $redator);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame([__('operation.turma.concluded_locked')], $e->errors()['turma']);
        }

        $this->assertSame(0, $this->turma->files()->count());
    }

    public function test_delete_pos_conclusao_recusa_quem_nao_tem_a_permissao(): void
    {
        $redator = $this->actor('redator');
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf(), $redator);
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        try {
            app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file, $redator);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame([__('operation.turma.concluded_locked')], $e->errors()['turma']);
        }

        $this->assertNotSoftDeleted('files', ['id' => $file->id]);
    }

    public function test_superadmin_sobe_e_remove_pos_conclusao(): void
    {
        $superadmin = $this->actor('superadmin');
        $this->turma->update(['status' => TurmaStatus::Concluida]);

        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf(), $superadmin);

        $this->assertDatabaseHas('files', ['id' => $file->id, 'type' => 'MANUAL']);
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $file->id, 'event' => 'created',
        ]);

        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file, $superadmin);

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $file->id, 'event' => 'deleted',
        ]);
    }
}
