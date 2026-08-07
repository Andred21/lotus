<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O resultado acadêmico congelado. `grades` segue array livre porque é assim
 * que `enrollments.grades` nasce hoje — tipar a nota é decisão de negócio que
 * mora no Operation, não aqui (fica como débito registrado).
 */
#[TypeScript]
class SnapshotResultData extends Data
{
    public function __construct(
        /** @var array<string, mixed>|null */
        public ?array $grades,
        public ?string $approval_status,
        public ?string $attendance_pct,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        $grades = data_get($raw, 'grades');
        $attendance = data_get($raw, 'attendance_pct');

        return new self(
            grades: is_array($grades) ? $grades : null,
            approval_status: self::nullableString(data_get($raw, 'approval_status')),
            attendance_pct: $attendance === null ? null : (string) $attendance,
        );
    }

    /**
     * A nota impressa no documento, ou `null` — que OMITE a linha (D-P7).
     *
     * `enrollments.grades` é validado só como `array`, então a nota chega como
     * o redator a lançou: `6.4`, `"6.4"` ou `"6,4"` com vírgula, que é como se
     * escreve nota no Chile. Filtrar por `is_numeric` apagava a última do
     * documento em silêncio. Omitir só o que não dá para imprimir — array,
     * objeto, booleano, string vazia.
     */
    public function finalGrade(): int|float|string|null
    {
        $grade = data_get($this->grades, 'final');

        if (is_int($grade) || is_float($grade)) {
            return $grade;
        }

        if (! is_string($grade)) {
            return null;
        }

        return trim($grade) === '' ? null : trim($grade);
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
