<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Budget;
use App\Http\Controllers\Controller;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Anexos do orçamento: fatura (`invoice`) e comprovante (`receipt`). Registro
 * financeiro — NÃO bloqueia nenhuma ação (RN-14).
 */
class BudgetFileController extends Controller
{
    public function store(Request $request, Budget $budget, UploadFileAction $action): FileData
    {
        $validated = $request->validate([
            'type' => ['required', 'in:invoice,receipt'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return FileData::fromModel(
            $action->execute($budget, $request->file('file'), $validated['type']),
        );
    }

    public function destroy(Budget $budget, File $file): Response
    {
        abort_unless(
            $file->fileable_type === 'budget' && $file->fileable_id === $budget->id,
            404,
        );

        $file->delete();

        return response()->noContent();
    }
}
