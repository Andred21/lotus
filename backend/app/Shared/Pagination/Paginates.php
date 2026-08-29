<?php

namespace App\Shared\Pagination;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * A paginação como método do QueryBuilder custom do agregado (ADR-02: builder,
 * não Repository). O controller continua fino — `Student::query()->...->page()`
 * — e quem sabe buscar, filtrar e ordenar é o builder, que é onde `LISTING` e
 * `visibleTo()` já moram.
 *
 * O builder que usa o trait declara:
 *
 *   public const SORTABLE = ['campo' => 'tabela.coluna', ...];   // allowlist
 *   public const DEFAULT_SORT = '-created_at';                     // `campo` ou `-campo`
 *   public function searchable(string $q): static;                 // o que `q` varre
 *
 * Ordem das medições em `slice()`, que É o contrato (spec §4.1 e §4.2):
 *
 *   1. `sort` é resolvido ANTES de qualquer consulta — fora da allowlist é 422
 *      sem gastar um `count()`;
 *   2. `total_unfiltered` = escopo como chegou (depois de `visibleTo`, antes de
 *      `q` e do filtro);
 *   3. `searchable(q)`;
 *   4. o closure `$meta`, quando existe, recebe um CLONE deste ponto — o escopo
 *      de `q` sem o filtro nomeado (é sobre ele que o Historial soma o resumo);
 *   5. `$filter`;
 *   6. `total`, ordenação com desempate pela chave e `forPage()`.
 *
 * O desempate pela chave primária não é decoração: duas linhas com o mesmo
 * `created_at` sairiam em ordem indefinida do banco e podiam trocar de página
 * entre dois requests — mesma razão do `orderByDesc('id')` do painel de emissão.
 */
trait Paginates
{
    abstract public function searchable(string $q): static;

    /**
     * @param  Closure(Model): mixed  $present  projeta cada linha (o `fromModel` do agregado)
     * @param  Closure(static): void|null  $filter  filtro nomeado, aplicado DEPOIS de `q`
     * @param  Closure(PageMetaData, static): PageMetaData|null  $meta  estende o `meta` a partir do escopo de `q`
     */
    public function page(PageRequest $request, Closure $present, ?Closure $filter = null, ?Closure $meta = null): PageData
    {
        [$items, $metaData] = $this->slice($request, $filter, $meta);

        return new PageData(
            data: $items->map($present)->values()->all(),
            meta: $metaData,
        );
    }

    /**
     * A fatia crua: os models da página e o `meta`. Existe para quem precisa
     * da COLEÇÃO antes de projetar — a lista de arquivados resolve "arquivado
     * por" num lote só (`ArchiveTrailQuery::archivedBy`) sobre os ids da página.
     *
     * @param  Closure(static): void|null  $filter
     * @param  Closure(PageMetaData, static): PageMetaData|null  $meta
     * @return array{0: Collection<int, Model>, 1: PageMetaData}
     */
    public function slice(PageRequest $request, ?Closure $filter = null, ?Closure $meta = null): array
    {
        [$coluna, $direcao] = $this->resolveSort($request->sort);

        $totalUnfiltered = (clone $this)->count();

        $q = trim((string) $request->q);
        if ($q !== '') {
            $this->searchable($q);
        }

        $escopoDeQ = $meta === null ? null : clone $this;

        if ($filter !== null) {
            $filter($this);
        }

        $total = (clone $this)->count();

        $items = $this
            ->orderBy($coluna, $direcao)
            ->orderBy($this->getModel()->getQualifiedKeyName(), $direcao)
            ->forPage($request->page, $request->per_page)
            ->get();

        $base = new PageMetaData(
            page: $request->page,
            per_page: $request->per_page,
            total: $total,
            last_page: max(1, (int) ceil($total / $request->per_page)),
            total_unfiltered: $totalUnfiltered,
        );

        return [$items, $meta === null ? $base : $meta($base, $escopoDeQ)];
    }

    /**
     * `campo` ou `-campo`, só da allowlist. Fora dela é `ValidationException`,
     * que o handler global traduz em 422 `application/problem+json` — nunca
     * `abort(422)` (CLAUDE.md §5.4).
     *
     * @return array{0: string, 1: 'asc'|'desc'}
     */
    private function resolveSort(?string $sort): array
    {
        $sort = ($sort === null || $sort === '') ? static::DEFAULT_SORT : $sort;
        $desc = str_starts_with($sort, '-');
        $campo = $desc ? substr($sort, 1) : $sort;

        if (! array_key_exists($campo, static::SORTABLE)) {
            throw ValidationException::withMessages([
                'sort' => __('validation.in', ['attribute' => 'sort']),
            ]);
        }

        return [static::SORTABLE[$campo], $desc ? 'desc' : 'asc'];
    }
}
