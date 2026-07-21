<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Actions\DeleteTurmaAction;
use App\Domains\Operation\Actions\DesignateRedatorAction;
use App\Domains\Operation\Actions\RemoveRedatorAction;
use App\Domains\Operation\Actions\UpdateTurmaAction;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Turma;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TurmaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:operation.turma.view', only: ['index', 'show']),
            new Middleware('permission:operation.turma.create', only: ['store']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.assign_redator', only: ['designateRedator', 'removeRedator']),
        ];
    }

    public function store(TurmaData $data, Quote $quote, CreateTurmaAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($quote, $data)->load('redatores.user'));
    }

    /** @return array<TurmaData> */
    public function index(): array
    {
        return Turma::with('redatores.user')->get()
            ->map(fn (Turma $t) => TurmaData::fromModel($t))
            ->all();
    }

    public function show(Turma $turma): TurmaData
    {
        return TurmaData::fromModel($turma->load('redatores.user'));
    }

    public function update(TurmaData $data, Turma $turma, UpdateTurmaAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($turma, $data));
    }

    public function destroy(Turma $turma, DeleteTurmaAction $action): Response
    {
        $action->execute($turma);

        return response()->noContent();
    }

    public function designateRedator(Turma $turma, Redator $redator, DesignateRedatorAction $action): JsonResponse
    {
        return TurmaData::fromModel($action->execute($turma, $redator))
            ->toResponse(request())
            ->setStatusCode(200);
    }

    public function removeRedator(Turma $turma, Redator $redator, RemoveRedatorAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($turma, $redator));
    }
}
