<?php

namespace App\Domains\Identity\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do redator: `RedatorData::fromModel` achata os campos do `user`, lê
 * `courses` e `documents`, e o último acesso vem de `user.latestLogin`. A lista
 * do que carregar mora AQUI, não inline no controller (B5) — a listagem de
 * arquivados precisa da MESMA lista com `asOfArchiving` por cima.
 */
class RedatorQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['user.latestLogin', 'courses', 'documents'];

    /**
     * As coleções que a cascata de arquivamento leva junto. `user` fica fora
     * porque a relação já é `withTrashed()` e nunca some da projeção; `courses`
     * é pivot de habilitação, que a cascata não toca.
     */
    private const CASCADED = ['documents'];

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
