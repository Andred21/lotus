<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientAddressAction;
use App\Domains\Commercial\Actions\UpdateClientAddressAction;
use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientAddressController extends Controller
{
    public function store(ClientAddressData $data, Client $client, CreateClientAddressAction $action): ClientAddressData
    {
        return ClientAddressData::from($action->execute($client, $data));
    }

    public function update(ClientAddressData $data, ClientAddress $address, UpdateClientAddressAction $action): ClientAddressData
    {
        return ClientAddressData::from($action->execute($address, $data));
    }

    public function destroy(ClientAddress $address): Response
    {
        $address->delete();

        return response()->noContent();
    }
}
