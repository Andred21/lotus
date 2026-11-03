<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\PhotoUploadData;
use Illuminate\Http\Response;

/**
 * Foto (logo) do cliente. Vive em Commercial porque a permissão é
 * `commercial.client.update`; a regra continua sendo a de Identity — cliente é
 * extensão 1:1 de `User`, como redator e aluno (spec D1/D2).
 */
class ClientPhotoController extends Controller
{
    public function store(PhotoUploadData $data, Client $client, UserPhotoService $service): Response
    {
        $service->store($client->user, $data->photo);

        return response()->noContent();
    }

    public function destroy(Client $client, UserPhotoService $service): Response
    {
        $service->remove($client->user);

        return response()->noContent();
    }
}
