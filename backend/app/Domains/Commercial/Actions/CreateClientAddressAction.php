<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Services\PrimaryAddressService;
use Illuminate\Support\Facades\DB;

/**
 * Cria um endereço pela rota nested. Existe para a regra de principal único
 * valer em toda a API, não só no replace-total do cadastro de cliente.
 */
class CreateClientAddressAction
{
    public function __construct(private PrimaryAddressService $primaryAddresses) {}

    public function execute(Client $client, ClientAddressData $data): ClientAddress
    {
        return DB::transaction(function () use ($client, $data) {
            Client::lockForWrite($client->id);

            $address = $client->addresses()->create($data->toArray());

            $this->primaryAddresses->ensureSingle($client, $address);

            return $address->fresh();
        });
    }
}
