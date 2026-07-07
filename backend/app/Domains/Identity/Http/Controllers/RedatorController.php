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
    public function index(): array
    {
        return Redator::with('user')->get()
            ->map(fn (Redator $r) => RedatorData::from([
                'id'    => $r->id,
                'name'  => $r->user->name,
                'rut'   => $r->user->rut,
                'email' => $r->user->email,
                'phone' => $r->user->phone,
            ]))
            ->all();
    }

    public function store(RedatorData $data, Request $request, CreateRedatorAction $action): RedatorData
    {
        $redator = $action->execute($data, $request->file('documents', []));

        return RedatorData::from([
            'id'    => $redator->id,
            'name'  => $redator->user->name,
            'rut'   => $redator->user->rut,
            'email' => $redator->user->email,
            'phone' => $redator->user->phone,
        ]);
    }

    public function show(Redator $redator): RedatorData
    {
        $redator->load('user');

        return RedatorData::from([
            'id'    => $redator->id,
            'name'  => $redator->user->name,
            'rut'   => $redator->user->rut,
            'email' => $redator->user->email,
            'phone' => $redator->user->phone,
        ]);
    }

    public function destroy(Redator $redator): Response
    {
        $redator->delete();

        return response()->noContent();
    }
}
