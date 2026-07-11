<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateBudgetAction;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Spatie\LaravelData\Optional;

class BudgetController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.budget.view', only: ['index', 'show']),
            new Middleware('permission:commercial.budget.create', only: ['store']),
            new Middleware('permission:commercial.budget.update', only: ['update']),
            new Middleware('permission:commercial.budget.delete', only: ['destroy']),
        ];
    }

    /** @return array<BudgetData> */
    public function index(): array
    {
        return Budget::with('quotes')
            ->get()
            ->map(fn (Budget $b) => BudgetData::fromModel($b))
            ->all();
    }

    public function store(BudgetData $data, CreateBudgetAction $action): BudgetData
    {
        return BudgetData::fromModel($action->execute($data));
    }

    public function show(Budget $budget): BudgetData
    {
        return BudgetData::fromModel($budget->load('quotes'));
    }

    public function update(BudgetData $data, Budget $budget): BudgetData
    {
        // `code` e `client_id` são imutáveis: só payment_terms muda por aqui.
        $budget->update([
            'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
        ]);

        return BudgetData::fromModel($budget->load('quotes'));
    }

    public function destroy(Budget $budget): Response
    {
        $budget->delete();

        return response()->noContent();
    }
}
