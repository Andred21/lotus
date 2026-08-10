<?php

namespace App\Domains\Operation\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * QueryBuilder da Turma. Concentra a projeção de listagem/detalhe: eager-load das
 * relações que o TurmaData achata (curso, cotação→orçamento→cliente, redatores,
 * documentação obrigatória) e a contagem de matrículas ativas — evita N+1 no hub.
 * Custom Eloquent Builder (não Repository — ADR-02).
 */
class TurmaQueryBuilder extends Builder
{
    /**
     * `.client.user`, não só `.client`: o seam `Turma::contratante()` lê o RUT
     * do User do contratante (B4). Parar em `.client` deixa um SELECT por turma
     * — guarda em `ContratanteEagerLoadTest`.
     *
     * `documentacaoObrigatoria` é o que faz a RN-16 custar UMA query para a
     * listagem inteira em vez de uma por linha — guarda de contagem em
     * `TurmaQueryBuilderTest`. O `TurmaHabilitacaoService` lê essa relação como
     * propriedade (`for()`); sem a carga aqui, a listagem faz lazy-load por
     * turma e viola o `Model::preventLazyLoading()` da mesma guarda acima.
     */
    public const LISTING = ['redatores.user', 'course', 'quote.budget.client.user', 'documentacaoObrigatoria'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING)->withCount('enrollments');
    }
}
