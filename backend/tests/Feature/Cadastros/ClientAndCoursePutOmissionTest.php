<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ClientAndCoursePutOmissionTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_put_de_cliente_sem_phone_e_sem_business_activity_preserva_os_dois(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'ACME', 'type' => 'client', 'business_activity' => 'Montagem elétrica'],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl', 'phone' => '+56 9 5555 5555'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME Editada',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
        ])->assertOk();

        $client->refresh();
        $this->assertSame('+56 9 5555 5555', $client->user->phone);
        $this->assertSame('Montagem elétrica', $client->business_activity);
    }

    public function test_put_de_cliente_com_null_explicito_apaga_os_dois(): void
    {
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'ACME', 'type' => 'client', 'business_activity' => 'Montagem elétrica'],
            ['rut' => '12.345.678-5', 'email' => 'acme@lotus.cl', 'phone' => '+56 9 5555 5555'],
        );

        $this->putJson("/api/clients/{$client->id}", [
            'name' => 'ACME Editada',
            'rut' => '12.345.678-5',
            'email' => 'acme@lotus.cl',
            'legal_name' => 'ACME S.A.',
            'type' => 'client',
            'phone' => null,
            'business_activity' => null,
        ])->assertOk();

        $client->refresh();
        $this->assertNull($client->user->phone);
        $this->assertNull($client->business_activity);
    }

    public function test_put_de_curso_sem_technical_name_e_description_preserva_os_dois(): void
    {
        $this->actingAsAdmin();

        $course = $this->makeCourse([
            'name' => 'Alta Tensão',
            'technical_name' => 'AT-001',
            'description' => 'Curso regulado',
        ]);

        $this->putJson("/api/courses/{$course->id}", [
            'name' => 'Alta Tensão II',
            'workload_hours' => 12,
        ])->assertOk();

        $course->refresh();
        $this->assertSame('AT-001', $course->technical_name);
        $this->assertSame('Curso regulado', $course->description);
    }

    public function test_put_de_curso_com_null_explicito_apaga_os_dois(): void
    {
        $this->actingAsAdmin();

        $course = $this->makeCourse([
            'name' => 'Alta Tensão',
            'technical_name' => 'AT-001',
            'description' => 'Curso regulado',
        ]);

        $this->putJson("/api/courses/{$course->id}", [
            'name' => 'Alta Tensão II',
            'workload_hours' => 12,
            'technical_name' => null,
            'description' => null,
        ])->assertOk();

        $course->refresh();
        $this->assertNull($course->technical_name);
        $this->assertNull($course->description);
    }
}
