<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\StoreRedatorDocumentAction;
use App\Domains\Identity\Data\RedatorDocumentData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Http\Controllers\Controller;
use App\Shared\Files\ContentClass;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        abort_unless($redator !== null, 403, 'Apenas redatores enviam documentação profissional.');

        $validated = $request->validate([
            'type' => ['required', Rule::in(RedatorDocumentType::selfServiceValues())],
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
}
