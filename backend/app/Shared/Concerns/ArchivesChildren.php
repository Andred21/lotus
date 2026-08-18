<?php

namespace App\Shared\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * A mecânica da cascata de arquivamento: marcar o filho como cascateado ao
 * arquivar o pai e desmarcá-lo ao restaurar (spec D2 do bloco
 * `arquivados-e-restauracao`).
 *
 * Vive num lugar só de propósito. `Client` e `Course` provaram o padrão, e os
 * outros seis aggregate roots o replicam — com os helpers copiados, a guarda do
 * `markAndDelete` teria de ser corrigida em oito arquivos, que é exatamente o
 * defeito que o review de 2026-08-18 encontrou (Q-1/Q-4).
 */
trait ArchivesChildren
{
    /**
     * Marca o filho como cascateado e o arquiva.
     *
     * A GUARDA é a regra, não uma otimização: filho JÁ arquivado antes do pai
     * não pertence a esta cascata e não pode ser marcado. Sem ela ele voltaria
     * junto no restore (o modo de falha que a spec D2 existe para impedir) e o
     * `delete()` ainda reescreveria seu `deleted_at`, falsificando quando ele
     * foi arquivado de verdade.
     *
     * Relações escopadas por `SoftDeletes` já não enumeram trashed, mas
     * `Client::user()` é `withTrashed()` — e é por lá que o defeito entrou.
     *
     * A marca vai com `saveQuietly()` ANTES do delete: `runSoftDelete()` só
     * persiste `deleted_at`/`updated_at`, então um atributo sujo não chegaria ao
     * banco pelo `delete()`. O `saveQuietly` não emite evento e não polui a
     * trilha com um `updated` por filho — o evento que importa é o `deleted`,
     * que o `delete()` audita normalmente (ADR-08).
     */
    protected static function markAndDelete(Model $child): void
    {
        if ($child->trashed()) {
            return;
        }

        $child->archived_with_parent = true;
        $child->saveQuietly();
        $child->delete();
    }

    /**
     * Restaura o filho e apaga a marca. `restore()` audita (ADR-08); o
     * `saveQuietly()` que limpa a marca não emite evento, pela mesma razão do
     * `markAndDelete`: o evento que importa é o `restored`.
     */
    protected static function restoreAndUnmark(Model $child): void
    {
        $child->restore();
        $child->archived_with_parent = false;
        $child->saveQuietly();
    }
}
