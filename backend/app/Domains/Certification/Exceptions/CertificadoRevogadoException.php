<?php

namespace App\Domains\Certification\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * O PDF de um certificado revogado não sai pela rota pública (bloco 61). O
 * certificado existe e continua consultável, com o status `revocado`: o que
 * deixa de existir é o papel. Por isso 410 e não 404 — o `ProblemDetails` o
 * traduz pelo `TipoDeRecusa::RecursoRevogado`.
 */
class CertificadoRevogadoException extends RecusaDeDominio
{
    public function __construct()
    {
        parent::__construct(__('certification.public.revoked'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RecursoRevogado;
    }
}
