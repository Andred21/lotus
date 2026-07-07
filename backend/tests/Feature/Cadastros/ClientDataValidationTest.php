<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Data\ClientData;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ClientDataValidationTest extends TestCase
{
    public function test_rut_invalido_e_rejeitado(): void
    {
        $this->expectException(ValidationException::class);

        ClientData::validate([
            'name'       => 'Switch Chile',
            'rut'        => '12.345.678-9', // DV errado
            'email'      => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type'       => 'client',
        ]);
    }

    public function test_payload_valido_passa(): void
    {
        $data = ClientData::validateAndCreate([
            'name'       => 'Switch Chile',
            'rut'        => '12.345.678-5', // DV correto
            'email'      => 'info@switch.cl',
            'legal_name' => 'Switch Chile Ltda',
            'type'       => 'client',
            'addresses'  => [['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]],
            'contacts'   => [['name' => 'Parris Barrios', 'email' => 'p@switch.cl', 'is_primary' => true]],
        ]);

        $this->assertSame('Switch Chile Ltda', $data->legal_name);
        $this->assertCount(1, $data->addresses);
        $this->assertSame('Providencia', $data->addresses[0]->commune);
    }
}
