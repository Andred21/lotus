<?php

namespace App\Domains\Certification\Enums;

/**
 * Por que a emissão recusaria a turma INTEIRA no painel de emissão — as portas
 * 4 e 5 do `CertificateEligibility`, na ordem em que elas recusam.
 *
 * Enum backed e não `?string`: o conjunto é fechado e o `generated.ts` precisa
 * sair com a união (`'sin_ciudad' | ...`), não com `string`. Com `string` o
 * frontend redigitaria os valores à mão — o contrato do backend copiado no
 * cliente, que é o que o ADR-04 existe para impedir, e uma renomeação aqui
 * passaria em silêncio pelo compilador de lá.
 *
 * Os valores são o contrato de fio: o JSON entrega exatamente `sin_ciudad`,
 * `sin_redactor` ou `null`.
 */
enum EmissionBlockReason: string
{
    /** Porta 4: nem a turma nem o emissor dizem em que cidade emitir (D12). */
    case SinCiudad = 'sin_ciudad';

    /** Porta 5: nenhum redator designado na turma — sem assinatura possível (D11). */
    case SinRedactor = 'sin_redactor';
}
