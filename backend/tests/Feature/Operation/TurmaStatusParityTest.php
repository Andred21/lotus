<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Catraca de paridade (spec D4, §4.3): `whereDisplayStatus()` em SQL tem de
 * devolver o MESMO conjunto que a derivação de domínio — `concluida` pelo
 * status, `habilitada` pela `HabilitacaoStatus` da RN-16, `em_andamento` o
 * resto. Cinco turmas: concluída; em andamento com os três documentos; com
 * dois; com nenhum; com os três, um deles arquivado (não conta). Mais a lista
 * de arquivados, onde a leitura é "como estava no instante do arquivamento"
 * (`asOfArchiving`): documento levado pela cascata conta, documento arquivado
 * ANTES do pai não.
 */
class TurmaStatusParityTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    /** O front derivava assim (`turmaStatus.ts`): concluida > habilitada > em_andamento. */
    private function derivada(Turma $turma): TurmaDisplayStatus
    {
        if ($turma->status === TurmaStatus::Concluida) {
            return TurmaDisplayStatus::Concluida;
        }

        return app(TurmaHabilitacaoService::class)->for($turma)->isHabilitada()
            ? TurmaDisplayStatus::Habilitada
            : TurmaDisplayStatus::EmAndamento;
    }

    public function test_lista_ativa_o_sql_casa_com_a_derivacao_de_dominio(): void
    {
        $this->turma(concluida: true, docs: TurmaDocumentType::cases());
        $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $this->turma(concluida: false, docs: [TurmaDocumentType::MANUAL, TurmaDocumentType::PRUEBAS]);
        $this->turma(concluida: false, docs: []);
        $comDocArquivado = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $comDocArquivado->files()->where('type', TurmaDocumentType::EVALUACION_REDATOR->value)->first()->delete();

        $todas = Turma::query()->withListingData()->get();
        $this->assertCount(5, $todas);

        foreach (TurmaDisplayStatus::cases() as $status) {
            $esperado = $todas->filter(fn (Turma $t) => $this->derivada($t) === $status)->pluck('id')->sort()->values()->all();
            $sql = Turma::query()->whereDisplayStatus($status)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value}.");
            $this->assertNotSame([], $esperado, "Fixture sem exemplar de {$status->value}.");
        }
    }

    public function test_lista_arquivada_le_a_documentacao_como_no_instante_do_arquivamento(): void
    {
        // Os três docs vão junto pela cascata: arquivada, continua "habilitada".
        $habilitada = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        // Um doc arquivado ANTES do pai: não volta com ele e não conta.
        $incompleta = $this->turma(concluida: false, docs: TurmaDocumentType::cases());
        $incompleta->files()->where('type', TurmaDocumentType::MANUAL->value)->first()->delete();
        $concluida = $this->turma(concluida: true, docs: TurmaDocumentType::cases());

        foreach ([$habilitada, $incompleta, $concluida] as $turma) {
            $turma->delete();
        }

        $arquivadas = Turma::onlyTrashed()->withArchivedListingData()->get();
        $this->assertCount(3, $arquivadas);

        foreach (TurmaDisplayStatus::cases() as $status) {
            $esperado = $arquivadas->filter(fn (Turma $t) => $this->derivada($t) === $status)->pluck('id')->sort()->values()->all();
            $sql = Turma::onlyTrashed()->whereDisplayStatus($status, asOfArchiving: true)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value} (arquivadas).");
            $this->assertNotSame([], $esperado, "Fixture sem exemplar de {$status->value} (arquivadas).");
        }

        $this->assertSame([$habilitada->id], Turma::onlyTrashed()->whereDisplayStatus(TurmaDisplayStatus::Habilitada, asOfArchiving: true)->pluck('id')->all());
    }

    /** @param  array<TurmaDocumentType>  $docs */
    private function turma(bool $concluida, array $docs): Turma
    {
        $n = ++$this->seq;
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => '1.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => '2.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->redatorUser(['rut' => '3.000.'.str_pad((string) $n, 3, '0', STR_PAD_LEFT).'-0'])
            ->turma(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => 'Santiago']);

        if (! $concluida) {
            $builder->turmaNaoConcluida();
        }

        $turma = $builder->create()->turmaModel();

        foreach ($docs as $type) {
            $turma->files()->create([
                'type' => $type->value, 'path' => 'x.pdf', 'original_name' => 'x.pdf',
                'mime' => 'application/pdf', 'size' => 10,
            ]);
        }

        return $turma;
    }
}
