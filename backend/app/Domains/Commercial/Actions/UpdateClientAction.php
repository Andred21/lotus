<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-empresa + client + nested. Nested são substituídos
 * (replace) — simples e previsível para ~10 usuários internos.
 */
class UpdateClientAction
{
    public function __construct(private UserProvisioner $users) {}

    public function execute(Client $client, ClientData $data): Client
    {
        $rut = $this->users->ensureRutAvailable($data->rut, $client->user_id);

        return DB::transaction(function () use ($client, $data, $rut) {
            $client->user->update([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
            ]);

            $client->update([
                'legal_name' => $data->legal_name,
                'type' => $data->type,
                'business_activity' => $data->business_activity instanceof Optional ? null : $data->business_activity,
            ]);

            $client->addresses()->delete();
            foreach ($data->addresses as $address) {
                $client->addresses()->create($address->toArray());
            }

            $client->contacts()->delete();
            foreach ($data->contacts as $contact) {
                $client->contacts()->create($contact->toArray());
            }

            return $client->fresh()->load(['user', 'addresses', 'contacts']);
        });
    }
}
