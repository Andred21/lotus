<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaHabilitacaoServiceTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private TurmaHabilitacaoService $service;

    protected function setUp(): void
    {
        parent::setUp();
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

    public function test_missing_types_devolve_casos_do_enum_e_nao_strings(): void
    {
        $missing = $this->service->for($this->turma)->missingTypes();

        $this->assertCount(3, $missing);
        $this->assertContainsOnlyInstancesOf(TurmaDocumentType::class, $missing);
        $this->assertSame(
            [TurmaDocumentType::MANUAL, TurmaDocumentType::PRUEBAS, TurmaDocumentType::EVALUACION_REDATOR],
            $missing,
        );
    }

    public function test_sem_docs_lista_os_3_tipos_faltantes(): void
    {
        $status = $this->service->for($this->turma);

        $this->assertFalse($status->isHabilitada());
        $this->assertSame(
            [TurmaDocumentType::MANUAL, TurmaDocumentType::PRUEBAS, TurmaDocumentType::EVALUACION_REDATOR],
            $status->missingTypes(),
        );
    }

    public function test_doc_parcial_lista_so_o_que_falta(): void
    {
        $this->addDoc(TurmaDocumentType::MANUAL);
        $this->addDoc(TurmaDocumentType::PRUEBAS);

        $status = $this->service->for($this->turma);

        $this->assertFalse($status->isHabilitada());
        $this->assertSame([TurmaDocumentType::EVALUACION_REDATOR], $status->missingTypes());
    }

    public function test_3_tipos_presentes_habilita(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }

        $status = $this->service->for($this->turma);

        $this->assertTrue($status->isHabilitada());
        $this->assertSame([], $status->missingTypes());
    }

    public function test_doc_soft_deletada_nao_conta(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->files()->where('type', TurmaDocumentType::MANUAL->value)
            ->get()->each(fn (File $f) => $f->delete());   // lição #5: por instância

        $status = $this->service->for($this->turma->fresh());

        $this->assertFalse($status->isHabilitada());
        $this->assertSame([TurmaDocumentType::MANUAL], $status->missingTypes());
    }

    public function test_turma_concluida_nao_e_habilitada(): void
    {
        foreach (TurmaDocumentType::cases() as $type) {
            $this->addDoc($type);
        }
        $this->turma->status = TurmaStatus::Concluida;
        $this->turma->save();

        // D-B1: documentação completa NÃO habilita turma concluída. Esta é a
        // guarda que trava o gate de status dentro do VO — se ele sair de lá,
        // este teste reprova.
        $this->assertFalse($this->service->for($this->turma->fresh())->isHabilitada());
    }
}
