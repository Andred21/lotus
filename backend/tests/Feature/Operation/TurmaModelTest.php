<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaModelTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeApprovedQuote(): Quote
    {
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = $this->makeCourse()->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
    }

    public function test_cria_turma_com_casts_e_relacoes(): void
    {
        $quote = $this->makeApprovedQuote();

        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        $fresh = $turma->fresh();
        $this->assertInstanceOf(TurmaModalidade::class, $fresh->modalidade);
        $this->assertSame(TurmaStatus::EmAndamento, $fresh->status);
        $this->assertSame($quote->id, $fresh->quote->id);
        $this->assertSame($quote->course_id, $fresh->course->id);
        $this->assertSame($turma->id, $quote->fresh()->turma->id);
    }

    public function test_pivot_turma_redator_associa_redator(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
        $redator = Redator::create(['user_id' => User::factory()->redator()->create()->id]);

        $turma->redatores()->attach($redator->id);

        $this->assertDatabaseHas('turma_redator', ['turma_id' => $turma->id, 'redator_id' => $redator->id]);
        $this->assertSame(1, $turma->redatores()->count());
    }

    public function test_concluded_at_nasce_nulo_e_casta_datetime(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        $this->assertNull($turma->fresh()->concluded_at);

        $turma->concluded_at = now();
        $turma->save();

        $this->assertInstanceOf(Carbon::class, $turma->fresh()->concluded_at);
    }

    public function test_quote_id_unico_bloqueia_segunda_turma(): void
    {
        $quote = $this->makeApprovedQuote();
        Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        $this->expectException(QueryException::class);

        Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
        ]);
    }

    public function test_documentacao_obrigatoria_filtra_tipo_fora_do_enum_e_doc_arquivada(): void
    {
        $quote = $this->makeApprovedQuote();
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $quote->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        foreach (TurmaDocumentType::cases() as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }
        // Tipo livre na `files` polimórfica: NÃO é documentação obrigatória da turma.
        $turma->files()->create([
            'type' => 'OTRO', 'path' => 'y.pdf', 'original_name' => 'y.pdf',
            'mime' => 'application/pdf', 'size' => 10,
        ]);
        $turma->files()->where('type', TurmaDocumentType::PRUEBAS->value)
            ->get()->each(fn ($f) => $f->delete());   // lição 5: por instância

        $tipos = $turma->documentacaoObrigatoria()->pluck('type')->all();

        sort($tipos);
        $this->assertSame(['EVALUACION_REDATOR', 'MANUAL'], $tipos);
    }
}
