<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('legal_name');                       // razón social
            $table->enum('type', ['client', 'provider', 'other'])->default('client');
            $table->string('business_activity')->nullable();    // giro
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('client_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('line1')->nullable();          // Dirección
            $table->string('line2')->nullable();          // complemento
            $table->string('number')->nullable();         // número
            $table->string('commune')->nullable();        // comuna
            $table->string('city')->nullable();           // ciudad
            $table->string('region')->nullable();         // región
            $table->string('zip_code')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
        });

        Schema::create('client_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_contacts');
        Schema::dropIfExists('client_addresses');
        Schema::dropIfExists('clients');
    }
};
