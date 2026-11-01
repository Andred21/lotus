<?php

namespace App\Domains\Operation\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Classificação de uma linha da planilha na prévia (spec D9): o que a
 * confirmação faria com ela. É um rótulo de leitura — a confirmação recalcula.
 */
#[TypeScript]
enum ImportRowStatus: string
{
    case New = 'new';
    case Registered = 'registered';
    case Moves = 'moves';
    case AlreadyEnrolled = 'already_enrolled';
    case Error = 'error';
}
