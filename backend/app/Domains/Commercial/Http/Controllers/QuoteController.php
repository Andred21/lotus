<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\ApproveQuoteAction;
use App\Domains\Commercial\Actions\CreateQuoteAction;
use App\Domains\Commercial\Actions\DeleteQuoteAction;
use App\Domains\Commercial\Actions\RejectQuoteAction;
use App\Domains\Commercial\Actions\RestoreQuoteAction;
use App\Domains\Commercial\Actions\UpdateQuoteAction;
use App\Domains\Commercial\Data\ArchivedQuoteData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class QuoteController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.quote.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:commercial.quote.create', only: ['store']),
            new Middleware('permission:commercial.quote.update', only: ['update']),
            new Middleware('permission:commercial.quote.delete', only: ['destroy']),
            new Middleware('permission:commercial.quote.restore', only: ['restore']),
            new Middleware('permission:commercial.quote.approve', only: ['approve', 'reject']),
        ];
    }

    /** @return array<QuoteData> */
    public function index(Budget $budget): array
    {
        return $budget->quotes()->withListingData()->get()
            ->map(fn (Quote $q) => QuoteData::fromModel($q))
            ->all();
    }

    /**
     * Escopada pelo orçamento (spec D5): a cotação não tem lista de topo, e a
     * superfície de arquivados nasce onde a de ativas já vive.
     *
     * @return array<ArchivedQuoteData>
     */
    public function archived(Budget $budget): array
    {
        return ArchivedListing::lista(
            $budget->quotes()->onlyTrashed()->withArchivedListingData()->get(),
            Quote::class,
            fn (Quote $q, string $em, ?string $por) => new ArchivedQuoteData(
                quote: QuoteData::fromModel($q),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    public function restore(int $quote, RestoreQuoteAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Quote::query(), $quote);

        return RespostaDeRecurso::ok(QuoteData::fromModel($action->execute($model)));
    }

    public function store(QuoteData $data, Budget $budget, CreateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($budget, $data)->loadListingData());
    }

    public function show(Quote $quote): QuoteData
    {
        return QuoteData::fromModel($quote->loadListingData());
    }

    public function update(QuoteData $data, Quote $quote, UpdateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($quote, $data)->loadListingData());
    }

    public function destroy(Quote $quote, DeleteQuoteAction $action): Response
    {
        $action->execute($quote);

        return response()->noContent();
    }

    public function approve(Quote $quote, ApproveQuoteAction $action): JsonResponse
    {
        return RespostaDeRecurso::ok(
            QuoteData::fromModel($action->execute($quote)->loadListingData()),
        );
    }

    public function reject(Quote $quote, RejectQuoteAction $action): JsonResponse
    {
        return RespostaDeRecurso::ok(
            QuoteData::fromModel($action->execute($quote)->loadListingData()),
        );
    }
}
