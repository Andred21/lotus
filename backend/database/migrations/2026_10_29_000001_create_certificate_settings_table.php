<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Configuración › Certificados (spec D3/D5 do bloco 40): singleton com o nome e
 * o cargo da gerente que assina todo certificado. A assinatura em imagem vive
 * em `files` (polimórfica, `fileable_type = 'certificate_settings'`).
 *
 * A linha única nasce AQUI e não no seeder: o `RolePermissionSeeder` é o único
 * que roda em produção, e sem a linha o `CertificateSettings::atual()` quebra
 * a tela e o certificado. Nome e cargo são os vigentes antes do bloco (estavam
 * fixos no template do PDF).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_settings', function (Blueprint $table) {
            $table->id();
            $table->string('manager_name');
            $table->string('manager_title');
            $table->timestamps();
        });

        DB::table('certificate_settings')->insert([
            'manager_name' => 'Marcia de Batalha',
            'manager_title' => 'Gerente OTEC',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_settings');
    }
};
