<?php

namespace App\Domains\Operation\QueryBuilders;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Shared\Concerns\LoadsCascadedChildren;
use App\Shared\Pagination\Paginates;
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
    use Paginates;

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

    /**
     * Ownership por DADO (spec D1). Admin e superadmin atravessam sem consulta
     * extra — o `if` sai antes do `whereHas`, e o custo do escopo é zero para
     * quem vê tudo.
     *
     * O filtro casa por `redatores.user_id` e não por `redatores.id` porque
     * quem autentica é o `User`; o `Redator` é o perfil pendurado nele.
     *
     * Não é Policy: Policy não filtra lista, então `index` precisaria de escopo
     * de query de qualquer jeito e o bloco nasceria com duas fontes de verdade
     * que podem divergir.
     */
    public function visibleTo(User $user): static
    {
        if ($user->type !== 'redator') {
            return $this;
        }

        return $this->whereHas('redatores', fn ($q) => $q->where('redatores.user_id', $user->id));
    }

    public const SORTABLE = [
        'created_at' => 'turmas.created_at',
        'start_date' => 'turmas.start_date',
        'end_date' => 'turmas.end_date',
    ];

    public const DEFAULT_SORT = '-created_at';

    /**
     * Curso, contratante e código do orçamento (spec §4.2). `quotes.code` não
     * existe como coluna — `Quote::getCodeAttribute()` monta "Scap {budget_id}
     * - Cot {seq}" em PHP —, então a metade que identifica (`budgets.code`,
     * `'Scap '.id`) é o que se varre. `whereHas` respeita os `withTrashed()`
     * das relações: turma de cliente arquivado continua achável.
     */
    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';

        return $this->where(fn (Builder $w) => $w
            ->whereHas('course', fn (Builder $c) => $c->where('courses.name', 'like', $like))
            ->orWhereHas('quote.budget', fn (Builder $b) => $b->where('budgets.code', 'like', $like))
            ->orWhereHas('quote.budget.client.user', fn (Builder $u) => $u->where('users.name', 'like', $like)));
    }

    /**
     * O status de exibição em SQL (spec §4.2): `concluida` pelo status;
     * `habilitada` = em andamento E um doc de CADA `TurmaDocumentType`;
     * `em_andamento` = em andamento e algum tipo faltando. É a `HabilitacaoStatus`
     * escrita como `whereHas`, e a paridade é catraca (`TurmaStatusParityTest`).
     *
     * `$asOfArchiving` é a lista de Arquivados: o documento conta como no
     * instante do arquivamento — o predicado de `LoadsCascadedChildren` escrito
     * para `whereHas`, pela mesma razão que `withArchivedListingData()` o
     * reescreve para `withCount`.
     */
    public function whereDisplayStatus(?TurmaDisplayStatus $status, bool $asOfArchiving = false): static
    {
        return match ($status) {
            null => $this,
            TurmaDisplayStatus::Concluida => $this->where('turmas.status', TurmaStatus::Concluida),
            TurmaDisplayStatus::Habilitada => $this
                ->where('turmas.status', TurmaStatus::EmAndamento)
                ->where(function (Builder $w) use ($asOfArchiving): void {
                    foreach (TurmaDocumentType::cases() as $type) {
                        $w->whereHas('documentacaoObrigatoria', fn (Builder $d) => $this->documentoDoTipo($d, $type, $asOfArchiving));
                    }
                }),
            TurmaDisplayStatus::EmAndamento => $this
                ->where('turmas.status', TurmaStatus::EmAndamento)
                ->where(function (Builder $w) use ($asOfArchiving): void {
                    foreach (TurmaDocumentType::cases() as $type) {
                        $w->orWhereDoesntHave('documentacaoObrigatoria', fn (Builder $d) => $this->documentoDoTipo($d, $type, $asOfArchiving));
                    }
                }),
        };
    }

    private function documentoDoTipo(Builder $doc, TurmaDocumentType $type, bool $asOfArchiving): void
    {
        $doc->where('files.type', $type->value);

        if ($asOfArchiving) {
            $doc->withTrashed()->where(fn (Builder $q) => $q
                ->whereNull('files.deleted_at')
                ->orWhere('files.archived_with_parent', true));
        }
    }
}
