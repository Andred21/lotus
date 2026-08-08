<?php

namespace App\Domains\Catalog\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do curso: `CourseData::fromModel` lê `certificateTemplates`,
 * `redatores` e `modules`, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 */
class CourseQueryBuilder extends Builder
{
    public const LISTING = ['certificateTemplates', 'redatores', 'modules'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
