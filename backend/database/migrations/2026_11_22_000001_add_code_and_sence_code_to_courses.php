<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bloco 60 (spec §4.1, §4.2): código do curso e código SENCE.
 *
 * `code` ("C-<id>") é derivado do `id` e imutável; nasce nulo na coluna só
 * porque o id não existe antes do insert — a Action o grava na mesma transação.
 * O backfill abaixo não é dado digitado: é a mesma derivação aplicada aos cursos
 * que já existem, arquivados inclusive (o código é do registro).
 *
 * `sence_code` é digitado e o único NÃO inclui `deleted_at`: um curso arquivado
 * continua dono do seu código SENCE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->unique()->after('id');
            $table->string('sence_code', 20)->nullable()->unique()->after('technical_name');
        });

        DB::table('courses')->whereNull('code')->orderBy('id')->each(
            fn (object $course) => DB::table('courses')->where('id', $course->id)->update(['code' => 'C-'.$course->id]),
        );
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropUnique(['sence_code']);
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['code', 'sence_code']);
        });
    }
};
