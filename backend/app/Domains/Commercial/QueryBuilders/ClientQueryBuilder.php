<?php

namespace App\Domains\Commercial\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do cliente: `ClientData::fromModel` achata `user` e lê
 * `addresses`/`contacts`, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 */
class ClientQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['user', 'addresses', 'contacts'];

    /**
     * As coleções que a cascata de arquivamento leva junto. `user` fica fora
     * porque a relação já é `withTrashed()` e nunca some da projeção.
     */
    private const CASCADED = ['addresses', 'contacts'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — por que a lista de arquivados não usa `withListingData()`. */
    public function withArchivedListingData(): static
    {
        return $this
            ->with(array_values(array_diff(self::LISTING, self::CASCADED)))
            ->with(self::asOfArchiving(self::CASCADED));
    }
}
