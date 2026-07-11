<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Http\Controllers\Controller;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Data\FileData;
use App\Shared\Files\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Anexos da cotação: documento/aceite (`quote_document`). Opcional — a
 * aprovação não exige anexo (RN-14).
 */
class QuoteFileController extends Controller
{
    public function store(Request $request, Quote $quote, UploadFileAction $action): FileData
    {
        $validated = $request->validate([
            'type' => ['required', 'in:quote_document'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        return FileData::fromModel(
            $action->execute($quote, $request->file('file'), $validated['type']),
        );
    }

    public function destroy(Quote $quote, File $file): Response
    {
        abort_unless(
            $file->fileable_type === 'quote' && $file->fileable_id === $quote->id,
            404,
        );

        $file->delete();

        return response()->noContent();
    }
}
