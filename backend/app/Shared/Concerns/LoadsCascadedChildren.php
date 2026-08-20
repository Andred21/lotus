<?php

namespace App\Shared\Concerns;

use Closure;

/**
 * O lado de LEITURA da cascata de arquivamento, gêmeo de `ArchivesChildren`.
 *
 * A lista de Arquivados existe para o operador RECONHECER o registro antes de
 * restaurá-lo, e com a projeção normal ela mostra o contrário do que aconteceu:
 * comuna `—` e `0` contatos, porque a cascata acabou de soft-deletar cada filho
 * e o global scope de `SoftDeletes` os esconde do eager load (Q-8 do review de
 * 2026-08-18).
 *
 * Vive num lugar só pela mesma razão que `ArchivesChildren`: `Client` e `Course`
 * provaram o padrão e os outros seis aggregate roots o replicam.
 */
trait LoadsCascadedChildren
{
    /**
     * Eager load das coleções como elas estavam no instante do arquivamento:
     * o filho ATIVO e o que ESTA cascata levou junto.
     *
     * O filho arquivado de propósito ANTES do pai fica de fora — mesma regra do
     * restore (spec D2). Ele não estava na tela quando o pai foi arquivado e
     * também não volta com ele; mostrá-lo aqui prometeria uma restauração que
     * não acontece.
     *
     * @param  list<string>  $relations
     * @return array<string, Closure>
     */
    protected static function asOfArchiving(array $relations): array
    {
        return array_fill_keys($relations, static function ($query): void {
            $deletedAt = $query->getModel()->getQualifiedDeletedAtColumn();

            $query->withTrashed()->where(
                fn ($q) => $q->whereNull($deletedAt)->orWhere('archived_with_parent', true)
            );
        });
    }
}
