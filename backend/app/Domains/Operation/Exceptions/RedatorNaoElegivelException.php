<?php

namespace App\Domains\Operation\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Redator não pode ser designado à turma (gate RN-09). HttpException(422) → o
 * handler global (ProblemDetails) formata em RFC 7807. Mensagem distinta por
 * causa para o front diferenciar (não-habilitado vs REUF ausente/vencido).
 */
class RedatorNaoElegivelException extends HttpException
{
    public static function naoHabilitado(): self
    {
        return new self(422, 'Redator não está habilitado a ministrar este curso.');
    }

    public static function reufInvalido(): self
    {
        return new self(422, 'Redator não possui REUF válido (documento ausente ou vencido).');
    }
}
