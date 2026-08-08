<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Validation\ValidationException;

/**
 * Quem pode receber certificado — as SEIS portas, num lugar só. A DECISÃO mora
 * aqui; a tela de emissão não decide nada: o `EmissionPanelQuery` REPORTA os
 * mesmos motivos, pelos mesmos colaboradores (`CertificateTemplateResolver`,
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
 * 4. curso com template de certificado disponível
 * 5. template/turma com cidade de emissão válida
 * 6. redator designado na turma — AQUELE que a emissão recebeu (D11)
 */
class CertificateEligibility
{
    public function __construct(
        private readonly CertificateTemplateResolver $templates,
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
        $template = $this->assertTemplateDisponivel($turma);
        $ciudad = $this->assertCidadeDeEmissao($turma, $template);
        $this->assertRedatorDesignado($turma, $redator);

        return new IssuanceContext($turma, $template, $ciudad);
    }

    // ── PORTA 1 — turma concluída (RN-08) ────────────────────────────────

    private function assertTurmaConcluida(Turma $turma): void
    {
        if ($turma->status !== TurmaStatus::Concluida) {
            $this->refuse('turma', 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).');
        }
    }

    // ── PORTA 2 — matrícula aprovada ─────────────────────────────────────

    private function assertMatriculaAprovada(Enrollment $enrollment): void
    {
        if ($enrollment->approval_status !== EnrollmentApprovalStatus::Aprobado) {
            $this->refuse('enrollment', 'El alumno no fue aprobado: no se puede emitir el certificado.');
        }
    }

    // ── PORTA 3 — sem certificado vigente ────────────────────────────────

    private function assertSemCertificadoVigente(Enrollment $enrollment): void
    {
        // O critério de "vigente" é do `CertificateVigenciaResolver`, não daqui:
        // a mesma regra vale para esta porta e para o painel de emissão.
        if ($this->vigencia->existeVigenteForUpdate($enrollment->id)) {
            $this->refuse('enrollment', 'Ya existe un certificado vigente para esta matrícula.');
        }
    }

    // ── PORTA 4 — curso com template disponível ──────────────────────────

    private function assertTemplateDisponivel(Turma $turma): CourseCertificateTemplate
    {
        $template = $this->templates->latestForCourse($turma->course_id);

        if ($template === null) {
            $this->refuse('template', 'El curso no tiene una plantilla de certificado aprobada.');
        }

        return $template;
    }

    // ── PORTA 5 — cidade de emissão válida ───────────────────────────────

    private function assertCidadeDeEmissao(
        Turma $turma,
        CourseCertificateTemplate $template,
    ): string {
        $ciudad = $this->templates->emissionCityFor($turma, $template);

        if ($ciudad === null) {
            $this->refuse('template', 'La plantilla del curso no define una ciudad de emisión válida.');
        }

        return $ciudad;
    }

    // ── PORTA 6 — redator designado ──────────────────────────────────────

    private function assertRedatorDesignado(Turma $turma, Redator $redator): void
    {
        if (! $turma->redatores()->whereKey($redator->id)->exists()) {
            $this->refuse('redator_id', 'El redactor no está designado en esta clase.');
        }
    }

    private function refuse(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
