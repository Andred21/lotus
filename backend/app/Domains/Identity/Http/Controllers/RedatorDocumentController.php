<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Data\RedatorDocumentUploadData;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Illuminate\Http\Response;

class RedatorDocumentController extends Controller
{
    public function store(RedatorDocumentUploadData $data, Redator $redator, StoreRedatorDocumentAction $action): RedatorDocumentData
    {
        return RedatorDocumentData::fromModel(
            $action->execute($redator, $data->type, $data->file, $data->valid_until),
        );
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
