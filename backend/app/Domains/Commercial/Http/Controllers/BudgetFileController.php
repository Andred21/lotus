<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\ReplaceFileOfTypeAction;
use App\Domains\Commercial\Data\BudgetFileUploadData;
use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Anexos do orçamento: orden de compra, fatura e comprovante
 * (`BudgetDocumentType`). Registro financeiro — NÃO bloqueia nenhuma ação
 * (RN-14).
 */
class BudgetFileController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:commercial.budget.update')];
    }

    public function store(BudgetFileUploadData $data, Budget $budget, ReplaceFileOfTypeAction $action): FileData
    {
        return FileData::fromModel(
            $action->execute($budget, $data->file, $data->type),
        );
    }

    public function destroy(Budget $budget, File $file): Response
    {
        // Posse garantida pelo `->scopeBindings()` da rota: o {file} é resolvido
        // por $budget->files(), então arquivo de outro budget — ou de outro
        // fileable_type — nunca chega aqui (404 no binding).
        $file->delete();

        return response()->noContent();
    }
}
