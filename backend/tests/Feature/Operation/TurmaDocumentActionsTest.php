<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TurmaDocumentActionsTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    public function test_store_grava_file_do_tipo_e_e_append(): void
    {
        $action = app(StoreTurmaDocumentAction::class);

        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf());
        $action->execute($this->turma, TurmaDocumentType::PRUEBAS, $this->pdf());

        // D8: N por tipo — o 2º upload NÃO substitui o 1º.
        $this->assertSame(2, $this->turma->files()->where('type', 'PRUEBAS')->count());
    }

    public function test_delete_e_soft_e_por_instancia(): void
    {
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());

        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file);

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        // lição #5: delete por instância dispara evento → owen-it audita.
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file', 'auditable_id' => $file->id, 'event' => 'deleted',
        ]);
    }

    public function test_rn15_store_bloqueado_pos_conclusao(): void
    {
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->expectException(ValidationException::class);
        app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());
    }

    public function test_rn15_delete_bloqueado_pos_conclusao(): void
    {
        $file = app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf());
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->expectException(ValidationException::class);
        app(DeleteTurmaDocumentAction::class)->execute($this->turma, $file);
    }
}
