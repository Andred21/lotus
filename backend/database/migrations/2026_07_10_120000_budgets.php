<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            // Código de rastreio "Scap {id}" (ADR-17). Nullable no schema porque
            // deriva do id (autoincrement); a Action preenche na mesma transação.
            $table->string('code')->nullable()->unique();
            $table->string('payment_terms')->nullable();   // forma de pagamento (texto livre)
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses');
            $table->unsignedSmallInteger('seq_in_budget');       // contador atômico por orçamento (ADR-17)
            $table->unsignedInteger('student_count');            // quantidade de alunos
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->string('purchase_order')->nullable();        // OC do cliente
            $table->decimal('value_uf', 12, 4);                  // valor em UF
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['budget_id', 'seq_in_budget']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('budgets');
    }
};
