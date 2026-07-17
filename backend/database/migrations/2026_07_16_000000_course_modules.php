<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Quadro de módulos da proposta comercial. Sem coluna de total: horas do
        // módulo e soma do curso são derivadas em runtime (CourseModuleData/CourseData).
        Schema::create('course_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order');       // o "Item" (1..N)
            $table->string('name');
            $table->text('learnings')->nullable();            // Aprendizajes
            $table->text('contents')->nullable();             // Contenidos (texto livre)
            $table->unsignedSmallInteger('theory_hours')->default(0);
            $table->unsignedSmallInteger('practice_hours')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['course_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_modules');
    }
};
