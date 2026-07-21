<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Data\TurmaDocumentData;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rules\Enum;

class TurmaDocumentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index']),
            new Middleware('permission:operation.turma.submit_docs', only: ['store', 'destroy']),
        ];
    }

    /** @return array<TurmaDocumentData> */
    public function index(Turma $turma): array
    {
        return $turma->files()
            ->whereIn('type', array_column(TurmaDocumentType::cases(), 'value'))
            ->orderBy('created_at')
            ->get()
            ->map(fn (File $f) => TurmaDocumentData::fromModel($f))
            ->all();
    }

    public function store(Request $request, Turma $turma, StoreTurmaDocumentAction $action): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', new Enum(TurmaDocumentType::class)],
            'file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $file = $action->execute($turma, TurmaDocumentType::from($validated['type']), $request->file('file'));

        return TurmaDocumentData::fromModel($file)->toResponse($request)->setStatusCode(201);
    }

    public function destroy(Turma $turma, File $file, DeleteTurmaDocumentAction $action): Response
    {
        $action->execute($turma, $file);

        return response()->noContent();
    }
}
