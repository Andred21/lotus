<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Identidade da cascata de arquivamento (spec D2). SEM índice de propósito: a
 * coluna só é lida dentro de relação já escopada por FK (`$client->contacts()`),
 * e o índice de `client_id` que já existe faz o trabalho.
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
