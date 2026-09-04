<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Services\PrimaryAddressService;
use Illuminate\Support\Facades\DB;

/**
 * Exclui um endereço pela rota nested.
 *
 * Simétrica à de contato, com UMA diferença deliberada: não há mínimo a
 * guardar, porque endereço não é obrigatório (`contacts` tem `min:1`, endereço
 * não tem). O que ela existe para garantir é a invariante do principal: apagar
 * o endereço principal deixava o cliente sem principal em silêncio, porque o
 * `destroy` apagava direto no controller, sem passar pelo serviço (D-09/D20).
 *
 * Mutex do cliente PRIMEIRO, como nas outras Actions da coleção: a varredura
 * `FOR UPDATE` do `ensureExactlyOne` adquire as linhas incrementalmente, e
 * inverter a ordem dos locks foi o deadlock medido em 2026-08-11 (Q-2).
 */
class DeleteClientAddressAction
{
    public function __construct(private PrimaryAddressService $primaryAddresses) {}

    public function execute(ClientAddress $address): void
    {
        DB::transaction(function () use ($address) {
            Client::lockForWrite($address->client_id);

            $address->delete();

            $this->primaryAddresses->ensureExactlyOne($address->client);
        });
    }
}
