<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\Student;

/**
 * Resultado read-only de uma consulta de aluno por RUT (preview de matrícula).
 * Não é DTO de API (sem #[TypeScript]): a projeção p/ o front é do EnrollPreviewData,
 * que precisa do cliente da turma p/ derivar will_move. Espelha StudentResolution.
 */
final class StudentLookup
{
    public function __construct(
        public readonly bool $exists,
        public readonly ?Student $student,
        public readonly string $formattedRut,
    ) {}
}
