<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rules\Enum;

class RedatorDocumentController extends Controller
{
    public function store(Request $request, Redator $redator, StoreRedatorDocumentAction $action): RedatorDocumentData
    {
        $validated = $request->validate([
            'type' => ['required', new Enum(RedatorDocumentType::class)],
            'file' => ['required', 'file', 'max:10240'],
            'valid_until' => ['nullable', 'date'],
        ]);

        $file = $action->execute(
            $redator,
            RedatorDocumentType::from($validated['type']),
            $request->file('file'),
            isset($validated['valid_until']) ? Carbon::parse($validated['valid_until']) : null,
        );

        return RedatorDocumentData::fromModel($file);
    }

    public function destroy(Redator $redator, File $document): Response
    {
        abort_unless(
            $document->fileable_type === 'redator' && $document->fileable_id === $redator->id,
            404,
        );

        $document->delete();

        return response()->noContent();
    }
}
