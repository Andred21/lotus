<?php

namespace App\Domains\Commercial\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do cliente: `ClientData::fromModel` achata `user` e lê
 * `addresses`/`contacts`, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 */
class ClientQueryBuilder extends Builder
{
    public const LISTING = ['user', 'addresses', 'contacts'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
