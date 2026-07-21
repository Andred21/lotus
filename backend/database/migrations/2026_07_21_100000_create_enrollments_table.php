<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            // RESTRICT: turma/aluno com matrícula não somem (peso legal, padrão 6a/6b)
            $table->foreignId('turma_id')->constrained('turmas')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->json('grades')->nullable();
            $table->decimal('attendance_pct', 5, 2)->nullable();
            $table->enum('approval_status', ['pendiente', 'aprobado', 'reprobado'])
                ->default('pendiente');
            $table->timestamps();
            $table->softDeletes();
            // fora do constrained() e nomeado — lição 6b: ->unique() encadeado não emite índice
            $table->unique(['turma_id', 'student_id'], 'enrollments_turma_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
