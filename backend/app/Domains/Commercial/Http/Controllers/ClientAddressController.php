<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientAddressController extends Controller
{
    public function store(ClientAddressData $data, Client $client): ClientAddressData
    {
        $address = $client->addresses()->create($data->toArray());

        return ClientAddressData::from($address);
    }

    public function update(ClientAddressData $data, ClientAddress $address): ClientAddressData
    {
        $address->update($data->toArray());

        return ClientAddressData::from($address->fresh());
    }

    public function destroy(ClientAddress $address): Response
    {
        $address->delete();

        return response()->noContent();
    }
}
