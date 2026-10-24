<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;

/**
 * A regra mínima de aprovação: nota >= 4,0 e presença >= 70 %. É o ÚNICO lugar
 * onde esses números existem — o front lê o contrato (`TurmaData::$approval_rule`)
 * e nunca os repete.
 *
 * `forTurma()` é o ponto único que amanhã passa a ler `courses.note_min` /
 * `presence_min` (fora deste bloco). A aprovação continua DECLARADA pelo admin
 * (D4): a regra só sugere, o backend não recusa divergência.
 */
final readonly class ApprovalRule
{
    public const float MIN_GRADE = 4.0;

    public const float MIN_ATTENDANCE_PCT = 70.0;

    public function __construct(
        public float $minGrade,
        public float $minAttendancePct,
    ) {}

    public static function forTurma(Turma $turma): self
    {
        return new self(self::MIN_GRADE, self::MIN_ATTENDANCE_PCT);
    }
}
