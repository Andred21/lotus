<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Actions\ConcludeTurmaAction;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Actions\DeleteTurmaAction;
use App\Domains\Operation\Actions\DesignateRedatorAction;
use App\Domains\Operation\Actions\RemoveRedatorAction;
use App\Domains\Operation\Actions\UpdateTurmaAction;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\ManualPdfService;
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
            new Middleware('permission:operation.turma.view', only: ['index', 'show', 'manual']),
            new Middleware('permission:operation.turma.create', only: ['store']),
            new Middleware('permission:operation.turma.update', only: ['update']),
            new Middleware('permission:operation.turma.delete', only: ['destroy']),
            new Middleware('permission:operation.turma.assign_redator', only: ['designateRedator', 'removeRedator']),
            new Middleware('permission:operation.turma.complete', only: ['conclude']),
        ];
    }

    public function store(TurmaData $data, Quote $quote, CreateTurmaAction $action): TurmaData
    {
        return TurmaData::fromModel($action->execute($quote, $data)->load('redatores.user'));
    }

    /** @return array<TurmaData> */
    public function index(): array
    {
        return Turma::query()->withListingData()->latest()->get()
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

    public function conclude(Turma $turma, ConcludeTurmaAction $action): JsonResponse
    {
        return TurmaData::fromModel($action->execute($turma)->load('redatores.user'))
            ->toResponse(request())
            ->setStatusCode(200);
    }

    public function manual(Turma $turma, ManualPdfService $manual): Response
    {
        return response($manual->render($turma), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"manual-turma-{$turma->id}.pdf\"",
        ]);
    }
}
