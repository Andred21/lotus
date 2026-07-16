<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
use Illuminate\Support\Facades\DB;

/**
 * Cria um contato pela rota nested. Existe para a regra de principal único
 * valer em toda a API, não só no replace-total do cadastro de cliente.
 */
class CreateClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(Client $client, ClientContactData $data): ClientContact
    {
        return DB::transaction(function () use ($client, $data) {
            $contact = $client->contacts()->create($data->toArray());

            $this->primaryContacts->ensureSingle($client, $contact);

            return $contact->fresh();
        });
    }
}
