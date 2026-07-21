<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_client_logs', function (Blueprint $table) {
            $table->id();
            // restrictOnDelete (não cascade): o InnoDB proíbe ON DELETE CASCADE numa FK cuja coluna
            // uma coluna gerada STORED referencia — e open_link_student_id depende de student_id
            // (MySQL erro 1215; sqlite ignora, por isso só a prova contra MySQL pegou). Não muda
            // comportamento: soft-delete de aluno não dispara FK de banco (é o hook deleting que
            // cascateia p/ o user); o histórico é append-only e não deve sumir por hard-delete.
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->date('started_on');
            $table->date('ended_on')->nullable();
            // Vínculo aberto (ended_on IS NULL) carrega o student_id; fechado carrega NULL.
            // UNIQUE → o banco rejeita um 2º vínculo aberto para o mesmo aluno (RN-10, approach B).
            // Suportado em MySQL 8 e sqlite >= 3.31.
            $table->unsignedBigInteger('open_link_student_id')
                ->storedAs('CASE WHEN ended_on IS NULL THEN student_id END');
            $table->timestamps();

            $table->unique('open_link_student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_client_logs');
    }
};
