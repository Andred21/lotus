<?php

namespace App\Domains\Operation\Http\Controllers;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Actions\CreateTurmaAction;
use App\Domains\Operation\Data\TurmaData;
use App\Http\Controllers\Controller;
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
}
