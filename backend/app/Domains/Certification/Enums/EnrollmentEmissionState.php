<?php

namespace App\Domains\Certification\Enums;

/**
 * Os três estados de emissão de uma matrícula (spec do bloco 48, D1).
 * Derivados só dos certificados dela — o dono do critério é o
 * `EmissionStateResolver`; este enum só dá nome aos estados.
 */
enum EnrollmentEmissionState: string
{
    /** Tem certificado com `status = Emitido`. */
    case Vigente = 'vigente';

    /** Tem certificado, nenhum `Emitido` (todos revogados): pode ser reemitida. */
    case RevogadoReemissivel = 'revogado_reemissivel';

    /** Não tem certificado algum. */
    case NuncaEmitido = 'nunca_emitido';
}
