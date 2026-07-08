<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RedatorController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show']),
            new Middleware('permission:identity.user.create', only: ['store']),
            new Middleware('permission:identity.user.update', only: ['update']),
            new Middleware('permission:identity.user.delete', only: ['destroy']),
        ];
    }

    /** @return array<RedatorData> */
    public function index(): array
    {
        return Redator::with(['user', 'courses'])->get()
            ->map(fn (Redator $r) => RedatorData::fromModel($r))
            ->all();
    }

    public function store(RedatorData $data, Request $request, CreateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($data, $request->file('documents', [])));
    }

    public function show(Redator $redator): RedatorData
    {
        return RedatorData::fromModel($redator->load(['user', 'courses']));
    }

    public function update(RedatorData $data, Redator $redator, Request $request, UpdateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($redator, $data, $request->file('documents', [])));
    }

    public function destroy(Redator $redator): Response
    {
        $redator->delete();

        return response()->noContent();
    }
}
