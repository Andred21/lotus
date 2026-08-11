<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use Illuminate\Support\Facades\DB;

/**
 * Arquiva o cliente (soft-delete) cascateando para nested e User, que é o que o
 * hook `deleting` do model faz.
 *
 * Existe porque o hook ENUMERA-E-APAGA: `contacts()->get()` e depois um
 * `delete()` por instância. Sem transação, cada statement autocommita, e um
 * `CreateClientContactAction` concorrente que insere entre a enumeração e o
 * commit deixa um contato ATIVO sob um cliente arquivado. Sem o mutex, nem a
 * transação resolve — as duas transações não se veriam.
 *
 * O `Client::lockForWrite()` também recusa cliente já arquivado, fechando a
 * outra ponta: a Action concorrente que resolveu o cliente VIVO no binding de
 * rota descobre sob o lock que ele foi arquivado e não escreve o filho órfão.
 */
class DeleteClientAction
{
    public function execute(Client $client): void
    {
        DB::transaction(function () use ($client) {
            Client::lockForWrite($client->id);

            $client->delete();
        });
    }
}
