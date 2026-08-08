<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class BatchIssueData extends Data
{
    public function __construct(
        /** @var array<int> */
        public array $enrollment_ids,
        public int $redator_id,
    ) {}

    public static function rules(): array
    {
        return [
            'enrollment_ids' => ['required', 'array', 'min:1'],
            'enrollment_ids.*' => ['integer', 'exists:enrollments,id'],
            'redator_id' => ['required', 'integer', 'exists:redatores,id'],
        ];
    }
}
