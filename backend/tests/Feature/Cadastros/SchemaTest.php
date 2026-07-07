<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_tabelas_de_cadastro_existem_com_colunas(): void
    {
        $this->assertTrue(Schema::hasTable('clients'));
        $this->assertTrue(Schema::hasColumns('clients', [
            'user_id', 'legal_name', 'type', 'business_activity', 'deleted_at',
        ]));

        $this->assertTrue(Schema::hasColumns('client_addresses', [
            'client_id', 'line1', 'line2', 'number', 'commune', 'city', 'region', 'zip_code', 'is_primary',
        ]));

        $this->assertTrue(Schema::hasColumns('client_contacts', [
            'client_id', 'name', 'email', 'phone', 'is_primary',
        ]));

        $this->assertTrue(Schema::hasTable('redatores'));
        $this->assertTrue(Schema::hasColumns('redatores', ['user_id', 'deleted_at']));

        $this->assertTrue(Schema::hasColumns('files', [
            'fileable_type', 'fileable_id', 'type', 'path', 'original_name', 'mime', 'size', 'valid_until',
        ]));
    }
}
