<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryAddressService;
use App\Domains\Commercial\Services\PrimaryContactService;
use App\Domains\Identity\Services\UserProvisioner;
use App\Shared\Data\WritableAttributes;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza usuário-empresa + client + nested. Nested são substituídos
 * (replace) — simples e previsível para ~10 usuários internos.
 */
class UpdateClientAction
{
    public function __construct(
        private UserProvisioner $users,
        private PrimaryContactService $primaryContacts,
        private PrimaryAddressService $primaryAddresses,
    ) {}

    public function execute(Client $client, ClientData $data): Client
    {
        return DB::transaction(function () use ($client, $data) {
            // Mutex ANTES de qualquer escrita: depois inverteria a ordem dos
            // locks e produziria deadlock (ver Client::lockForWrite).
            Client::lockForWrite($client->id);

            // Unicidade DENTRO da transação que escreve, pelas duas colunas: o
            // e-mail faltava aqui e a colisão virava 500 (achado 4).
            $rut = $this->users->ensureIdentityAvailable($data->rut, $data->email, $client->user_id);

            $this->users->writing(fn () => $client->user->update(WritableAttributes::from([
                'name' => $data->name,
                'rut' => $rut,
                'email' => $data->email,
                'phone' => $data->phone,
            ])));

            $client->update(WritableAttributes::from([
                'legal_name' => $data->legal_name,
                'type' => $data->type,
                'business_activity' => $data->business_activity,
            ]));

            // Replace dos nested. Soft-delete por instância para a auditoria
            // registrar o que saiu (o builder emitiria UPDATE sem eventos).
            // Coleção `Optional` (ausente do payload) NÃO entra no replace: quem
            // não mandou a coleção não pediu para apagá-la (achado 5).
            if (! $data->addresses instanceof Optional) {
                $client->addresses()->get()->each(fn (ClientAddress $a) => $a->delete());
                foreach ($data->addresses as $address) {
                    $client->addresses()->create($address->toArray());
                }
            }

            if (! $data->contacts instanceof Optional) {
                $client->contacts()->get()->each(fn (ClientContact $c) => $c->delete());
                foreach ($data->contacts as $contact) {
                    $client->contacts()->create($contact->toArray());
                }
            }

            $this->primaryAddresses->ensureSingle($client);
            $this->primaryContacts->ensureSingle($client);

            return $client->fresh()->loadListingData();
        });
    }
}
