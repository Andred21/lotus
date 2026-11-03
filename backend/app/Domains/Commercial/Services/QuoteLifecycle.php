<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Validation\ValidationException;

/**
 * Guardião das transições da cotação: dono da matriz da spec D2.
 *
 *   aprovar  → recusa aprovada;
 *   recusar  → recusa recusada e recusa cotação com turma (ativa ou concluída;
 *              a arquivada não conta);
 *   arquivar → recusa aprovada.
 *
 * Antes de qualquer regra, a cotação travada que estiver arquivada é recusada:
 * o route binding entregou a linha viva, mas outra requisição pode tê-la
 * arquivado antes do lock.
 *
 * Todos os métodos rodam DENTRO de `DB::transaction`: travam a linha com
 * `Quote::lockRow()` e julgam o estado SOBRE a linha travada, nunca sobre a
 * instância do binding (que pode estar velha). Ordem de lock da spec D4: a
 * cotação é travada primeiro, e a turma, se houver, só depois, por quem a
 * cria ou restaura — todos os lados na mesma ordem, sem ciclo. O lock é
 * no-op em sqlite: errar aqui só aparece em MySQL.
 */
class QuoteLifecycle
{
    public static function lockToApprove(int $quoteId): Quote
    {
        $quote = self::lockLive($quoteId);

        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.already_approved'),
            ]);
        }

        return $quote;
    }

    public static function lockToReject(int $quoteId): Quote
    {
        $quote = self::lockLive($quoteId);

        if ($quote->status === QuoteStatus::Rejected) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.already_rejected'),
            ]);
        }

        if (self::temTurma($quote)) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.turma_exists_cannot_reject'),
            ]);
        }

        return $quote;
    }

    public static function lockToArchive(int $quoteId): Quote
    {
        $quote = self::lockLive($quoteId);

        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.approved_cannot_delete'),
            ]);
        }

        return $quote;
    }

    /** Turma ativa ou concluída da cotação (a arquivada fica fora: `exists()` respeita o soft delete). */
    public static function temTurma(Quote $locked): bool
    {
        return $locked->turma()->exists();
    }

    private static function lockLive(int $quoteId): Quote
    {
        $quote = Quote::lockRow($quoteId);

        if ($quote->trashed()) {
            throw ValidationException::withMessages([
                'quote' => __('commercial.quote.archived'),
            ]);
        }

        return $quote;
    }
}
