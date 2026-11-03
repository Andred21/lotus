<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Operation\Services\ResultLock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * A face de `Certificate` do critério "certificado VIGENTE de uma matrícula":
 * indexação por matrícula e lock para a porta 3 do `CertificateEligibility`, o
 * painel de emissão e o `ResultLock`.
 *
 * O critério em si NÃO mora aqui: o dono é o `EmissionStateResolver` (bloco 48),
 * cujo `whereVigente()` esta classe, o `Certificate::scopeEmitidos()` e a
 * pendência do Dashboard aplicam. Mudar "vigente" — por exemplo, para "emitido
 * **e** dentro do `valido_ate`" — é mudar `EmissionStateResolver::whereVigente()`;
 * mexer só em `vigentes()` reabriria a divergência entre a lista e o POST num
 * documento de peso legal, o mesmo motivo pelo qual o `EmissionCityResolver`
 * existe (B1).
 *
 * Até o bloco 48 esta classe se dizia a fonte única da regra, que tinha três
 * implementações repetindo `where('status', Emitido)`; o Dashboard mantinha a
 * sua cópia fora dela.
 */
class CertificateVigenciaResolver implements ResultLock
{
    /**
     * Os certificados vigentes das matrículas dadas, indexados por
     * `enrollment_id`. Uma consulta só para a página inteira: resolver por
     * turma (ou por matrícula) devolve o N+1 na tela que lista o histórico
     * inteiro de turmas concluídas.
     *
     * @param  list<int>  $enrollmentIds
     * @return Collection<int, Certificate> keyBy `enrollment_id`
     */
    public function byEnrollment(array $enrollmentIds): Collection
    {
        return $this->vigentes()
            ->whereIn('enrollment_id', $enrollmentIds)
            ->get()
            ->keyBy('enrollment_id');
    }

    /**
     * `ResultLock`: das matrículas dadas, as que têm certificado vigente. Uma
     * consulta só, sem repetição (a matrícula tem no máximo um vigente, mas o
     * `array_values(array_unique(...))` não confia nisso).
     *
     * @param  list<int>  $enrollmentIds
     * @return list<int>
     */
    public function lockedAmong(array $enrollmentIds): array
    {
        if ($enrollmentIds === []) {
            return [];
        }

        return $this->vigentes()
            ->whereIn('enrollment_id', $enrollmentIds)
            ->pluck('enrollment_id')
            ->unique()
            ->values()
            ->all();
    }

    /** `ResultLock`: a correção do resultado lê a vigência pela mesma porta da emissão. */
    public function isLockedForUpdate(int $enrollmentId): bool
    {
        return $this->existeVigenteForUpdate($enrollmentId);
    }

    /**
     * A mesma pergunta, travando a linha: só faz sentido DENTRO da transação da
     * emissão (porta 3). Fora de transação o `lockForUpdate` não vale nada e
     * duas emissões concorrentes passariam as duas.
     */
    public function existeVigenteForUpdate(int $enrollmentId): bool
    {
        return $this->vigentes()
            ->where('enrollment_id', $enrollmentId)
            ->lockForUpdate()
            ->exists();
    }

    /** @return Builder<Certificate> */
    private function vigentes(): Builder
    {
        // O critério mora no `EmissionStateResolver`: revogado não é vigente;
        // "emitido" é o único estado que bloqueia reemissão e o único que o
        // painel exibe. Esta classe só o aplica à query de `Certificate`.
        $query = Certificate::query();
        EmissionStateResolver::whereVigente($query);

        return $query;
    }
}
