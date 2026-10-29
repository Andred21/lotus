<?php

namespace App\Domains\Certification\Services;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Validation\ValidationException;

/**
 * Quem pode receber certificado — as CINCO portas, num lugar só. A DECISÃO mora
 * aqui; a tela de emissão não decide nada: o `EmissionPanelQuery` REPORTA os
 * mesmos motivos, pelos mesmos colaboradores (`EmissionCityResolver`,
 * `CertificateVigenciaResolver`), e é a
 * `CertificateEligibilityTest` que prova que o que o painel apresenta como
 * emissível passa por estas portas. Divergência entre lista e POST é a classe
 * de bug que este serviço existe para matar — **a lista promete um certificado
 * que o POST recusa com 422**, já aconteceu duas vezes (A-2 e D-P8), e é
 * documento de peso legal.
 *
 * 1. turma concluída (RN-08)
 * 2. matrícula aprovada
 * 3. sem certificado vigente para a matrícula
 * 4. cidade do emissor configurada (a frase do certificado só usa ela — D9 do
 *    bloco 40; o `local_aplicacao` deixou de abrir esta porta)
 * 5. redator designado na turma — AQUELE que a emissão recebeu (D11)
 */
class CertificateEligibility
{
    public function __construct(
        private readonly EmissionCityResolver $cities,
        private readonly CertificateVigenciaResolver $vigencia,
    ) {}

    /**
     * Estoura 422 na primeira porta fechada e devolve o contexto já resolvido.
     * Roda dentro da transação da Action: a porta 3 usa `lockForUpdate`, e fora
     * de transação o lock não vale nada.
     */
    public function assert(Enrollment $enrollment, Redator $redator): IssuanceContext
    {
        $turma = $enrollment->turma;

        $this->assertTurmaConcluida($turma);
        $this->assertMatriculaAprovada($enrollment);
        $this->assertSemCertificadoVigente($enrollment);
        $ciudad = $this->assertCidadeDeEmissao($turma);
        $this->assertRedatorDesignado($turma, $redator);

        return new IssuanceContext($turma, $ciudad);
    }

    // ── PORTA 1 — turma concluída (RN-08) ────────────────────────────────

    private function assertTurmaConcluida(Turma $turma): void
    {
        if ($turma->status !== TurmaStatus::Concluida) {
            $this->refuse('turma', __('certification.eligibility.turma_not_concluded'));
        }
    }

    // ── PORTA 2 — matrícula aprovada ─────────────────────────────────────

    private function assertMatriculaAprovada(Enrollment $enrollment): void
    {
        if ($enrollment->approval_status !== EnrollmentApprovalStatus::Aprobado) {
            $this->refuse('enrollment', __('certification.eligibility.enrollment_not_approved'));
        }
    }

    // ── PORTA 3 — sem certificado vigente ────────────────────────────────

    private function assertSemCertificadoVigente(Enrollment $enrollment): void
    {
        // O critério de "vigente" é do `CertificateVigenciaResolver`, não daqui:
        // a mesma regra vale para esta porta e para o painel de emissão.
        if ($this->vigencia->existeVigenteForUpdate($enrollment->id)) {
            $this->refuse('enrollment', __('certification.eligibility.certificate_already_active'));
        }
    }

    // ── PORTA 4 — cidade de emissão válida ───────────────────────────────

    private function assertCidadeDeEmissao(Turma $turma): string
    {
        // A porta olha SÓ a cidade do emissor (D9): é ela que o PDF imprime. O
        // `emissionCityFor()` segue alimentando o `ciudad_emision` do snapshot
        // (D12), mas já não decide se a emissão acontece.
        $emissor = $this->cities->issuerCity();

        if ($emissor === null) {
            $this->refuse('turma', __('certification.eligibility.emission_city_missing'));
        }

        return $this->cities->emissionCityFor($turma) ?? $emissor;
    }

    // ── PORTA 5 — redator designado ──────────────────────────────────────

    private function assertRedatorDesignado(Turma $turma, Redator $redator): void
    {
        if (! $turma->redatores()->whereKey($redator->id)->exists()) {
            $this->refuse('redator_id', __('certification.eligibility.redator_not_designated'));
        }
    }

    /**
     * As cinco portas recusam pela MESMA saída, e a frase sempre sai de `lang/`.
     *
     * O `withMessages` daqui recebe variáveis (`[$field => $message]`), então o
     * detector de `MensagemLiteralTest` não enxergava a frase — ela mora no
     * chamador, seis linhas acima, longe da janela dele. Foi por essa fresta
     * que as recusas ficaram literais em es-CL depois de o bloco de i18n
     * traduzir as outras 41 (Q-7 do review de 2026-09-03). A catraca agora
     * segue encaminhador: helper que repassa para `withMessages` é porta de
     * mensagem, e frase literal no chamador dele reprova igual.
     */
    private function refuse(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
