<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Garante a invariante "no máximo 1 principal por cliente" na camada de
 * aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão, não o
 * usuário autenticado — a auditoria perderia o autor).
 * Cliente SEM principal é estado válido: o serviço não promove ninguém.
 *
 * Contato e endereço tinham a MESMA regra escrita duas vezes, byte a byte
 * (review de 2026-08-11, Q-4): o par divergia calado, e a correção de
 * concorrência de 2026-08-11 precisou ser aplicada nos dois arquivos. A única
 * coisa que difere entre eles é QUAL coleção do cliente é a coleção — é só isso
 * que a subclasse diz.
 *
 * Concorrência: este serviço NÃO serializa nada sozinho. Quem chama abre a
 * transação E toma `Client::lockForWrite()` antes de qualquer escrita.
 */
abstract class PrimaryCollectionService
{
    /** A coleção nested do cliente que carrega o `is_primary`. */
    abstract protected function collection(Client $client): HasMany;

    /**
     * @param  Model|null  $winner  Item que deve permanecer principal. Null (ou
     *                              um item que não está mais marcado) → vence o
     *                              último por id, que é o "último marcado" no
     *                              replace-total.
     */
    public function ensureSingle(Client $client, ?Model $winner = null): void
    {
        $primaries = $this->collection($client)
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

        $keep = $winner !== null && $primaries->contains(fn (Model $m) => $m->is($winner))
            ? $winner
            : $primaries->last();

        // update() por INSTÂNCIA, não pelo query builder: só o evento do model
        // dispara a auditoria (lei §5.2). Um ->where(...)->update(...) aqui
        // desmarcaria o principal sem deixar rastro — peso legal.
        $primaries
            ->reject(fn (Model $m) => $m->is($keep))
            ->each(fn (Model $m) => $m->update(['is_primary' => false]));
    }
}
