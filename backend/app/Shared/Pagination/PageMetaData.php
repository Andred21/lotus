<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O `meta` do envelope (spec D2): pequeno, sem `links/path/from/to` que
 * ninguém lê. `total_unfiltered` (D5) é a contagem do MESMO escopo
 * (`visibleTo`) sem `q` nem filtro — o front mede o EFEITO do filtro por
 * `total !== total_unfiltered`, como o `useTableFilter` sempre mediu.
 */
#[TypeScript]
class PageMetaData extends Data
{
    public function __construct(
        public int $page,
        public int $per_page,
        public int $total,
        public int $last_page,
        public int $total_unfiltered,
    ) {}
}
