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
            // `.client.user`, não só `.client`: o seam `Turma::contratante()`
            // lê o RUT do User do contratante (B4). Parar em `.client` deixa um
            // SELECT por turma — guarda em `ContratanteEagerLoadTest`.
            //
            // `documentacaoObrigatoria`: o TurmaHabilitacaoService passou a ler
            // essa relação como propriedade (`for()`); sem a carga aqui, a
            // listagem faz lazy-load por turma e viola o
            // `Model::preventLazyLoading()` da mesma guarda acima.
            ->with(['redatores.user', 'course', 'quote.budget.client.user', 'documentacaoObrigatoria'])
            ->withCount('enrollments');
    }
}
