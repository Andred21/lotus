<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A matrícula na tela de emissão. Ao contrário do `issuable` que a antecedeu,
 * TODAS aparecem — reprovada e pendente inclusive: o admin precisa ver por que
 * um aluno da turma não recebe certificado, e uma linha ausente não explica
 * nada.
 */
#[TypeScript]
class EmissionPanelEnrollmentData extends Data
{
    public function __construct(
        public int $enrollment_id,
        public string $student_name,
        public string $student_rut,
        public EnrollmentApprovalStatus $approval_status,
        public ?string $attendance_pct,
        public ?string $nota_final,
        /** O certificado VIGENTE da matrícula; `null` quando não há (nunca emitido ou revogado). */
        public ?EmissionPanelCertificateData $certificate,
    ) {}

    public static function fromModel(Enrollment $enrollment, ?Certificate $vigente): self
    {
        return new self(
            enrollment_id: $enrollment->id,
            student_name: $enrollment->student->user->name,
            student_rut: $enrollment->student->user->rut,
            approval_status: $enrollment->approval_status,
            attendance_pct: $enrollment->attendance_pct,
            // `enrollments.grades` é array livre (o tipo da nota é decisão de
            // negócio do Operation, ainda em aberto): a projeção entrega o que
            // o redator lançou como texto, e não inventa um formato.
            //
            // `is_scalar` porque JSON livre também aceita objeto e lista: sem a
            // guarda, um `grades.final` estruturado emite `Array to string
            // conversion` e escreve a palavra "Array" numa listagem de peso
            // legal. Não-escalar vira `null` — ausência honesta em vez de lixo.
            nota_final: isset($enrollment->grades['final']) && is_scalar($enrollment->grades['final'])
                ? (string) $enrollment->grades['final']
                : null,
            certificate: $vigente === null ? null : EmissionPanelCertificateData::fromModel($vigente),
        );
    }
}
