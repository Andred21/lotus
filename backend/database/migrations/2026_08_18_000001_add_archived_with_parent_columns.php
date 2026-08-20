<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Identidade da cascata de arquivamento (spec D2). SEM índice de propósito: a
 * coluna só é lida dentro de relação já escopada por FK (`$client->contacts()`),
 * e o índice de `client_id` que já existe faz o trabalho.
 *
 * SEM BACKFILL, e isto é uma escolha, não um esquecimento (Q-7 do review de
 * 2026-08-18): registro arquivado ANTES desta migration nasce com `false` em
 * todos os filhos, então restaurá-lo devolve o pai sem eles. Não há como
 * recuperar a informação perdida — casar por `deleted_at` é precisamente o que a
 * spec D2 recusou (`timestamp` de precisão 0: segundo inteiro não é
 * identidade), e marcar todo filho arquivado ressuscitaria em silêncio o que
 * alguém arquivou de propósito. Um backfill adivinhado seria pior que o buraco.
 *
 * O buraco é finito: sem produção, ele alcança só bancos de desenvolvimento
 * já semeados. O gatilho ficou registrado no `backlog.md` — antes do primeiro
 * deploy, conferir se sobrou algum agregado arquivado de antes desta data.
 */
return new class extends Migration
{
    private const TABLES = [
        'client_addresses',
        'client_contacts',
        'users',
        'course_modules',
        'course_certificate_templates',
    ];

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
