<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Services\PrimaryContactService;
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
 *
 * Depois do delete, a invariante roda: apagar o PRINCIPAL deixaria a coleção
 * sem nenhum, e desde a D-09 zero-por-efeito-colateral promove o mais antigo
 * dos restantes, em vez de recusar. Recusar aqui obrigaria o usuário a
 * promover outro contato antes de excluir — fricção sem ganho.
 */
class DeleteClientContactAction
{
    public function __construct(private PrimaryContactService $primaryContacts) {}

    public function execute(ClientContact $contact): void
    {
        DB::transaction(function () use ($contact) {
            // Mutex do cliente PRIMEIRO, como nas outras cinco Actions. Sem ele
            // esta era a única escritora que ia direto em `client_contacts`,
            // invertendo a ordem dos locks: as duas varreduras `FOR UPDATE`
            // (esta contagem e o `ensureExactlyOne` da Action concorrente) adquirem
            // as linhas INCREMENTALMENTE, então cada uma podia segurar parte da
            // coleção e bloquear na parte que a outra segurava —
            // `SQLSTATE[40001] ... 1213 Deadlock found` virando 500
            // (review de 2026-08-11, Q-2).
            Client::lockForWrite($contact->client_id);

            // `lockForUpdate` na contagem (Q-5): sem ele, duas exclusões
            // concorrentes leem 2 contatos e apagam os 2, deixando o cliente
            // sem nenhum — estado que o cadastro recusa. Em sqlite (suíte) o
            // lock é no-op; a serialização real vale em MySQL.
            $restantes = $contact->client->contacts()->lockForUpdate()->count();

            if ($restantes <= 1) {
                throw ValidationException::withMessages([
                    'contacts' => __('commercial.client.contact_required'),
                ]);
            }

            $contact->delete();

            $this->primaryContacts->ensureExactlyOne($contact->client);
        });
    }
}
