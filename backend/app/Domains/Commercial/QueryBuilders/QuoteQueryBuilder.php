<?php

namespace App\Domains\Commercial\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção da cotação: `QuoteData::fromModel` lê `files`, e a lista do que
 * carregar mora AQUI, não em cada caller — o `->load('files')` se repetia
 * solto pelo QuoteController (B5).
 */
class QuoteQueryBuilder extends Builder
{
    public const LISTING = ['files'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
