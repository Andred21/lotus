<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;

/**
 * Garante a invariante "no máximo 1 endereço principal por cliente" na camada
 * de aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão,
 * não o usuário autenticado — a auditoria perderia o autor).
 * Cliente SEM principal é estado válido: o serviço não promove ninguém.
 *
 * Espelha o `PrimaryContactService`, sem o parâmetro `winner`: endereço não
 * tem rota nested, então o único desempate possível é o do replace-total —
 * vence o último por id, que é o "último marcado" no payload.
 */
class PrimaryAddressService
{
    public function ensureSingle(Client $client): void
    {
        $primaries = $client->addresses()
            ->where('is_primary', true)
            ->orderBy('id')
            ->get();

        if ($primaries->count() <= 1) {
            return;
        }

        $keep = $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (ClientAddress $a) => $a->is($keep))
            ->each(fn (ClientAddress $a) => $a->update(['is_primary' => false]));
    }
}
