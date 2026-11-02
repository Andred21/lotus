<?php

namespace App\Domains\Operation\Enums;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Campo da planilha que a prévia compara com o cadastro (D9, D17). É o tipo de
 * `ImportPreviewRowData::$divergent`: gerado, o front indexa os `registered_*`
 * sem cast e o compilador acusa se um nome mudar aqui.
 */
#[TypeScript]
enum ImportField: string
{
    case Name = 'name';
    case Email = 'email';
    case Phone = 'phone';
}
