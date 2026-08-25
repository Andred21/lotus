<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Files\ContentClass;
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
            'file' => ContentClass::Documento->regras(),
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
        // Posse garantida pelo `->scopeBindings()` da rota: o {document} é
        // resolvido por $redator->documents(), então documento de outro redator
        // nunca chega aqui (404 no binding).
        $document->delete();

        return response()->noContent();
    }
}
