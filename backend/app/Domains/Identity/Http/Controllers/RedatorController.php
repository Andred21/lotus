<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RedatorController extends Controller
{
    /** @return array<RedatorData> */
    public function index(): array
    {
        return Redator::with('user')->get()
            ->map(fn (Redator $r) => RedatorData::fromModel($r))
            ->all();
    }

    public function store(RedatorData $data, Request $request, CreateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($data, $request->file('documents', [])));
    }

    public function show(Redator $redator): RedatorData
    {
        return RedatorData::fromModel($redator->load('user'));
    }

    public function destroy(Redator $redator): Response
    {
        $redator->delete();

        return response()->noContent();
    }
}
