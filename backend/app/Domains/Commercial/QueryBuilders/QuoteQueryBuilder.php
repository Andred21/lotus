<?php

namespace App\Domains\Commercial\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção da cotação: `QuoteData::fromModel` lê `files`, e a lista do que
 * carregar mora AQUI, não em cada caller — o `->load('files')` se repetia
 * solto pelo QuoteController (B5).
 */
class QuoteQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['files'];

    /** A única coleção que a cascata da cotação leva junto (spec D9). */
    private const CASCADED = ['files'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — a lista de arquivadas tem
     * de mostrar os anexos que a cascata acabou de esconder (Q-8). */
    public function withArchivedListingData(): static
    {
        return $this->with(self::asOfArchiving(self::CASCADED));
    }
}
