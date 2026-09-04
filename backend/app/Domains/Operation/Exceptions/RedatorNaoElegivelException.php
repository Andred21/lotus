<?php

namespace App\Domains\Operation\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Redator não pode ser designado à turma (gate RN-09). Recusa de regra de
 * negócio: o `ProblemDetails` a traduz em 422. Chave distinta por causa para
 * o front diferenciar (não-habilitado vs REUF ausente/vencido).
 */
class RedatorNaoElegivelException extends RecusaDeDominio
{
    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RegraDeNegocio;
    }

    public static function naoHabilitado(): self
    {
        return new self(__('operation.redator.not_qualified'));
    }

    public static function reufInvalido(): self
    {
        return new self(__('operation.redator.reuf_invalid'));
    }
}
