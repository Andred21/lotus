<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateBudgetAction;
use App\Domains\Commercial\Actions\DeleteBudgetAction;
use App\Domains\Commercial\Actions\RestoreBudgetAction;
use App\Domains\Commercial\Data\ArchivedBudgetData;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Services\BudgetSummaryService;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Spatie\LaravelData\Optional;

class BudgetController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.budget.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:commercial.budget.create', only: ['store']),
            new Middleware('permission:commercial.budget.update', only: ['update']),
            new Middleware('permission:commercial.budget.delete', only: ['destroy']),
            new Middleware('permission:commercial.budget.restore', only: ['restore']),
        ];
    }

    /** @return array<BudgetData> */
    public function index(BudgetSummaryService $summary): array
    {
        return Budget::query()->withListingData()
            ->get()
            ->map(fn (Budget $b) => BudgetData::fromModel($b, $summary))
            ->all();
    }

    /** @return array<ArchivedBudgetData> */
    public function archived(BudgetSummaryService $summary): array
    {
        return ArchivedListing::lista(
            Budget::onlyTrashed()->withArchivedListingData()->get(),
            Budget::class,
            fn (Budget $b, string $em, ?string $por) => new ArchivedBudgetData(
                budget: BudgetData::fromModel($b, $summary),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    public function restore(int $budget, RestoreBudgetAction $action, BudgetSummaryService $summary): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Budget::query(), $budget);

        return RespostaDeRecurso::ok(BudgetData::fromModel($action->execute($model), $summary));
    }

    public function store(BudgetData $data, CreateBudgetAction $action, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($action->execute($data)->loadListingData(), $summary);
    }

    public function show(Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        return BudgetData::fromModel($budget->loadListingData(), $summary);
    }

    public function update(BudgetData $data, Budget $budget, BudgetSummaryService $summary): BudgetData
    {
        // `code` e `client_id` são imutáveis: só payment_terms muda por aqui.
        $budget->update([
            'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
        ]);

        return BudgetData::fromModel($budget->loadListingData(), $summary);
    }

    public function destroy(Budget $budget, DeleteBudgetAction $action): Response
    {
        $action->execute($budget);

        return response()->noContent();
    }
}
