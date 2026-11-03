<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Guardião das transições da cotação: dono da matriz da spec D2.
 *
 *   aprovar  → recusa aprovada;
 *   recusar  → recusa recusada e recusa cotação com turma (ativa ou concluída;
 *              a arquivada não conta);
 *   arquivar → recusa aprovada;
 *   editar   → aprovada só com `$podeGerirAprovada` (o controller passa
 *              `can('commercial.quote.approve')`; o módulo não lê `auth()`),
 *              e, com turma, só o `value_uf` pode mudar.
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

    /**
     * Editar. Pendente e recusada seguem como sempre (a Action reabre a
     * recusada). Aprovada: sem `$podeGerirAprovada` é 422 em `status`; com
     * turma, o primeiro campo (menos `value_uf`) que chega DIFERENTE do
     * gravado é 422 na chave do próprio campo.
     *
     * Comparação (spec D2): `Optional` = não mudou; `null` sobre valor
     * gravado = mudou; datas por `toDateString()`; `course_id` e
     * `student_count` como `int`. O front manda o formulário inteiro, então
     * campo igual ao gravado não recusa.
     */
    public static function lockToEdit(int $quoteId, QuoteData $data, bool $podeGerirAprovada): Quote
    {
        $quote = self::lockLive($quoteId);

        if ($quote->status !== QuoteStatus::Approved) {
            return $quote;
        }

        if (! $podeGerirAprovada) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.approved_cannot_edit'),
            ]);
        }

        if (self::temTurma($quote)) {
            $gravado = [
                'course_id' => (int) $quote->course_id,
                'student_count' => (int) $quote->student_count,
                'purchase_order' => $quote->purchase_order,
                'planned_start_date' => $quote->planned_start_date?->toDateString(),
                'planned_end_date' => $quote->planned_end_date?->toDateString(),
            ];
            $recebido = [
                'course_id' => $data->course_id,
                'student_count' => $data->student_count,
                'purchase_order' => $data->purchase_order,
                'planned_start_date' => $data->planned_start_date,
                'planned_end_date' => $data->planned_end_date,
            ];

            foreach ($gravado as $campo => $valorGravado) {
                $valor = $recebido[$campo];

                if ($valor instanceof Optional) {
                    continue;
                }

                $valor = match ($campo) {
                    'course_id', 'student_count' => (int) $valor,
                    'planned_start_date', 'planned_end_date' => $valor === null ? null : Carbon::parse($valor)->toDateString(),
                    default => $valor,
                };

                if ($valor !== $valorGravado) {
                    throw ValidationException::withMessages([
                        $campo => __('commercial.quote.turma_locks_field'),
                    ]);
                }
            }
        }

        return $quote;
    }

    /**
     * Turma ativa ou concluída da cotação (a arquivada fica fora: `exists()`
     * respeita o soft delete). Exige transação aberta e a cotação travada.
     */
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
