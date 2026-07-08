<?php

namespace App\Domains\Catalog\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da habilitação redator↔curso pelo lado do curso (sync total).
 * `present` + `array`: o campo tem que vir (mesmo vazio, p/ limpar), e cada id
 * precisa existir em `redatores`.
 */
#[TypeScript]
class CourseRedatorData extends Data
{
    /**
     * @param  array<int>  $redator_ids
     */
    public function __construct(
        public array $redator_ids,
    ) {}

    public static function rules(): array
    {
        return [
            'redator_ids' => ['present', 'array'],
            'redator_ids.*' => ['integer', 'exists:redatores,id'],
        ];
    }
}
