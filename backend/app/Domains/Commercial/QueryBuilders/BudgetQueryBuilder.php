<?php

namespace App\Domains\Commercial\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do orçamento: `BudgetData::fromModel` lê `quotes` (e o
 * `BudgetSummaryService` soma sobre a COLEÇÃO CARREGADA) e `files`, com os
 * anexos de cada cotação por dentro.
 *
 * Nasce neste bloco porque a lista de Arquivados precisa de `asOfArchiving`, que
 * é método do trait `LoadsCascadedChildren` e só existe em builder — o
 * `with([...])` solto que o controller fazia não tem onde recebê-lo (P4 do
 * plano). Os três caminhos ativos passaram a usar `withListingData()`, então a
 * lista do que carregar deixou de estar copiada em quatro sítios (B5).
 */
class BudgetQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

    public const LISTING = ['quotes.files', 'files'];

    /**
     * TUDO é cascateado aqui, ao contrário de `Client`/`Course`: a cascata do
     * orçamento leva as cotações, e a de cada cotação leva os anexos dela. A
     * chave aninhada `quotes.files` recebe a MESMA restrição — sem ela a
     * cotação arquivada apareceria sem anexo nenhum.
     */
    private const CASCADED = ['quotes', 'quotes.files', 'files'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /** Ver `LoadsCascadedChildren::asOfArchiving()` — por que a lista de arquivados não usa `withListingData()`. */
    public function withArchivedListingData(): static
    {
        return $this->with(self::asOfArchiving(self::CASCADED));
    }
}
