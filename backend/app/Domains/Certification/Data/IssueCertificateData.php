<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class IssueCertificateData extends Data
{
    public function __construct(
        public int $redator_id,
    ) {}

    public static function rules(): array
    {
        return [
            'redator_id' => ['required', 'integer', 'exists:redatores,id'],
        ];
    }
}
