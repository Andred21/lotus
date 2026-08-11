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
 * Espelha o `PrimaryContactService`, com o mesmo parâmetro `winner`: a rota
 * nested de endereço já existe (`ClientAddressController`, `5bc1d87`, anterior
 * a este serviço) — sem `winner`, um PUT que marca um endereço menos recente
 * como principal seria sobrescrito pelo "último por id" e o usuário veria o
 * endereço errado como principal, em silêncio.
 *
 * Concorrência: este serviço NÃO serializa nada sozinho. Quem chama abre a
 * transação E toma `Client::lockForWrite()` antes de qualquer escrita.
 */
class PrimaryAddressService
{
    /**
     * @param  ClientAddress|null  $winner  Endereço que deve permanecer principal.
     *                                      Null (ou um endereço que não está mais
     *                                      marcado) → vence o último por id, que é
     *                                      o "último marcado" no replace-total.
     */
    public function ensureSingle(Client $client, ?ClientAddress $winner = null): void
    {
        $primaries = $client->addresses()
            ->where('is_primary', true)
            ->orderBy('id')
            // Leitura TRAVADA, não comum: em REPEATABLE READ o SELECT comum volta
            // do snapshot da transação e NÃO enxerga o principal que a transação
            // concorrente já commitou. A contagem daria 1, o early-return abaixo
            // dispararia e os dois principais sobreviveriam — medido em
            // 2026-08-11. Isto faz a transação ENXERGAR; quem SERIALIZA é o
            // `Client::lockForWrite()` que a Action toma antes de escrever.
            ->lockForUpdate()
            ->get();

        if ($primaries->count() <= 1) {
            return;
        }

        $keep = $winner !== null && $primaries->contains(fn (ClientAddress $a) => $a->is($winner))
            ? $winner
            : $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (ClientAddress $a) => $a->is($keep))
            ->each(fn (ClientAddress $a) => $a->update(['is_primary' => false]));
    }
}
