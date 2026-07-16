<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
use Illuminate\Support\Facades\DB;

/**
 * Atualiza um contato pela rota nested, mantendo a invariante de principal
 * único. Se o payload desmarcou este contato, o serviço ignora o `winner`
 * (ele não está mais entre os principais) e resolve pelo último marcado.
 */
class UpdateClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(ClientContact $contact, ClientContactData $data): ClientContact
    {
        return DB::transaction(function () use ($contact, $data) {
            $contact->update($data->toArray());

            $this->primaryContacts->ensureSingle($contact->client, $contact);

            return $contact->fresh();
        });
    }
}
