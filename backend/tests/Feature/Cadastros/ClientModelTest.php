<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ClientModelTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_client_navega_user_addresses_contacts(): void
    {
        $client = $this->makeClientWithUser([
            'legal_name' => 'Switch Chile Ltda',
            'type' => 'client',
            'business_activity' => 'Instalaciones Eléctricas',
        ]);

        $client->addresses()->create([
            'commune' => 'Providencia',
            'city' => 'Santiago',
            'region' => 'RM',
            'is_primary' => true,
        ]);

        $client->contacts()->create([
            'name' => 'Parris Barrios',
            'email' => 'info@switch-chile.cl',
            'is_primary' => true,
        ]);

        $client->refresh();

        $this->assertInstanceOf(User::class, $client->user);
        $this->assertCount(1, $client->addresses);
        $this->assertInstanceOf(ClientAddress::class, $client->addresses->first());
        $this->assertTrue($client->addresses->first()->is_primary);
        $this->assertInstanceOf(ClientContact::class, $client->contacts->first());
        $this->assertSame('Parris Barrios', $client->contacts->first()->name);
    }
}
