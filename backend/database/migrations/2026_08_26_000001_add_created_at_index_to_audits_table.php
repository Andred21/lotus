<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A `audits` veio do stub do vendor sem uma linha alterada e tem índice em
 * `(auditable_type, auditable_id)` e `(user_id, user_type)` — nenhum em
 * `created_at`. As duas fases da poda recortam por DATA, então sem este índice
 * elas varrem 100% da tabela toda madrugada.
 *
 * Conexão e nome da tabela saem do `config/audit.php`, como na migration
 * original: quem trocar o destino da auditoria não fica com um índice órfão.
 */
return new class extends Migration
{
    public function up(): void
    {
        $connection = config('audit.drivers.database.connection', config('database.default'));
        $table = config('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->table($table, function (Blueprint $table) {
            $table->index('created_at', 'audits_created_at_index');
        });
    }

    public function down(): void
    {
        $connection = config('audit.drivers.database.connection', config('database.default'));
        $table = config('audit.drivers.database.table', 'audits');

        Schema::connection($connection)->table($table, function (Blueprint $table) {
            $table->dropIndex('audits_created_at_index');
        });
    }
};
