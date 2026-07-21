<?php

namespace App\Domains\Operation\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Configuração de turma inválida (cotação não aprovada ou turma já existente).
 * HttpException(422) → handler global RFC 7807.
 */
class TurmaConfiguracaoException extends HttpException
{
    public static function cotacaoNaoAprovada(): self
    {
        return new self(422, 'A cotação precisa estar aprovada para configurar a turma.');
    }

    public static function turmaJaExiste(): self
    {
        return new self(422, 'Esta cotação já tem uma turma configurada.');
    }
}
