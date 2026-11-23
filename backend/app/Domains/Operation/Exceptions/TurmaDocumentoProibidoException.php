<?php

namespace App\Domains\Operation\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * O ator não pode anexar nem remover este TIPO de documento da turma (ex.:
 * redator com `EVALUACION_CLIENTE`, admin com `MANUAL`). Recusa de ação
 * proibida: o `ProblemDetails` a traduz em 403. Distinta da recusa de turma
 * concluída (422 `concluded_locked`), que é estado, não papel.
 *
 * Default `null` em vez da frase, como a irmã `RedatorOnlyActionException`.
 */
class TurmaDocumentoProibidoException extends RecusaDeDominio
{
    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? __('operation.turma.document_type_forbidden'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::AcaoProibida;
    }
}
