<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Enums\EnrollmentEmissionState;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Contracts\Database\Query\Builder as BuilderContract;
use Illuminate\Database\Eloquent\Builder;

/**
 * Dono do critério "estado de emissão de uma matrícula" — o único lugar que
 * escreve `status = Emitido` para perguntar se um certificado é vigente.
 *
 * Existe porque o critério tinha cópias que podiam divergir num documento de
 * peso legal: o `CertificateVigenciaResolver` e o `Certificate::scopeEmitidos()`
 * se declaravam "fonte única" cada um, e o `CertificationMetricsQuery` do
 * Dashboard carregava uma terceira (`whereDoesntHave` de qualquer certificado),
 * que tratava a matrícula só com certificado revogado como "já emitida" e a
 * escondia da pendência (achado 0.3 da ficha 48). Agora todos delegam aqui.
 *
 * Três faces, uma regra: o predicado sobre `certificates`
 * ({@see self::whereVigente()}), o escopo sobre `enrollments`
 * ({@see self::whereState()}) e a classificação PHP em lote
 * ({@see self::classify()}); `EnrollmentEmissionStateParityTest` exige que SQL
 * e PHP devolvam os mesmos conjuntos.
 *
 * Validade (`valido_ate`) NÃO entra: "vigente" é só `Emitido`, e um certificado
 * emitido vencido continua bloqueando reemissão e a pendência (spec §3). Quando
 * "vigente" passar a olhar a data, é aqui que muda.
 */
class EmissionStateResolver
{
    /**
     * O único `where status = Emitido` do módulo: restringe `$certificates` aos
     * vigentes. `$table` é o nome (ou alias) com que a query referencia
     * `certificates` — quem usa em subquery com alias passa o dele.
     */
    public static function whereVigente(BuilderContract $certificates, string $table = 'certificates'): void
    {
        $certificates->where("{$table}.status", CertificateStatus::Emitido->value);
    }

    /**
     * Matrículas no estado dado, por `EXISTS` correlacionado em `certificates`
     * (sem `JOIN`, que duplicaria matrícula com mais de um certificado). O
     * `SoftDeletes` de `Enrollment` segue valendo: arquivada fica fora.
     *
     * @param  Builder<Enrollment>  $enrollments
     * @return Builder<Enrollment>
     */
    public static function whereState(Builder $enrollments, EnrollmentEmissionState $state): Builder
    {
        return match ($state) {
            EnrollmentEmissionState::Vigente => self::whereHasVigente($enrollments),
            EnrollmentEmissionState::RevogadoReemissivel => self::whereNotVigente(
                $enrollments->whereExists(self::certificadosDaMatricula($enrollments)),
            ),
            EnrollmentEmissionState::NuncaEmitido => $enrollments->whereNotExists(
                self::certificadosDaMatricula($enrollments),
            ),
        };
    }

    /**
     * Matrículas sem certificado vigente: revogado‑reemissível ∪ nunca emitido.
     *
     * @param  Builder<Enrollment>  $enrollments
     * @return Builder<Enrollment>
     */
    public static function whereNotVigente(Builder $enrollments): Builder
    {
        return $enrollments->whereNotExists(
            self::certificadosDaMatricula($enrollments, apenasVigentes: true),
        );
    }

    /**
     * O estado de cada matrícula dada, por id — uma consulta para o lote. Todo
     * id recebido aparece na saída; sem certificado é `NuncaEmitido`. Deriva só
     * dos certificados, então classifica também a matrícula arquivada (o
     * arquivamento é filtro de quem pergunta, não parte do estado).
     *
     * @param  list<int>  $enrollmentIds
     * @return array<int, EnrollmentEmissionState>
     */
    public function classify(array $enrollmentIds): array
    {
        $porMatricula = Certificate::query()
            ->whereIn('enrollment_id', $enrollmentIds)
            ->get(['enrollment_id', 'status'])
            ->groupBy('enrollment_id');

        $estados = [];
        foreach ($enrollmentIds as $id) {
            $certificados = $porMatricula->get($id);

            $estados[$id] = match (true) {
                $certificados === null => EnrollmentEmissionState::NuncaEmitido,
                $certificados->contains('status', CertificateStatus::Emitido) => EnrollmentEmissionState::Vigente,
                default => EnrollmentEmissionState::RevogadoReemissivel,
            };
        }

        return $estados;
    }

    /**
     * @param  Builder<Enrollment>  $enrollments
     * @return Builder<Enrollment>
     */
    private static function whereHasVigente(Builder $enrollments): Builder
    {
        return $enrollments->whereExists(
            self::certificadosDaMatricula($enrollments, apenasVigentes: true),
        );
    }

    /**
     * Subquery correlacionada: certificados da matrícula de fora.
     *
     * @param  Builder<Enrollment>  $enrollments
     */
    private static function certificadosDaMatricula(Builder $enrollments, bool $apenasVigentes = false): \Closure
    {
        $enrollmentsTable = $enrollments->getModel()->getTable();

        return function ($query) use ($enrollmentsTable, $apenasVigentes): void {
            $query->select('certificates.id')
                ->from('certificates')
                ->whereColumn('certificates.enrollment_id', "{$enrollmentsTable}.id");

            if ($apenasVigentes) {
                self::whereVigente($query);
            }
        };
    }
}
