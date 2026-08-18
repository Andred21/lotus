<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o cliente e, pelo hook `restored` do model, os filhos que a cascata
 * de arquivamento marcou.
 *
 * Simétrica da `DeleteClientAction`, e pelo mesmo motivo: o enumera-e-restaura
 * tem a mesma janela de check-then-act do enumera-e-apaga. A trava é `lockRow`,
 * não `lockForWrite` — esta recusa cliente arquivado, que é exatamente o estado
 * de quem vai ser restaurado.
 */
class RestoreClientAction
{
    public function execute(Client $client): Client
    {
        return DB::transaction(function () use ($client) {
            $locked = Client::lockRow($client->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então
            // chegar aqui com registro ativo significa que alguém restaurou
            // entre o binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked->loadListingData();
            }

            $locked->restore();

            return $locked->loadListingData();
        });
    }
}
