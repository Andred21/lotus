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
use App\Shared\Audit\ArchiveTrailQuery;
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
        $clients = Client::onlyTrashed()->withListingData()->get();

        $autores = ArchiveTrailQuery::archivedBy(Client::class, $clients->pluck('id')->all());

        return $clients
            ->map(fn (Client $c) => new ArchivedClientData(
                client: ClientData::fromModel($c),
                archived_at: $c->deleted_at->toIso8601String(),
                archived_by: $autores[$c->id] ?? null,
            ))
            ->all();
    }

    // 200 e não 201: `Data::toResponse()` força 201 em qualquer POST
    // (`ResponsableData::calculateResponseStatus`), e restaurar não cria
    // recurso. Mesmo precedente de `QuoteController::approve`.
    public function restore(int $client, RestoreClientAction $action): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de SoftDeletes e nunca acharia um arquivado. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO, que é o comportamento
        // da spec D5.
        $model = Client::onlyTrashed()->whereKey($client)->firstOrFail();

        return ClientData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
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
