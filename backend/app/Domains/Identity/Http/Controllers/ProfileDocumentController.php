<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\ProfileDocumentUploadData;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Exceptions\RedatorOnlyActionException;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Envio da própria documentação profissional pelo redator. Substituição sim,
 * remoção não (spec D2): não existe `destroy` aqui, e o replace já preserva o
 * anterior soft-deletado, com auditoria.
 *
 * A regra de quais tipos são self-service mora no enum, não neste controller —
 * é a mesma fonte que o DTO de perfil consulta para marcar `self_service`.
 */
class ProfileDocumentController extends Controller
{
    public function store(Request $request, StoreRedatorDocumentAction $action): RedatorDocumentData
    {
        $redator = $request->user()->redator;

        if ($redator === null) {
            throw new RedatorOnlyActionException;
        }

        // A checagem de redator precede a validação: por isso o Data não é
        // parâmetro do método (injetado, validaria o payload antes do 403).
        $data = ProfileDocumentUploadData::validateAndCreate($request->all());

        $file = $action->execute($redator, $data->type, $data->file, $data->valid_until);

        return RedatorDocumentData::fromModel($file);
    }
}
