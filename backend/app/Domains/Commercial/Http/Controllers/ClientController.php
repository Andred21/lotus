<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientAction;
use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ClientController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.client.view', only: ['index', 'show']),
            new Middleware('permission:commercial.client.create', only: ['store']),
            new Middleware('permission:commercial.client.update', only: ['update']),
            new Middleware('permission:commercial.client.delete', only: ['destroy']),
        ];
    }

    /** @return array<ClientData> */
    public function index(): array
    {
        return Client::with(['user', 'addresses', 'contacts'])
            ->get()
            ->map(fn (Client $c) => ClientData::fromModel($c))
            ->all();
    }

    public function store(ClientData $data, CreateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($data));
    }

    public function show(Client $client): ClientData
    {
        return ClientData::fromModel($client->load(['user', 'addresses', 'contacts']));
    }

    public function update(ClientData $data, Client $client, UpdateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($client, $data));
    }

    public function destroy(Client $client): Response
    {
        $client->delete();

        return response()->noContent();
    }
}
