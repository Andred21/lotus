<?php

namespace App\Domains\Commercial\Http\Controllers;

use App\Domains\Commercial\Actions\CreateClientContactAction;
use App\Domains\Commercial\Actions\UpdateClientContactAction;
use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

class ClientContactController extends Controller
{
    public function store(ClientContactData $data, Client $client, CreateClientContactAction $action): ClientContactData
    {
        return ClientContactData::from($action->execute($client, $data));
    }

    public function update(ClientContactData $data, ClientContact $contact, UpdateClientContactAction $action): ClientContactData
    {
        return ClientContactData::from($action->execute($contact, $data));
    }

    public function destroy(ClientContact $contact): Response
    {
        $contact->delete();

        return response()->noContent();
    }
}
