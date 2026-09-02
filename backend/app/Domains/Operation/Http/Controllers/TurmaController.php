<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Actions\ConcludeTurmaAction;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Actions\DeleteTurmaAction;
use App\Domains\Operation\Actions\DesignateRedatorAction;
use App\Domains\Operation\Actions\RemoveRedatorAction;
use App\Domains\Operation\Actions\RestoreTurmaAction;
use App\Domains\Operation\Actions\UpdateTurmaAction;
use App\Domains\Operation\Data\ArchivedTurmaData;
use App\Domains\Operation\Data\PendingQuoteData;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Data\TurmaPageRequest;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use App\Domains\Operation\Services\ManualDocumentService;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use App\Shared\Pagination\PageData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TurmaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'show', 'manual', 'manualDocx', 'archived']),
            new Middleware('permission:operation.turma.create', only: ['store', 'pending']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.restore', only: ['restore']),
            new Middleware('permission:operation.turma.assign_redator', only: ['designateRedator', 'removeRedator']),
            new Middleware('permission:operation.turma.complete', only: ['conclude']),
        ];
    }

    public function store(TurmaData $data, Quote $quote, CreateTurmaAction $action, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return $this->present($action->execute($quote, $data), $habilitacao);
    }

    /**
     * Página do hub (spec D1). `visibleTo` vem ANTES do `page()`: o
     * `total_unfiltered` do redator é o das turmas dele, não da casa.
     *
     * @return PageData<TurmaData>
     */
    public function index(TurmaPageRequest $page, Request $request, TurmaHabilitacaoService $habilitacao): PageData
    {
        return Turma::query()
            ->visibleTo($request->user())
            ->withListingData()
            ->page(
                $page,
                fn (Turma $t) => TurmaData::fromModel($t, $habilitacao),
                filter: fn (TurmaQueryBuilder $q) => $q->whereDisplayStatus($page->status),
            );
    }

    /** @return array<PendingQuoteData> */
    public function pending(): array
    {
        return Quote::query()
            ->where('status', QuoteStatus::Approved)
            ->whereDoesntHave('turma')
            ->with(['budget.client.user', 'course'])
            ->latest()
            ->get()
            ->map(fn (Quote $q) => PendingQuoteData::fromModel($q))
            ->all();
    }

    public function show(Turma $turma, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return $this->present($turma, $habilitacao);
    }

    public function update(TurmaData $data, Turma $turma, UpdateTurmaAction $action, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return $this->present($action->execute($turma, $data), $habilitacao);
    }

    public function destroy(Turma $turma, DeleteTurmaAction $action): Response
    {
        $action->execute($turma);

        return response()->noContent();
    }

    /**
     * A mesma página, sobre as arquivadas. `slice()` e não `page()`: quem
     * arquivou é resolvido num lote só sobre os ids DA PÁGINA, e o lote
     * exige a coleção pronta ANTES da projeção — é o que `slice()` devolve
     * crua para `ArchivedListing::lista()` consumir.
     *
     * @return PageData<ArchivedTurmaData>
     */
    public function archived(TurmaPageRequest $page, Request $request, TurmaHabilitacaoService $habilitacao): PageData
    {
        [$turmas, $meta] = Turma::onlyTrashed()
            ->visibleTo($request->user())
            ->withArchivedListingData()
            ->slice($page, filter: fn (TurmaQueryBuilder $q) => $q->whereDisplayStatus($page->status, asOfArchiving: true));

        return new PageData(
            data: ArchivedListing::lista(
                $turmas,
                Turma::class,
                fn (Turma $t, string $em, ?string $por) => new ArchivedTurmaData(
                    turma: TurmaData::fromModel($t, $habilitacao),
                    archived_at: $em,
                    archived_by: $por,
                ),
            ),
            meta: $meta,
        );
    }

    public function restore(int $turma, RestoreTurmaAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Turma::query(), $turma);

        return RespostaDeRecurso::ok($this->present($action->execute($model), $habilitacao));
    }

    public function designateRedator(Turma $turma, Redator $redator, DesignateRedatorAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        return $this->present($action->execute($turma, $redator), $habilitacao)
            ->toResponse(request())
            ->setStatusCode(200);
    }

    public function removeRedator(Turma $turma, Redator $redator, RemoveRedatorAction $action, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return $this->present($action->execute($turma, $redator), $habilitacao);
    }

    public function conclude(Turma $turma, ConcludeTurmaAction $action, TurmaHabilitacaoService $habilitacao): JsonResponse
    {
        return $this->present($action->execute($turma), $habilitacao)
            ->toResponse(request())
            ->setStatusCode(200);
    }

    public function manual(Turma $turma, ManualDocumentService $manual): Response
    {
        return response($manual->pdf($turma), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"manual-turma-{$turma->id}.pdf\"",
        ]);
    }

    /**
     * `attachment` e não `inline`: navegador não renderiza WordprocessingML, e
     * `inline` viraria um download com o nome do arquivo perdido.
     */
    public function manualDocx(Turma $turma, ManualDocumentService $manual): Response
    {
        return response($manual->docx($turma), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename=\"manual-turma-{$turma->id}.docx\"",
        ]);
    }

    private function present(Turma $turma, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return TurmaData::fromModel($turma->loadListingData(), $habilitacao);
    }
}
