<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turmas', function (Blueprint $table) {
            $table->id();
            // 1:1 com a cotação. RESTRICT: cotação não some com turma viva.
            $table->foreignId('quote_id')->constrained('quotes')->restrictOnDelete();
            $table->foreignId('course_id')->constrained('courses');   // derivado da quote
            $table->enum('modalidade', ['presencial', 'online']);
            $table->string('local_aplicacao')->nullable();            // exigido só se presencial (validação DTO)
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['em_andamento', 'habilitada', 'concluida'])->default('em_andamento');
            $table->timestamps();
            $table->softDeletes();

            // 1:1 turma VIVA por cotação: carrega quote_id enquanto viva, NULL quando soft-deleted.
            // UNIQUE → banco rejeita 2ª turma viva p/ a mesma cotação, mas turma deletada (NULL) não
            // bloqueia recriar (MySQL trata NULLs como distintos). quote_id é RESTRICT → sem erro 1215
            // da lição #15. Suportado em MySQL 8 e sqlite >= 3.31.
            $table->unsignedBigInteger('active_quote_id')
                ->storedAs('CASE WHEN deleted_at IS NULL THEN quote_id END');
            $table->unique('active_quote_id');

            $table->index('status');
        });

        Schema::create('turma_redator', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turma_id')->constrained('turmas')->cascadeOnDelete();
            // RESTRICT: redator com turma não é apagado (lição #15).
            $table->foreignId('redator_id')->constrained('redatores')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['turma_id', 'redator_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turma_redator');
        Schema::dropIfExists('turmas');
    }
};
