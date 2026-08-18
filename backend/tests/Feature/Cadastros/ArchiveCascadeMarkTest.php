<?php

namespace Tests\Feature\Cadastros;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A coluna marcadora dá IDENTIDADE à cascata. Sem ela, restaurar o pai não
 * consegue distinguir o filho que a cascata arquivou do filho que já estava
 * arquivado antes — e `deleted_at` é `timestamp` de precisão 0, então empatar
 * por segundo não é identidade (spec D2).
 */
class ArchiveCascadeMarkTest extends TestCase
{
    use CreatesCertificateTemplates;
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_cascata_do_cliente_marca_so_os_filhos_que_ela_arquiva(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Switch Chile Ltda']);

        $antigo = $client->contacts()->create(['name' => 'Antigo', 'email' => 'a@s.cl', 'is_primary' => false]);
        $vivo = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);
        $endereco = $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]);

        // Arquivado ANTES do pai, por vontade própria: a cascata não pode marcá-lo.
        $antigo->delete();

        $client->delete();

        $this->assertDatabaseHas('client_contacts', ['id' => $antigo->id, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('client_contacts', ['id' => $vivo->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('client_addresses', ['id' => $endereco->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('users', ['id' => $client->user_id, 'archived_with_parent' => true]);
    }

    public function test_cascata_do_curso_marca_so_os_filhos_que_ela_arquiva(): void
    {
        $course = $this->makeCourse(['name' => 'Alta Tensión']);

        $antigo = $this->makeTemplate($course->id, ['version' => 1]);
        $vivo = $this->makeTemplate($course->id, ['version' => 2]);
        $modulo = $course->modules()->create(['sort_order' => 1, 'name' => 'Módulo 1']);

        $antigo->delete();

        $course->delete();

        $this->assertDatabaseHas('course_certificate_templates', ['id' => $antigo->id, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('course_certificate_templates', ['id' => $vivo->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('course_modules', ['id' => $modulo->id, 'archived_with_parent' => true]);
    }

    public function test_filho_arquivado_sozinho_nunca_e_marcado(): void
    {
        $client = $this->makeClientWithUser();
        $contato = $client->contacts()->create(['name' => 'Solo', 'email' => 's@s.cl', 'is_primary' => true]);

        $contato->delete();

        $this->assertDatabaseHas('client_contacts', ['id' => $contato->id, 'archived_with_parent' => false]);
    }
}
