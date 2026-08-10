<?php

namespace App\Shared\Validation;

use Illuminate\Validation\ValidationException;

/**
 * O achatamento de um `ValidationException` numa linha só, para relatórios que
 * mostram um item por linha e não têm onde pendurar um error-bag por campo —
 * a importação de alunos e o relatório da emissão em lote.
 *
 * `implode(' ')`, não `first()`: quando a recusa traz duas razões, mostrar só a
 * primeira faz o operador corrigir metade e falhar de novo. Quem tem lugar para
 * o error-bag inteiro (toda resposta 422 da API) NÃO passa por aqui — o handler
 * RFC 7807 continua carregando `errors` por campo.
 */
class ValidationMessages
{
    public static function squash(ValidationException $e): string
    {
        return collect($e->errors())->flatten()->implode(' ');
    }
}
