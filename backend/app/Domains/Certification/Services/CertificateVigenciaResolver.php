<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * O que conta como "certificado VIGENTE de uma matrícula" — num lugar só.
 *
 * A regra tinha três implementações (a porta 3 do `CertificateEligibility`, a
 * face de lista dele e o painel de emissão), todas repetindo
 * `where('status', Emitido)`. Três implementações da mesma regra são três
 * respostas esperando para divergir num documento de peso legal — o mesmo
 * motivo pelo qual o `CertificateTemplateResolver` existe (B1).
 *
 * A divergência aqui é concreta, não hipotética: no dia em que "vigente" passar
 * a significar "emitido **e** dentro do `valido_ate`", as portas mudam e o
 * painel continua exibindo um certificado vencido como atual — a lista
 * prometendo o que o POST recusa. Mudar `vigentes()` muda os três de uma vez.
 */
class CertificateVigenciaResolver
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
     * Só os `enrollment_id` que já têm vigente — o que a face de lista precisa
     * para excluir a matrícula da consulta, sem carregar o documento.
     *
     * @return Collection<int, int>
     */
    public function enrollmentIdsComVigente(): Collection
    {
        return $this->vigentes()->pluck('enrollment_id');
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
        // Fonte única do critério. Revogado não é vigente; "emitido" é o único
        // estado que bloqueia reemissão e o único que o painel exibe.
        return Certificate::query()->where('status', CertificateStatus::Emitido);
    }
}
