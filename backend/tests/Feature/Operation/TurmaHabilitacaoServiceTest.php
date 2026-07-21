<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaHabilitacaoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private TurmaHabilitacaoService $service;

    protected function setUp(): void
    {
        parent::setUp();
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
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->service = app(TurmaHabilitacaoService::class);
    }

    private function addDoc(TurmaDocumentType $type): File
    {
        return $this->turma->files()->create([
            'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
            'mime' => 'application/pdf', 'size' => 10,
        ]);
    }

    public function test_sem_docs_lista_os_3_tipos_faltantes(): void
    {
        $this->assertFalse($this->service->isHabilitada($this->turma));
        $this->assertSame(
            ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'],
            $this->service->missingTypes($this->turma),
        );
    }

    public function test_doc_parcial_lista_so_o_que_falta(): void
    {
        $this->addDoc(TurmaDocumentType::MANUAL);
        $this->addDoc(TurmaDocumentType::PRUEBAS);

        $this->assertFalse($this->service->isHabilitada($this->turma));
        $this->assertSame(['EVALUACION_REDATOR'], $this->service->missingTypes($this->turma));
    }

    public function test_3_tipos_presentes_habilita(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }

        $this->assertTrue($this->service->isHabilitada($this->turma));
        $this->assertSame([], $this->service->missingTypes($this->turma));
    }

    public function test_doc_soft_deletada_nao_conta(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->files()->where('type', TurmaDocumentType::MANUAL->value)
            ->get()->each(fn (File $f) => $f->delete());   // lição #5: por instância

        $this->assertFalse($this->service->isHabilitada($this->turma->fresh()));
        $this->assertSame(['MANUAL'], $this->service->missingTypes($this->turma->fresh()));
    }

    public function test_turma_concluida_nao_e_habilitada(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        $this->assertFalse($this->service->isHabilitada($this->turma->fresh()));
    }
}
