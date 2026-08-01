<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Validation\ValidationException;

/**
 * Exclui um contato pela rota nested. Existe pelo mesmo motivo das outras duas
 * Actions de contato: a regra da coleção vale em TODOS os caminhos de escrita,
 * não só no replace-total do cadastro de cliente.
 *
 * Aqui a regra é o MÍNIMO de um contato (spec D13, `ClientData::rules()`).
 * Fechá-la só no DTO do pai deixava esta rota esvaziando a coleção pela porta
 * dos fundos — o cliente ficava sem nenhum contato, estado que o cadastro
 * recusa. Escrita única: sem transação, mesmo padrão do `DeleteQuoteAction`.
 */
class DeleteClientContactAction
{
    public function execute(ClientContact $contact): void
    {
        if ($contact->client->contacts()->count() <= 1) {
            throw ValidationException::withMessages([
                'contacts' => 'O cliente precisa ter ao menos um contato.',
            ]);
        }

        $contact->delete();
    }
}
