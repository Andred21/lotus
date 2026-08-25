<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * O HISTÓRICO de certificados de um conjunto de matrículas — revogados
 * inclusive.
 *
 * Irmão do `CertificateVigenciaResolver`, e não substituto dele: aquele
 * responde "esta matrícula tem certificado vigente?" para as portas de emissão
 * e para o painel, e por isso só enxerga `emitido`. Este responde "o que esta
 * matrícula já teve?", que é a pergunta da tela do aluno — esconder revogação
 * num histórico de peso legal é o defeito que a P-15 recusou em 2026-07-27.
 *
 * Uma query para N matrículas. Resolver por matrícula devolveria o N+1 na tela
 * que lista o histórico inteiro de turmas concluídas.
 */
class StudentCertificateHistory
{
    /**
     * @param  list<int>  $enrollmentIds
     * @return Collection<int, StudentCertificateSummary> keyBy `enrollment_id`
     */
    public function forEnrollments(array $enrollmentIds): Collection
    {
        if ($enrollmentIds === []) {
            return new Collection;
        }

        $hoje = CertificateDisplayStatus::hoje();

        return Certificate::query()
            ->whereIn('enrollment_id', $enrollmentIds)
            // Do mais novo para o mais velho, com `id` desempatando: dois
            // certificados criados no mesmo segundo (lote) sairiam em ordem
            // indefinida, e "o revogado mais recente" viraria sorteio.
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->groupBy('enrollment_id')
            ->map(fn (Collection $doEnrollment) => $this->resumir($doEnrollment, $hoje));
    }

    /** @param  Collection<int, Certificate>  $certificados */
    private function resumir(Collection $certificados, CarbonInterface $hoje): StudentCertificateSummary
    {
        // O ATUAL é o emitido — no máximo um existe, porque a porta 3 do
        // `CertificateEligibility` recusa a segunda emissão enquanto houver
        // vigente. Sem nenhum emitido, o atual é o revogado mais recente, que
        // é o primeiro da coleção já ordenada.
        $atual = $certificados->firstWhere('status', CertificateStatus::Emitido)
            ?? $certificados->first();

        // Lido UMA vez: o cast tem `withoutObjectCaching`, então cada acesso à
        // propriedade decodifica o JSON e remonta a árvore de DTOs de novo.
        $snapshot = $atual->snapshot;

        return new StudentCertificateSummary(
            id: $atual->id,
            codigo: $atual->codigo,
            displayStatus: CertificateDisplayStatus::for($atual->status, $atual->valido_ate, $hoje),
            validoAte: $atual->valido_ate?->toDateString(),
            snapshotOk: $snapshot->isPresentable(),
            supersededCount: $certificados->count() - 1,
        );
    }
}
