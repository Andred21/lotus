<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\ApproveQuoteAction;
use App\Domains\Commercial\Actions\CreateQuoteAction;
use App\Domains\Commercial\Actions\DeleteQuoteAction;
use App\Domains\Commercial\Actions\RejectQuoteAction;
use App\Domains\Commercial\Actions\UpdateQuoteAction;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class QuoteController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.quote.view', only: ['index', 'show']),
            new Middleware('permission:commercial.quote.create', only: ['store']),
            new Middleware('permission:commercial.quote.update', only: ['update']),
            new Middleware('permission:commercial.quote.delete', only: ['destroy']),
            new Middleware('permission:commercial.quote.approve', only: ['approve', 'reject']),
        ];
    }

    /** @return array<QuoteData> */
    public function index(Budget $budget): array
    {
        return $budget->quotes()->with('files')->get()
            ->map(fn (Quote $q) => QuoteData::fromModel($q))
            ->all();
    }

    public function store(QuoteData $data, Budget $budget, CreateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($budget, $data)->load('files'));
    }

    public function show(Quote $quote): QuoteData
    {
        return QuoteData::fromModel($quote->load('files'));
    }

    public function update(QuoteData $data, Quote $quote, UpdateQuoteAction $action): QuoteData
    {
        return QuoteData::fromModel($action->execute($quote, $data)->load('files'));
    }

    public function destroy(Quote $quote, DeleteQuoteAction $action): Response
    {
        $action->execute($quote);

        return response()->noContent();
    }

    // Data::toResponse() força 201 em qualquer POST (ResponsableData::calculateResponseStatus).
    // Correto para store() (cria recurso), mas approve/reject são decisões sobre um recurso
    // já existente — força 200 explicitamente.
    public function approve(Quote $quote, ApproveQuoteAction $action): JsonResponse
    {
        return QuoteData::fromModel($action->execute($quote)->load('files'))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }

    public function reject(Quote $quote, RejectQuoteAction $action): JsonResponse
    {
        return QuoteData::fromModel($action->execute($quote)->load('files'))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }
}
