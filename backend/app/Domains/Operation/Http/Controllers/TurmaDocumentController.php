<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Operation\Actions\DeleteTurmaDocumentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Data\TurmaDocumentData;
use App\Domains\Operation\Data\TurmaDocumentUploadData;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use App\Shared\Files\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

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
        return $turma->documentacaoObrigatoria()
            ->orderBy('created_at')
            ->get()
            ->map(fn (File $f) => TurmaDocumentData::fromModel($f))
            ->all();
    }

    public function store(TurmaDocumentUploadData $data, Request $request, Turma $turma, StoreTurmaDocumentAction $action): JsonResponse
    {
        $file = $action->execute($turma, $data->type, $data->file, $request->user());

        return TurmaDocumentData::fromModel($file)->toResponse($request)->setStatusCode(201);
    }

    public function destroy(Request $request, Turma $turma, File $file, DeleteTurmaDocumentAction $action): Response
    {
        $action->execute($turma, $file, $request->user());

        return response()->noContent();
    }
}
