<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            // Cargo/área de atuação do contato. `job_title`, não `role`: `role`
            // já é RBAC (spatie) no resto do projeto.
            $table->string('job_title')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('client_contacts', function (Blueprint $table) {
            $table->dropColumn('job_title');
        });
    }
};
