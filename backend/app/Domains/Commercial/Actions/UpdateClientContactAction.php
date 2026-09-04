<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientContactData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Atualiza um contato pela rota nested, mantendo a invariante de principal
 * único.
 *
 * Desmarcar o ÚNICO principal é entrada explícita, e desde a D-09 é recusada
 * com 422: fechar a regra só no DTO do pai deixaria esta rota esvaziando o
 * principal pela porta dos fundos, que é exatamente o buraco que a
 * `DeleteClientContactAction` já teve de tapar para o mínimo de um contato.
 */
class UpdateClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(ClientContact $contact, ClientContactData $data): ClientContact
    {
        return DB::transaction(function () use ($contact, $data) {
            Client::lockForWrite($contact->client_id);

            $desmarcandoPrincipal = $data->is_primary === false && $contact->is_primary;

            if ($desmarcandoPrincipal) {
                // `lockForUpdate` pela mesma razão da contagem da exclusão: sem
                // ele, duas desmarcações concorrentes leem "há outro principal"
                // e as duas passam.
                $outros = $contact->client->contacts()
                    ->where('id', '!=', $contact->id)
                    ->where('is_primary', true)
                    ->lockForUpdate()
                    ->count();

                if ($outros === 0) {
                    throw ValidationException::withMessages([
                        'is_primary' => __('commercial.client.primary_contact_required'),
                    ]);
                }
            }

            $contact->update($data->toArray());

            $this->primaryContacts->ensureExactlyOne($contact->client, $contact);

            return $contact->fresh();
        });
    }
}
