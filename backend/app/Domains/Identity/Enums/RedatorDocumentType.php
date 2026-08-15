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

    /**
     * A lista canônica dos tipos regulatórios, com um dono só. Três leituras do
     * dashboard perguntam "quais arquivos deste redator são documento de
     * idoneidade?" — alerta do admin, carga por redator e alerta do próprio
     * redator. Projetar `cases()` em cada ponto de uso devolveria a lista a três
     * donos, e foi assim que a carga passou a contar arquivo qualquer com
     * validade (review de 2026-08-14, Q-8). Mesmo padrão de
     * `TurmaDocumentType::values()`.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
