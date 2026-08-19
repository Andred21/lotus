<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Segunda leva da coluna de identidade da cascata (spec D8). Mesmas regras da
 * primeira (`2026_08_18_000001`), e pelos mesmos motivos:
 *
 * SEM ÍNDICE — a coluna só é lida dentro de relação já escopada por FK
 * (`$budget->quotes()`, `$turma->enrollments()`, `$x->files()`), e o índice da
 * FK já faz o trabalho.
 *
 * SEM BACKFILL, e é escolha, não esquecimento: casar por `deleted_at` é o que a
 * spec D2 recusou (`timestamp` de precisão 0 não é identidade), e marcar todo
 * filho arquivado ressuscitaria em silêncio o que alguém arquivou de propósito.
 * O buraco alcança só bancos de desenvolvimento já semeados; o gatilho é o
 * primeiro deploy e vive na D-34.
 *
 * `files` é POLIMÓRFICA: uma coluna serve as cascatas de budget, quote, redator
 * e turma de uma vez. Um erro na marca alcança quatro agregados — é o risco
 * declarado na §6 da spec.
 */
return new class extends Migration
{
    private const TABLES = ['quotes', 'files', 'enrollments'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->boolean('archived_with_parent')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('archived_with_parent');
            });
        }
    }
};
