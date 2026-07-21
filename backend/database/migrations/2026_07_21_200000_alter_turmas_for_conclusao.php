<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('turmas', function (Blueprint $table) {
            $table->timestamp('concluded_at')->nullable()->after('status');
        });

        // Estreita o enum: 'habilitada' saiu da máquina persistida — é derivada
        // em runtime (spec 6d, D3). MODIFY direto e só no MySQL: no sqlite da
        // suíte o enum nasce TEXT+CHECK e o estreitamento real só existe (e só
        // importa) no engine real — lição #15.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE turmas MODIFY status ENUM('em_andamento','concluida') NOT NULL DEFAULT 'em_andamento'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE turmas MODIFY status ENUM('em_andamento','habilitada','concluida') NOT NULL DEFAULT 'em_andamento'");
        }

        Schema::table('turmas', function (Blueprint $table) {
            $table->dropColumn('concluded_at');
        });
    }
};
