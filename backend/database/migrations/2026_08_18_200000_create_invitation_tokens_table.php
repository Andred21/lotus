<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela própria do convite de primeiro acesso, separada de
 * `password_reset_tokens` de propósito: o TTL é aplicado na validação, pelo
 * broker que valida, e com uma tabela só não há como distinguir um token de
 * 7 dias de um de 60 minutos. Além disso a chave é o e-mail — uma linha por
 * usuário —, então compartilhar a tabela faria um "esqueci minha senha"
 * apagar o convite pendente do mesmo redator.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitation_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitation_tokens');
    }
};
