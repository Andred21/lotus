<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Services\PrimaryAddressService;
use App\Domains\Commercial\Services\PrimaryContactService;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Cria o cliente completo (usuário-empresa + client + nested) numa transação.
 * O provisionamento do User é delegado ao UserProvisioner (compartilhado entre
 * atores). O usuário-cliente não loga (RN-01): is_active=false.
 */
class CreateClientAction
{
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
        private PrimaryAddressService $primaryAddresses,
    ) {}

    public function execute(ClientData $data): Client
    {
        // A regra "um ou mais contatos" (Drive, ratificada 2026-07-31) mora
        // aqui, e não em rules(): a coleção precisa ser Optional para o PUT
        // parar de apagá-la por omissão, e rules() é estático — não sabe o
        // verbo. Precedente: CreateStudentAction, que também exige na Action o
        // que o DTO não consegue exigir sozinho.
        //
        // ANTES DA TRANSAÇÃO, e não no meio dela: é entrada pura, custo zero de
        // banco. Rodando depois do `provision()`, um POST sem contatos com
        // e-mail ocupado devolvia só `email` — o operador só descobria a
        // segunda falta na requisição seguinte (review de 2026-08-13, Q-2).
        if ($data->contacts instanceof Optional || $data->contacts === []) {
            throw ValidationException::withMessages([
                'contacts' => ClientData::CONTATO_OBRIGATORIO,
            ]);
        }

        return DB::transaction(function () use ($data) {
            // Sem `Client::lockForWrite()`: o cliente nasce aqui. Não existe
            // transação concorrente disputando um id que ainda não foi gerado.
            $user = $this->users->provision(
                type: 'cliente',
                name: $data->name,
                rut: $data->rut,
                email: $data->email,
                phone: $data->phone instanceof Optional ? null : $data->phone,
            );

            $client = $user->client()->create([
                'legal_name' => $data->legal_name,
                'type' => $data->type,
                'business_activity' => $data->business_activity instanceof Optional ? null : $data->business_activity,
            ]);

            if (! $data->addresses instanceof Optional) {
                foreach ($data->addresses as $address) {
                    $client->addresses()->create($address->toArray());
                }
            }

            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            $this->primaryAddresses->ensureSingle($client);
            $this->primaryContacts->ensureSingle($client);

            return $client->loadListingData();
        });
    }
}
