<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui um contato pela rota nested. Existe pelo mesmo motivo das outras duas
 * Actions de contato: a regra da coleção vale em TODOS os caminhos de escrita,
 * não só no replace-total do cadastro de cliente.
 *
 * Aqui a regra é o MÍNIMO de um contato (spec D13, `ClientData::rules()`).
 * Fechá-la só no DTO do pai deixava esta rota esvaziando a coleção pela porta
 * dos fundos — o cliente ficava sem nenhum contato, estado que o cadastro
 * recusa.
 *
 * A checagem e o delete rodam na MESMA transação, com a contagem sob
 * `lockForUpdate` (Q-5): fora dela, o par count/delete é check-then-act e duas
 * exclusões concorrentes esvaziam a coleção.
 */
class DeleteClientContactAction
{
    public function execute(ClientContact $contact): void
    {
        DB::transaction(function () use ($contact) {
            // `lockForUpdate` na contagem (Q-5): sem ele, duas exclusões
            // concorrentes leem 2 contatos e apagam os 2, deixando o cliente
            // sem nenhum — estado que o cadastro recusa. Em sqlite (suíte) o
            // lock é no-op; a serialização real vale em MySQL.
            $restantes = $contact->client->contacts()->lockForUpdate()->count();

            if ($restantes <= 1) {
                throw ValidationException::withMessages([
                    'contacts' => 'O cliente precisa ter ao menos um contato.',
                ]);
            }

            $contact->delete();
        });
    }
}
