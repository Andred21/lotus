<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\ClientAddressData;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Services\PrimaryAddressService;
use Illuminate\Support\Facades\DB;

/**
 * Atualiza um endereço pela rota nested, mantendo a invariante de principal
 * único. Se o payload desmarcou este endereço, sobram 0 ou 1 principais e o
 * serviço faz early-return (no-op) — ninguém é promovido.
 */
class UpdateClientAddressAction
{
    public function __construct(private PrimaryAddressService $primaryAddresses) {}

    public function execute(ClientAddress $address, ClientAddressData $data): ClientAddress
    {
        return DB::transaction(function () use ($address, $data) {
            $address->update($data->toArray());

            $this->primaryAddresses->ensureSingle($address->client, $address);

            return $address->fresh();
        });
    }
}
