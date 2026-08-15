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
     * O REUF fica fora do self-service (spec D5): ele é a ÚNICA entrada do
     * gate da RN-09 (`RedatorIdoneidadeService::temReufValido`), que lê
     * `valid_until`. Como a rota de upload aceita `valid_until` do corpo da
     * request, self-service nele deixaria o redator se auto-habilitar por
     * payload. CV, TÍTULO e POSTGRADO não entram em gate nenhum.
     */
    public function isSelfService(): bool
    {
        return $this !== self::REUF;
    }

    /** @return array<int, string> */
    public static function selfServiceValues(): array
    {
        return array_values(array_map(
            fn (self $type) => $type->value,
            array_filter(self::cases(), fn (self $type) => $type->isSelfService()),
        ));
    }

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
