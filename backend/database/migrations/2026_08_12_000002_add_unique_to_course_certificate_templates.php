<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `course_certificate_templates` era o ÚNICO par sequência-por-pai do schema
 * sem índice: `(budget_id, seq_in_budget)`, `(turma_id, student_id)`,
 * `(turma_id, redator_id)` e `(course_id, redator_id)` já tinham o seu. Com
 * empate, o resolver escolhia o template pela ordem que o banco devolvesse — e
 * é esse template que decide a vigência e a cidade de emissão do certificado.
 *
 * O índice é CRU, sem `deleted_at` na chave: número de versão não se reaproveita
 * depois de arquivar (mesmo argumento do ADR-17 para `seq_in_budget`). Por isso
 * a derivação do número conta os arquivados (`withTrashed`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_certificate_templates', function (Blueprint $table) {
            $table->unique(['course_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::table('course_certificate_templates', function (Blueprint $table) {
            $table->dropUnique('course_certificate_templates_course_id_version_unique');
        });
    }
};
