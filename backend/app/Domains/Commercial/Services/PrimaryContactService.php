<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;

/**
 * Garante a invariante "no máximo 1 contato principal por cliente" na camada de
 * aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão, não o
 * usuário autenticado — a auditoria perderia o autor).
 * Cliente SEM principal é estado válido: o serviço não promove ninguém.
 */
class PrimaryContactService
{
    /**
     * @param  ClientContact|null  $winner  Contato que deve permanecer principal.
     *                                      Null (ou um contato que não está mais
     *                                      marcado) → vence o último por id, que é
     *                                      o "último marcado" no replace-total.
     */
    public function ensureSingle(Client $client, ?ClientContact $winner = null): void
    {
        $primaries = $client->contacts()
            ->where('is_primary', true)
            ->orderBy('id')
            ->get();

        if ($primaries->count() <= 1) {
            return;
        }

        $keep = $winner !== null && $primaries->contains(fn (ClientContact $c) => $c->is($winner))
            ? $winner
            : $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (ClientContact $c) => $c->is($keep))
            ->each(fn (ClientContact $c) => $c->update(['is_primary' => false]));
    }
}
