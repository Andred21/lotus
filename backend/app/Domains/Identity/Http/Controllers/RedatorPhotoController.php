<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Foto do redator. A foto é do `User` por trás dele (spec D3). */
class RedatorPhotoController extends Controller
{
    public function store(Request $request, Redator $redator, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($redator->user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Redator $redator, UserPhotoService $service): Response
    {
        $service->remove($redator->user);

        return response()->noContent();
    }
}
