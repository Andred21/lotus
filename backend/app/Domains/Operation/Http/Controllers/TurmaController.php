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
use App\Domains\Operation\Actions\UpdateTurmaAction;
use App\Domains\Operation\Data\PendingQuoteData;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\ManualDocumentService;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TurmaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'show', 'manual', 'manualDocx']),
            new Middleware('permission:operation.turma.create', only: ['store', 'pending']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.assign_redator', only: ['designateRedator', 'removeRedator']),
            new Middleware('permission:operation.turma.complete', only: ['conclude']),
        ];
    }

    public function store(TurmaData $data, Quote $quote, CreateTurmaAction $action, TurmaHabilitacaoService $habilitacao): TurmaData
    {
        return $this->present($action->execute($quote, $data), $habilitacao);
    }

    /** @return array<TurmaData> */
    public function index(TurmaHabilitacaoService $habilitacao): array
    {
        return Turma::query()->withListingData()->latest()->get()
            ->map(fn (Turma $t) => TurmaData::fromModel($t, $habilitacao))
            ->all();
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
