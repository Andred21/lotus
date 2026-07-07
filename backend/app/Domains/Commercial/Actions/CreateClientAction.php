<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cria o cliente completo (usuário-empresa + client + nested) numa transação.
 * O usuário-cliente não loga (RN-01): is_active=false, senha placeholder.
 */
class CreateClientAction
{
    public function execute(ClientData $data): Client
    {
        $rut = Rut::parse($data->rut)->format();

        if (User::where('rut', $rut)->exists()) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return DB::transaction(function () use ($data, $rut) {
            $user = User::create([
                'name'      => $data->name,
                'rut'       => $rut,
                'email'     => $data->email,
                'phone'     => $data->phone instanceof \Spatie\LaravelData\Optional ? null : $data->phone,
                'password'  => bin2hex(random_bytes(16)), // placeholder; cliente não loga
                'type'      => 'cliente',
                'is_active' => false,
            ]);

            $client = $user->client()->create([
                'legal_name'        => $data->legal_name,
                'type'              => $data->type,
                'business_activity' => $data->business_activity instanceof \Spatie\LaravelData\Optional ? null : $data->business_activity,
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
