<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Shared\Rules\PrintableGrade;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class EnrollmentResultData extends Data
{
    public function __construct(
        public ?array $grades,
        public ?string $attendance_pct,
        public EnrollmentApprovalStatus $approval_status,
    ) {}

    public static function rules(): array
    {
        return [
            'grades' => ['nullable', 'array'],
            // B6: a chave `final` pode faltar (nota ainda não lançada); se vier,
            // tem que dar para imprimir no certificado — `null` explícito também
            // reprova, porque não se imprime e a omissão é o caminho correto.
            'grades.final' => ['sometimes', new PrintableGrade],
            'attendance_pct' => ['nullable', 'numeric', 'between:0,100'],
            'approval_status' => ['required', Rule::enum(EnrollmentApprovalStatus::class)],
        ];
    }
}
