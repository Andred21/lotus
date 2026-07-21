<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Resumo do import (tela-turmas: quantos criados/associados/movidos, linhas com
 * erro). `contracted_count` vs `enrolled_total` é D3: o front avisa, nunca bloqueia.
 */
#[TypeScript]
class ImportResultData extends Data
{
    public function __construct(
        public int $created,
        public int $relinked,
        public int $already_enrolled,
        /** @var MovedStudentData[] */
        public array $moved,
        /** @var ImportRowErrorData[] */
        public array $errors,
        public int $enrolled_total,
        public int $contracted_count,
    ) {}
}
