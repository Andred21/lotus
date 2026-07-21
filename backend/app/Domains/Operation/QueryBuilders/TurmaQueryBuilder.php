<?php

namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * QueryBuilder da Turma. Concentra a projeção de listagem/detalhe: eager-load das
 * relações que o TurmaData achata (curso, cotação→orçamento→cliente, redatores) e
 * a contagem de matrículas ativas — evita N+1 no hub. Custom Eloquent Builder
 * (não Repository — ADR-02).
 */
class TurmaQueryBuilder extends Builder
{
    public function withListingData(): static
    {
        return $this
            ->with(['redatores.user', 'course', 'quote.budget.client'])
            ->withCount('enrollments');
    }
}
