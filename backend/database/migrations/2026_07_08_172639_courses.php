<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('technical_name')->nullable();   // nome técnico
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('workload_hours');  // carga horária
            $table->timestamps();
            $table->softDeletes();
        });

        // Template de certificado: config versionada (JSON), NÃO anexo em `files`.
        Schema::create('course_certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->json('layout_config');
            $table->unsignedSmallInteger('validity_months')->nullable();   // vigência
            $table->timestamps();
            $table->softDeletes();
        });

        // Habilitação (idoneidade) redator↔curso: N:N. Pivot puro com id próprio
        // + UNIQUE no par (convenção do modelo físico). Sem soft-delete.
        Schema::create('course_redator', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('redator_id')->constrained('redatores')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['course_id', 'redator_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_redator');
        Schema::dropIfExists('course_certificate_templates');
        Schema::dropIfExists('courses');
    }
};
