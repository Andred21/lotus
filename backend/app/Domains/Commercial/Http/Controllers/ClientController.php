<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientAction;
use App\Domains\Commercial\Actions\DeleteClientAction;
use App\Domains\Commercial\Actions\RestoreClientAction;
use App\Domains\Commercial\Actions\UpdateClientAction;
use App\Domains\Commercial\Data\ArchivedClientData;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ClientController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:commercial.client.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:commercial.client.create', only: ['store']),
            new Middleware('permission:commercial.client.update', only: ['update']),
            new Middleware('permission:commercial.client.delete', only: ['destroy']),
            new Middleware('permission:commercial.client.restore', only: ['restore']),
        ];
    }

    /** @return array<ClientData> */
    public function index(): array
    {
        return Client::query()->withListingData()
            ->get()
            ->map(fn (Client $c) => ClientData::fromModel($c))
            ->all();
    }

    /** @return array<ArchivedClientData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Client::onlyTrashed()->withArchivedListingData()->get(),
            Client::class,
            fn (Client $c, string $em, ?string $por) => new ArchivedClientData(
                client: ClientData::fromModel($c),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    public function restore(int $client, RestoreClientAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Client::query(), $client);

        return RespostaDeRecurso::ok(ClientData::fromModel($action->execute($model)));
    }

    public function store(ClientData $data, CreateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($data));
    }

    public function show(Client $client): ClientData
    {
        return ClientData::fromModel($client->loadListingData());
    }

    public function update(ClientData $data, Client $client, UpdateClientAction $action): ClientData
    {
        return ClientData::fromModel($action->execute($client, $data));
    }

    public function destroy(Client $client, DeleteClientAction $action): Response
    {
        $action->execute($client);

        return response()->noContent();
    }
}
