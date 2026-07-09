<?php

namespace App\Domains\Identity\Enums;

/**
 * Tipos de documento de idoneidade do redator. Vive no domínio (não é global):
 * a tabela `files` é polimórfica e o `type` é string livre; este enum só
 * restringe/rotula os documentos de redator. Turma terá o seu no futuro.
 */
enum RedatorDocumentType: string
{
    case CV = 'CV';
    case REUF = 'REUF';
    case TITULO = 'TITULO';
    case POSTGRADO = 'POSTGRADO';
}
