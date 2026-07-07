<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientAction;
use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientController extends Controller
{
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
