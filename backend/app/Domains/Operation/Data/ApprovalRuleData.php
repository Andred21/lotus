<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Services\ApprovalRule;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Regra mínima de aprovação da turma (saída). Dono: `ApprovalRule`. */
#[TypeScript]
class ApprovalRuleData extends Data
{
    public function __construct(
        public float $min_grade,
        public float $min_attendance_pct,
    ) {}

    public static function fromRule(ApprovalRule $rule): self
    {
        return new self($rule->minGrade, $rule->minAttendancePct);
    }
}
