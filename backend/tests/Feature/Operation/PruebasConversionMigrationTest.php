<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O tipo `PRUEBAS` da turma deixou de existir: virou `EVALUACION_ALUNO`. A
 * conversão passa pelo model, instância a instância, porque `files.type` é dado
 * com peso legal e só o Eloquent o audita (ADR-08). O `type='PRUEBAS'` de um
 * arquivo de REDATOR é outro vocabulário e não pode ser tocado.
 */
class PruebasConversionMigrationTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function migration(): object
    {
        return require base_path('database/migrations/2026_11_22_000002_converte_pruebas_em_evaluacion_aluno.php');
    }

    private function turma(): Turma
    {
        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);
    }

    /** @return array<string, mixed> */
    private function linha(string $type): array
    {
        return [
            'type' => $type, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
            'mime' => 'application/pdf', 'size' => 10,
        ];
    }

    private function auditsDe(File $file): int
    {
        return DB::table('audits')
            ->where('auditable_type', $file->getMorphClass())
            ->where('auditable_id', $file->id)
            ->where('event', 'updated')
            ->count();
    }

    public function test_converte_o_pruebas_ativo_e_o_soft_deletado_da_turma(): void
    {
        $turma = $this->turma();
        $ativo = $turma->files()->create($this->linha('PRUEBAS'));
        $arquivado = $turma->files()->create($this->linha('PRUEBAS'));
        $arquivado->delete();
        $manual = $turma->files()->create($this->linha('MANUAL'));

        $this->migration()->up();

        $this->assertSame('EVALUACION_ALUNO', $ativo->fresh()->type);
        $this->assertSame('EVALUACION_ALUNO', File::withTrashed()->find($arquivado->id)->type);
        $this->assertSame('MANUAL', $manual->fresh()->type);
    }

    public function test_cada_conversao_deixa_linha_em_audits(): void
    {
        $turma = $this->turma();
        $ativo = $turma->files()->create($this->linha('PRUEBAS'));
        $arquivado = $turma->files()->create($this->linha('PRUEBAS'));
        $arquivado->delete();
        $antes = [$this->auditsDe($ativo), $this->auditsDe($arquivado)];

        $this->migration()->up();

        $this->assertSame($antes[0] + 1, $this->auditsDe($ativo));
        $this->assertSame($antes[1] + 1, $this->auditsDe($arquivado));
    }

    public function test_rodar_de_novo_nao_gera_audit_novo(): void
    {
        $turma = $this->turma();
        $turma->files()->create($this->linha('PRUEBAS'));
        $this->migration()->up();
        $audits = DB::table('audits')->count();

        $this->migration()->up();

        $this->assertSame($audits, DB::table('audits')->count());
    }

    public function test_nao_toca_o_pruebas_de_arquivo_de_redator(): void
    {
        $redator = User::factory()->redator()->create()->redator()->create([]);
        $doDoRedator = $redator->documents()->create($this->linha('PRUEBAS'));
        $audits = DB::table('audits')->count();

        $this->migration()->up();

        $this->assertSame('PRUEBAS', $doDoRedator->fresh()->type);
        $this->assertSame($audits, DB::table('audits')->count());
    }
}
