<?php

namespace App\Shared\Pagination;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Envelope `{ data, meta }` de toda lista paginada (spec D2).
 *
 * `data` é `array` cru de propósito: o transformer não emite genérico, então o
 * item é tipado no front por `Page<T>` (`shared/api/page.ts`), que casa `data`
 * com o tipo gerado do item e `meta` com `PageMetaData`. Este DTO nunca é
 * importado pelo front — só o `meta` é. Cada item é um `Data` do agregado
 * (`StudentData`, ...), transformado na resposta como qualquer nested.
 */
#[TypeScript]
class PageData extends Data
{
    /** @param  list<Data>  $data */
    public function __construct(
        /** @var list<mixed> */
        public array $data,
        public PageMetaData $meta,
    ) {}
}
