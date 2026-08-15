<?php

namespace App\Domains\Identity\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * Estado de validade de um documento profissional do redator, calculado no
 * BACKEND (spec D6). O Drive §5 é explícito: "A regra que decide
 * validade/idoneidade permanece no backend/domínio dono. O React não calcula
 * compliance a partir de datas cruas quando o contrato puder fornecer o estado
 * semântico."
 *
 * `RedatorDocumentData` (contrato administrativo) segue derivando no front e
 * NÃO muda aqui — reescrevê-lo é escopo de outro bloco.
 */
enum DocumentValidityStatus: string
{
    case Vigente = 'vigente';
    case VenceEmBreve = 'vence_em_breve';
    case Vencido = 'vencido';
    case Ausente = 'ausente';

    /**
     * Antecedência em que um documento passa a avisar. Coexiste de propósito
     * com `DashboardWindows::EXPIRY_WINDOW_DAYS`, que vive na branch paralela
     * do Dashboard e ainda não existe nesta árvore; unificar as duas é tarefa
     * do fechamento, depois do merge (spec §5).
     */
    public const DIAS_AVISO = 30;

    public static function for(?CarbonInterface $validUntil, bool $presente): self
    {
        if (! $presente) {
            return self::Ausente;
        }

        // Nulo vale sempre — a mesma leitura que o RedatorIdoneidadeService faz
        // do REUF (`whereNull('valid_until') orWhereDate(... >= hoje)`).
        if ($validUntil === null) {
            return self::Vigente;
        }

        $hoje = CarbonImmutable::today();

        if ($validUntil->lessThan($hoje)) {
            return self::Vencido;
        }

        return $validUntil->lessThanOrEqualTo($hoje->addDays(self::DIAS_AVISO))
            ? self::VenceEmBreve
            : self::Vigente;
    }
}
