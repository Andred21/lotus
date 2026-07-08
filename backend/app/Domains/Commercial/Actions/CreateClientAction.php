<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o cliente completo (usuário-empresa + client + nested) numa transação.
 * O provisionamento do User é delegado ao UserProvisioner (compartilhado entre
 * atores). O usuário-cliente não loga (RN-01): is_active=false.
 */
class CreateClientAction
{
    public function __construct(private UserProvisioner $users) {}

    public function execute(ClientData $data): Client
    {
        return DB::transaction(function () use ($data) {
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

            foreach ($data->addresses as $address) {
                $client->addresses()->create($address->toArray());
            }

            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            return $client->load(['user', 'addresses', 'contacts']);
        });
    }
}
