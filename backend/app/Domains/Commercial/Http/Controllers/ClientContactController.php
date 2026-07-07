<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientContactController extends Controller
{
    public function store(ClientContactData $data, Client $client): ClientContactData
    {
        $contact = $client->contacts()->create($data->toArray());

        return ClientContactData::from($contact);
    }

    public function update(ClientContactData $data, ClientContact $contact): ClientContactData
    {
        $contact->update($data->toArray());

        return ClientContactData::from($contact->fresh());
    }

    public function destroy(ClientContact $contact): Response
    {
        $contact->delete();

        return response()->noContent();
    }
}
