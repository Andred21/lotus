<?php

namespace App\Domains\Certification\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * A exportação do Historial recusada por regra: conjunto vazio (arquivo vazio
 * não é entregue) ou acima do teto (pede filtro mais estreito). 422 pelo
 * `ProblemDetails`, nunca `abort(422)`.
 */
class CertificateExportException extends RecusaDeDominio
{
    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::RegraDeNegocio;
    }

    public static function vazia(): self
    {
        return new self(__('certification.export.empty'));
    }

    public static function acimaDoTeto(int $total, int $teto): self
    {
        return new self(__('certification.export.over_limit', ['total' => $total, 'teto' => $teto]));
    }

    /** O documento congelado destes códigos não se apresenta: nem se chama o conversor. */
    public static function zipComSnapshotInvalido(array $codigos): self
    {
        return new self(__('certification.export.zip_snapshot_invalid', ['codigos' => implode(', ', $codigos)]));
    }
}
