<?php

namespace App\Domains\Catalog\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do curso: `CourseData::fromModel` lê `certificateTemplates`,
 * `redatores` e `modules`, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 */
class CourseQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['certificateTemplates', 'redatores', 'modules'];

    /**
     * As coleções que a cascata leva junto. `redatores` fica fora: é habilitação
     * por pivot puro, que o arquivamento não toca.
     */
    private const CASCADED = ['certificateTemplates', 'modules'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Gêmeo de `ClientQueryBuilder::withArchivedListingData()`. */
    public function withArchivedListingData(): static
    {
        return $this
            ->with(array_values(array_diff(self::LISTING, self::CASCADED)))
            ->with(self::asOfArchiving(self::CASCADED));
    }
}
