<?php

namespace App\Domains\Identity\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\Student;

/**
 * Resultado interno de uma linha de resolução de aluno. Não é DTO de API (sem
 * #[TypeScript]): a importação (6c) monta seu próprio resumo a partir daqui.
 */
final class StudentResolution
{
    public function __construct(
        public readonly Student $student,
        public readonly StudentResolutionOutcome $outcome,
        public readonly ?Client $previousClient = null,
    ) {}
}
