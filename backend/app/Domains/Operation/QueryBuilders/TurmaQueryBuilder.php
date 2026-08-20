<?php

namespace App\Domains\Operation\QueryBuilders;

use App\Shared\Concerns\LoadsCascadedChildren;
use Illuminate\Database\Eloquent\Builder;

/**
 * QueryBuilder da Turma. Concentra a projeção de listagem/detalhe: eager-load das
 * relações que o TurmaData achata (curso, cotação→orçamento→cliente, redatores,
 * documentação obrigatória) e a contagem de matrículas ativas — evita N+1 no hub.
 * Custom Eloquent Builder (não Repository — ADR-02).
 */
class TurmaQueryBuilder extends Builder
{
    use LoadsCascadedChildren;

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

    /**
     * As coleções que a cascata de arquivamento leva junto (spec D2).
     * `redatores.user`, `course` e `quote.budget.client.user` ficam fora: nenhum
     * é filho desta cascata, e as três relações já são `withTrashed()` do lado do
     * model.
     */
    private const CASCADED = ['documentacaoObrigatoria'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING)->withCount('enrollments');
    }

    /**
     * A projeção da lista de Arquivados. Duas diferenças da ativa, e as duas são
     * o mesmo Q-8: a lista existe para o operador RECONHECER a turma antes de
     * restaurá-la, e a projeção normal mostra o contrário do que aconteceu.
     *
     * 1. `documentacaoObrigatoria` entra por `asOfArchiving` — sem isso a turma
     *    arquivada aparece sem nenhum documento e a habilitação da RN-16 é lida
     *    ao contrário.
     * 2. A CONTAGEM de matrículas é reescrita. `withCount('enrollments')` conta
     *    só ativas, e depois da cascata TODA turma arquivada mostraria
     *    `0 alumnos`. O predicado é o mesmo do trait, escrito à mão porque
     *    `asOfArchiving()` devolve closures para `with()`, não para `withCount()`.
     */
    public function withArchivedListingData(): static
    {
        return $this
            ->with(array_values(array_diff(self::LISTING, self::CASCADED)))
            ->with(self::asOfArchiving(self::CASCADED))
            ->withCount(['enrollments' => fn ($query) => $query
                ->withTrashed()
                ->where(fn ($q) => $q
                    ->whereNull('enrollments.deleted_at')
                    ->orWhere('enrollments.archived_with_parent', true)
                ),
            ]);
    }
}
