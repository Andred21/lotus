<?php

namespace App\Domains\Identity\Data;

use App\Domains\Certification\Services\StudentCertificateSummary;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma turma no histórico do aluno, projetada a partir da matrícula. Só saída.
 *
 * A turma é identificada por `quote_code` porque turma não tem código próprio
 * (P-13 segue aberta em docs/pendencias.md); o protótipo mostra "TR-45", que
 * hoje não existe no backend.
 *
 * O certificado entra como COLUNA desta linha, não como seção própria: a
 * tabela já lista uma linha por matrícula e certificado é 1:1 com matrícula
 * (spec D1).
 */
#[TypeScript]
class StudentTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public ?string $quote_code,
        public string $course_name,
        public string $start_date,
        /** O enum, não `string`: o front precisa da união fechada para casar
         * severidade e rótulo sem um fallback que engula estado novo. */
        public EnrollmentApprovalStatus $approval_status,
        /** `null` tem DOIS significados, e quem os separa é o
         * `approval_status` acima: aprovado sem certificado é "pendente de
         * emissão"; o resto é "não corresponde" (spec D7). */
        public ?StudentCertificateData $certificate = null,
        /** Quantos certificados esta matrícula já teve antes do atual. O
         * rastro de reemissão não some, e a linha não vira lista de altura
         * variável numa tabela que já disputa largura (spec D8). */
        public int $superseded_count = 0,
    ) {}

    public static function fromModel(Enrollment $enrollment, ?StudentCertificateSummary $summary = null): self
    {
        $turma = $enrollment->turma;

        return new self(
            turma_id: $turma->id,
            quote_code: $turma->quote?->code,
            course_name: $turma->course->name,
            start_date: $turma->start_date->toDateString(),
            approval_status: $enrollment->approval_status,
            certificate: $summary === null ? null : StudentCertificateData::fromSummary($summary),
            superseded_count: $summary?->supersededCount ?? 0,
        );
    }
}
