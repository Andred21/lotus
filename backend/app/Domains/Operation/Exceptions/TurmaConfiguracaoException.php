<?php

namespace App\Domains\Operation\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Configuração de turma inválida (cotação não aprovada ou turma já existente).
 * Recusa de regra de negócio: o `ProblemDetails` a traduz em 422.
 */
class TurmaConfiguracaoException extends RecusaDeDominio
{
    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RegraDeNegocio;
    }

    public static function cotacaoNaoAprovada(): self
    {
        return new self(__('operation.turma.quote_not_approved'));
    }

    public static function turmaJaExiste(): self
    {
        return new self(__('operation.turma.already_exists'));
    }
}
