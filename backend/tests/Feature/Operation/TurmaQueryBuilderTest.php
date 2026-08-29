<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaQueryBuilderTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_with_listing_data_carrega_relacoes_e_conta_matriculas(): void
    {
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $courseId = $this->makeCourse(['name' => 'AT 220kV', 'workload_hours' => 8])->id;
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $studentId = User::factory()->create(['type' => 'aluno', 'is_active' => false])
            ->student()->create()->id;
        Enrollment::create(['turma_id' => $turma->id, 'student_id' => $studentId, 'approval_status' => 'pendiente']);

        $this->assertInstanceOf(TurmaQueryBuilder::class, Turma::query());

        $loaded = Turma::query()->withListingData()->findOrFail($turma->id);

        $this->assertTrue($loaded->relationLoaded('course'));
        $this->assertTrue($loaded->relationLoaded('quote'));
        $this->assertSame('AT 220kV', $loaded->course->name);
        $this->assertSame('ACME', $loaded->quote->budget->client->legal_name);
        $this->assertSame(1, (int) $loaded->enrollments_count);
    }

    private int $seq = 0;

    /**
     * Cadeia comercial completa e distinta das demais (`users.rut` é `unique`),
     * com os tipos de documento que o teste mandar.
     *
     * @param  array<TurmaDocumentType>  $docs
     */
    private function makeTurmaComDocs(array $docs): Turma
    {
        $n = ++$this->seq;
        $client = $this->makeClientWithUser(
            ['legal_name' => "Empresa Legal {$n} SpA"],
            ['name' => "Empresa Cliente {$n}", 'rut' => '1.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => "Scap {$n}"]);
        $course = $this->makeCourse(['name' => "Curso {$n}"]);
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);

        foreach ($docs as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }

        return $turma;
    }

    /**
     * O 2N+1 que este bloco matou: a documentação obrigatória custava uma query
     * por turma (duas, nas em andamento — `habilitada` perguntava e
     * `missing_document_types` perguntava de novo). Contagem, e não
     * `preventLazyLoading`: aquilo não enxerga query FEITA NA relação, que era
     * a forma antiga, e é por isso que o `ContratanteEagerLoadTest` passava com
     * o defeito vivo.
     *
     * As duas turmas têm documentação DIFERENTE de propósito: uma query só para
     * as duas ainda tem de devolver a resposta certa para cada uma.
     *
     * O que esta guarda NÃO pega, e não tem como: chamar `for()` duas vezes de
     * novo no `fromModel`. Com a relação carregada, a segunda leitura é de
     * memória e não custa query nenhuma — a classe de defeito deixou de
     * existir, em vez de passar a ser vigiada.
     */
    public function test_listagem_pergunta_a_documentacao_uma_vez_para_todas_as_turmas(): void
    {
        $this->actingAsAdmin();
        $completa = $this->makeTurmaComDocs(TurmaDocumentType::cases());
        $incompleta = $this->makeTurmaComDocs([TurmaDocumentType::MANUAL]);

        $consultas = 0;
        DB::listen(function (QueryExecuted $query) use (&$consultas): void {
            if (str_contains($query->sql, 'from "files"')) {
                $consultas++;
            }
        });

        $res = $this->getJson('/api/turmas')->assertOk()->assertJsonCount(2, 'data');

        $this->assertSame(1, $consultas);

        $linhas = collect($res->json('data'));
        $this->assertTrue($linhas->firstWhere('id', $completa->id)['habilitada']);
        $this->assertSame([], $linhas->firstWhere('id', $completa->id)['missing_document_types']);
        $this->assertFalse($linhas->firstWhere('id', $incompleta->id)['habilitada']);
        $this->assertSame(
            ['PRUEBAS', 'EVALUACION_REDATOR'],
            $linhas->firstWhere('id', $incompleta->id)['missing_document_types'],
        );
    }
}
