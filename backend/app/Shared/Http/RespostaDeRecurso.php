<?php

namespace App\Shared\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Spatie\LaravelData\Data;

/**
 * O status HTTP de uma decisão sobre recurso que JÁ EXISTE.
 *
 * `Data::toResponse()` força 201 em qualquer POST
 * (`ResponsableData::calculateResponseStatus`). Correto para `store()`, que
 * cria; errado para restaurar, aprovar, rejeitar, importar, designar, concluir
 * e revogar — catorze sítios em dez controllers refaziam esta mesma linha, em
 * DUAS grafias (`Response::HTTP_OK` e `200` literal).
 *
 * Mora em `Shared/Http` e não em `Shared/Audit` de propósito: não tem nada a
 * ver com auditoria, e metade dos sítios não é arquivamento.
 */
class RespostaDeRecurso
{
    public static function ok(Data $projetado): JsonResponse
    {
        return $projetado->toResponse(request())->setStatusCode(Response::HTTP_OK);
    }
}
