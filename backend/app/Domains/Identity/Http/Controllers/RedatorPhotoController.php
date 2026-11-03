<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\PhotoUploadData;
use Illuminate\Http\Response;

/** Foto do redator. A foto é do `User` por trás dele (spec D3). */
class RedatorPhotoController extends Controller
{
    public function store(PhotoUploadData $data, Redator $redator, UserPhotoService $service): Response
    {
        $service->store($redator->user, $data->photo);

        return response()->noContent();
    }

    public function destroy(Redator $redator, UserPhotoService $service): Response
    {
        $service->remove($redator->user);

        return response()->noContent();
    }
}
