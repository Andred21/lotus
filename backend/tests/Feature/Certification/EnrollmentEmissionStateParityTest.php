<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Enums\EnrollmentEmissionState;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\EmissionStateResolver;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Support\Rut;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Catraca de paridade (spec D3, molde `CertificateDisplayStatusParityTest`): o
 * escopo SQL `EmissionStateResolver::whereState()` e a classificação PHP
 * `classify()` têm de devolver os MESMOS conjuntos de matrículas — duas
 * leituras do mesmo critério num documento de peso legal é o que este teste
 * impede de divergir.
 *
 * Uma matrícula por linha: (a) sem certificado; (b) um revogado; (c) dois
 * revogados; (d) revogado + emitido; (e) um emitido; (f) reprovada com um
 * revogado; (g) arquivada com um emitido.
 */
class EnrollmentEmissionStateParityTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    private int $codigoSeq = 0;

    /** @var array<string, Enrollment> */
    private array $m = [];

    /** @var array<int, int> enrollment_id => redator_id da cadeia dela */
    private array $redatorDe = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->m['a'] = $this->matricula();

        $this->m['b'] = $this->matricula();
        $this->certificar($this->m['b'], CertificateStatus::Revocado);

        $this->m['c'] = $this->matricula();
        $this->certificar($this->m['c'], CertificateStatus::Revocado);
        $this->certificar($this->m['c'], CertificateStatus::Revocado);

        $this->m['d'] = $this->matricula();
        $this->certificar($this->m['d'], CertificateStatus::Revocado);
        $this->certificar($this->m['d'], CertificateStatus::Emitido);

        $this->m['e'] = $this->matricula();
        $this->certificar($this->m['e'], CertificateStatus::Emitido);

        $this->m['f'] = $this->matricula();
        $this->m['f']->update(['approval_status' => EnrollmentApprovalStatus::Reprobado]);
        $this->certificar($this->m['f'], CertificateStatus::Revocado);

        $this->m['g'] = $this->matricula();
        $this->certificar($this->m['g'], CertificateStatus::Emitido);
        $this->m['g']->delete();
    }

    public function test_escopo_sql_e_classificacao_php_devolvem_os_mesmos_conjuntos(): void
    {
        $naoArquivadas = $this->ids('a', 'b', 'c', 'd', 'e', 'f');
        $classificacao = app(EmissionStateResolver::class)->classify($naoArquivadas);

        $esperado = [
            EnrollmentEmissionState::NuncaEmitido->value => $this->ids('a'),
            EnrollmentEmissionState::RevogadoReemissivel->value => $this->ids('b', 'c', 'f'),
            EnrollmentEmissionState::Vigente->value => $this->ids('d', 'e'),
        ];

        foreach (EnrollmentEmissionState::cases() as $estado) {
            $sql = EmissionStateResolver::whereState(Enrollment::query(), $estado)
                ->pluck('id')->sort()->values()->all();
            $php = collect($classificacao)
                ->filter(fn (EnrollmentEmissionState $s) => $s === $estado)
                ->keys()->sort()->values()->all();

            $this->assertSame($esperado[$estado->value], $sql, "SQL: {$estado->value}");
            $this->assertSame($esperado[$estado->value], $php, "PHP: {$estado->value}");
        }
    }

    public function test_nao_vigente_e_a_uniao_de_revogado_e_nunca_emitido(): void
    {
        $ids = EmissionStateResolver::whereNotVigente(Enrollment::query())
            ->pluck('id')->sort()->values()->all();

        $this->assertSame($this->ids('a', 'b', 'c', 'f'), $ids);
    }

    public function test_arquivada_fica_fora_do_escopo_e_classifica_pelos_certificados(): void
    {
        $g = $this->m['g']->id;

        foreach (EnrollmentEmissionState::cases() as $estado) {
            $this->assertNotContains(
                $g,
                EmissionStateResolver::whereState(Enrollment::query(), $estado)->pluck('id')->all(),
                "arquivada vazou em {$estado->value}",
            );
        }

        $this->assertSame(
            [$g => EnrollmentEmissionState::Vigente],
            app(EmissionStateResolver::class)->classify([$g]),
        );
    }

    public function test_where_vigente_qualifica_a_tabela(): void
    {
        $query = Certificate::query()->from('certificates as c');
        EmissionStateResolver::whereVigente($query, 'c');

        // d, e e g: o predicado é sobre certificados e não filtra matrícula arquivada.
        $this->assertSame(3, $query->count());
    }

    /** @return list<int> */
    private function ids(string ...$chaves): array
    {
        $ids = array_map(fn (string $k) => $this->m[$k]->id, $chaves);
        sort($ids);

        return $ids;
    }

    private function matricula(): Enrollment
    {
        $n = ++$this->seq;

        $cadeia = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => $this->rut(70000000 + $n)])
            ->course(['name' => "Curso {$n}"])
            ->student(['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)])
            ->redatorUser(['rut' => $this->rut(15000000 + $n)])
            ->create();

        $matricula = $cadeia->enrollmentModel();
        $this->redatorDe[$matricula->id] = $cadeia->redatorModel()->id;

        return $matricula;
    }

    private function certificar(Enrollment $matricula, CertificateStatus $status): Certificate
    {
        $n = ++$this->codigoSeq;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $matricula->id,
            'course_id' => $matricula->turma->course_id,
            'redator_id' => $this->redatorDe[$matricula->id],
            'codigo' => 'LOT-2026-'.str_pad((string) (2000 + $n), 4, '0', STR_PAD_LEFT),
            'snapshot' => [
                'schema_version' => 2,
                'aluno' => ['name' => 'Alumno', 'rut' => '1-9'],
                'curso' => ['name' => 'Curso'],
                'emissor' => ['name' => 'Lotus'],
            ],
            'valido_ate' => null,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'teste' : null,
        ]);
    }

    /** RUT válido (módulo 11) a partir do número — nunca DV hardcoded. */
    private function rut(int $numero): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidato = Rut::parse($numero.$dv);
            if ($candidato->isValid()) {
                return $candidato->format();
            }
        }

        throw new \RuntimeException("Sem DV válido para {$numero}.");
    }
}
