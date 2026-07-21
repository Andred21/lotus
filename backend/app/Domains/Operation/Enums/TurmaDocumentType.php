<?php

namespace App\Domains\Operation\Enums;

/**
 * Tipos de documento da turma (RN-16 — RF-RED-07). Enum do domínio, não
 * global: a `files` polimórfica tem `type` string livre; este enum rotula e
 * restringe os docs de turma (mesmo padrão do RedatorDocumentType).
 */
enum TurmaDocumentType: string
{
    case MANUAL = 'MANUAL';
    case PRUEBAS = 'PRUEBAS';
    case EVALUACION_REDATOR = 'EVALUACION_REDATOR';
}
