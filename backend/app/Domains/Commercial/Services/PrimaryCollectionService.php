<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Garante a invariante "EXATAMENTE 1 principal por cliente" na camada de
 * aplicação, nunca em trigger (ADR-02/ADR-08: trigger enxerga a conexão, não o
 * usuário autenticado — a auditoria perderia o autor).
 *
 * **Emenda de 2026-09-03 (D-09).** Até aqui a regra era "no máximo 1", e o
 * docblock declarava que cliente SEM principal era estado válido: o serviço
 * não promovia ninguém. A tela nunca produziu esse estado — o rádio não
 * desmarca e a remoção re-promove —, e a assimetria entre as duas camadas era
 * a ficha D-09. O veredito: quem cede é o backend. Coleção que ficou sem
 * principal por EFEITO COLATERAL (exclusão do principal) promove o mais antigo
 * aqui; entrada EXPLÍCITA sem principal é recusada na validação, que é assunto
 * do DTO e da Action, não deste serviço.
 *
 * **A recusa vale só para CONTATO (D20).** `contacts` é obrigatório (`min:1`,
 * mensagem própria) e ganhou `UmContatoPrincipal` no `ClientData` mais a guarda
 * da `UpdateClientContactAction`; endereço não é obrigatório e não ganhou
 * nenhuma das duas. Consequência deliberada: `PUT /api/addresses/{id}` com
 * `is_primary: false` no único principal CHEGA aqui e é re-promovido em
 * silêncio, em vez de 422 (`PrimaryAddressTest::test_rota_nested_update_desmarcando_o_unico_principal_e_repromovido`).
 * A assimetria é a própria D20, não um esquecimento.
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
    public function ensureExactlyOne(Client $client, ?Model $winner = null): void
    {
        $items = $this->collection($client)
            ->orderBy('id')
            // Leitura TRAVADA, não comum: em REPEATABLE READ o SELECT comum volta
            // do snapshot da transação e NÃO enxerga o principal que a transação
            // concorrente já commitou. A contagem daria 1, o early-return abaixo
            // dispararia e os dois principais sobreviveriam — medido em
            // 2026-08-11. Isto faz a transação ENXERGAR; quem SERIALIZA é o
            // `Client::lockForWrite()` que a Action toma antes de escrever.
            ->lockForUpdate()
            ->get();

        // Coleção vazia não tem principal a garantir. Quem exige ao menos um
        // ITEM é a validação (`contacts.min:1`), não esta invariante.
        if ($items->isEmpty()) {
            return;
        }

        $primaries = $items->where('is_primary', true);

        // Zero principais só acontece por efeito colateral — a entrada
        // explícita já foi recusada antes de chegar aqui (D-09). Promove o mais
        // antigo, que é o que a tela faz ao remover o principal.
        if ($primaries->isEmpty()) {
            $items->first()->update(['is_primary' => true]);

            return;
        }

        if ($primaries->count() === 1) {
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
