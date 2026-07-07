<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->index();
            $table->string('social_reason')->nullable();
            $table->enum('type', ['client', 'provider', 'other'])->default('client');
            $table->string('sector')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('client_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->index();
            $table->string('street')->nullable(); // Direccion
            $table->string('street_complement')->nullable(); // Complemento de la direccion
            $table->string('number')->nullable(); // Numero de la direccion
            $table->string('neighborhood')->nullable(); // Comuna
            $table->string('city')->nullable(); // Ciudad
            $table->string('state')->nullable(); // Region 
            $table->string('zip_code')->nullable();
            $table->boolean('is_primary')->default(false); // Indica si es la direccion principal del cliente
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
        });

        Schema::create('client_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->index();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_primary')->default(false); // Indica si es el contacto principal del cliente
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_primary');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
        Schema::dropIfExists('client_addresses');
        Schema::dropIfExists('client_contacts');
    }
};
