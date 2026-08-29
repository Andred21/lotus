<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices APROVADOS pelo `EXPLAIN` antes/depois sobre o cenário do
 * `PerformanceScenarioSeeder` (spec D10) — medição em
 * `docs/superpowers/audits/2026-08-28-hardening-performance-e-dados-medicoes.md`.
 * Candidato que o EXPLAIN não usou NÃO está aqui e está lá, como recusado.
 *
 * Um índice por linha, com a consulta que ele serve. Nomes explícitos para o
 * `down()` não depender da convenção.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turmas', function (Blueprint $table) {
            // Painel de emissão: `status = 'concluida' AND end_date >= ? ORDER BY end_date DESC`.
            $table->index(['status', 'end_date'], 'turmas_status_end_date_index');
            // Agenda do Dashboard: `start_date BETWEEN ? AND ?`.
            $table->index('start_date', 'turmas_start_date_index');
        });

        Schema::table('certificates', function (Blueprint $table) {
            // Alertas de vencimento do Dashboard: `status = 'emitido' AND valido_ate <= ?`.
            $table->index(['status', 'valido_ate'], 'certificates_status_valido_ate_index');
            // Historial, ordem default: `ORDER BY created_at DESC LIMIT 25`.
            $table->index('created_at', 'certificates_created_at_index');
        });

        Schema::table('files', function (Blueprint $table) {
            // Documentos de redator vencendo: `valid_until <= ?` (sem `DATE()` — ver IdentityMetricsQuery).
            $table->index('valid_until', 'files_valid_until_index');
        });

        // `users(name)` NÃO entra: recusado pelo EXPLAIN — a lista de alunos
        // começa o join por `students` (5.045 linhas, `ALL` + filesort) e o
        // otimizador não troca a ordem por causa dele. Ver audits.

        Schema::table('login_logs', function (Blueprint $table) {
            // P-66: a poda (`PodarLogins`) recorta `WHERE created_at < ?`; o
            // composto `(user_id, created_at)` não serve consulta sem a coluna líder.
            $table->index('created_at', 'login_logs_created_at_index');
        });

        // `enrollments(student_id)` NÃO entra: `foreignId()->constrained()` já
        // faz o InnoDB criar `enrollments_student_id_foreign`, e o EXPLAIN do
        // sub-select de `withCount('enrollments')` o usa.
    }

    public function down(): void
    {
        Schema::table('turmas', fn (Blueprint $table) => $table->dropIndex('turmas_status_end_date_index'));
        Schema::table('turmas', fn (Blueprint $table) => $table->dropIndex('turmas_start_date_index'));
        Schema::table('certificates', fn (Blueprint $table) => $table->dropIndex('certificates_status_valido_ate_index'));
        Schema::table('certificates', fn (Blueprint $table) => $table->dropIndex('certificates_created_at_index'));
        Schema::table('files', fn (Blueprint $table) => $table->dropIndex('files_valid_until_index'));
        Schema::table('login_logs', fn (Blueprint $table) => $table->dropIndex('login_logs_created_at_index'));
    }
};
