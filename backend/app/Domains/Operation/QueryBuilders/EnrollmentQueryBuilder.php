<?php

namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção de matrícula: `EnrollmentData::fromModel` achata `student.user`,
 * e a lista do que carregar mora AQUI, não em cada caller — o `result` já
 * esqueceu uma vez (lazy load silencioso, B5).
 */
class EnrollmentQueryBuilder extends Builder
{
    public const LISTING = ['student.user'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
