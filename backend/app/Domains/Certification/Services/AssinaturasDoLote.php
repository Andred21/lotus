<?php

namespace App\Domains\Certification\Services;

use Closure;

/**
 * O que um lote de certificados resolve UMA vez: a assinatura da gerente (igual
 * para todos) e, por relator distinto, o binário da firma. Sem isso cada
 * certificado do lote relê a configuração, a firma da gerente e o relator — no
 * S3 de produção, dois GETs de rede por certificado.
 *
 * O escopo é o LOTE: quem o cria (o `renderMany`) o descarta ao terminar. Não é
 * singleton nem cache — o lote seguinte lê de novo e vê a configuração e as
 * firmas vigentes (spec D5: as assinaturas saem vivas).
 */
final class AssinaturasDoLote
{
    private ?AssinaturaImpressa $gerente = null;

    /** @var array<int, string|null> `redator_id` → base64 da firma (`null` = sem firma, e isso também se lembra) */
    private array $firmasDosRelatores = [];

    /** @param  Closure(): AssinaturaImpressa  $resolver */
    public function gerente(Closure $resolver): AssinaturaImpressa
    {
        return $this->gerente ??= $resolver();
    }

    /** @param  Closure(): ?string  $resolver */
    public function firmaDoRelator(int $redatorId, Closure $resolver): ?string
    {
        if (! array_key_exists($redatorId, $this->firmasDosRelatores)) {
            $this->firmasDosRelatores[$redatorId] = $resolver();
        }

        return $this->firmasDosRelatores[$redatorId];
    }
}
