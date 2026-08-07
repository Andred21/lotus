<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('enrollment_id')->constrained()->restrictOnDelete();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->foreignId('redator_id')->constrained('redatores')->restrictOnDelete();
            $table->string('codigo')->unique();
            $table->json('snapshot');
            $table->date('valido_ate')->nullable();
            $table->enum('status', ['emitido', 'revocado'])->default('emitido');
            $table->timestamp('revoked_at')->nullable();
            $table->string('revocation_reason')->nullable();
            $table->timestamps();

            // Um certificado vigente por matrícula. Revogado produz NULL,
            // permitindo reemissão porque valores NULL não colidem no índice.
            $table->unsignedBigInteger('active_enrollment_id')
                ->nullable()
                ->storedAs("case when status = 'emitido' then enrollment_id else null end");
            $table->unique('active_enrollment_id', 'certificates_active_enrollment_unique');
        });

        Schema::create('certificate_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year')->unique();
            $table->unsignedInteger('last_seq');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_sequences');
        Schema::dropIfExists('certificates');
    }
};
