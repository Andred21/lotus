<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Actions\RestoreCourseAction;
use App\Domains\Commercial\Actions\RestoreClientAction;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientContact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O teste que PROVA a spec D2. Sem ele o bloco é indistinguível de
 * "restaura todos os filhos arquivados", que ressuscita em silêncio o filho
 * arquivado de propósito antes do pai.
 */
class RestoreCascadeTest extends TestCase
{
    use CreatesCertificateTemplates;
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_restaurar_cliente_traz_so_os_filhos_da_cascata(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Switch Chile Ltda']);

        $antigo = $client->contacts()->create(['name' => 'Antigo', 'email' => 'a@s.cl', 'is_primary' => false]);
        $vivo = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);
        $endereco = $client->addresses()->create(['commune' => 'Providencia', 'city' => 'Santiago', 'region' => 'RM', 'is_primary' => true]);

        $antigo->delete();
        $client->delete();

        app(RestoreClientAction::class)->execute($client);

        $this->assertNull(Client::withTrashed()->find($client->id)->deleted_at);

        // Voltou: arquivado PELA cascata.
        $this->assertDatabaseHas('client_contacts', ['id' => $vivo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('client_addresses', ['id' => $endereco->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('users', ['id' => $client->user_id, 'deleted_at' => null, 'archived_with_parent' => false]);

        // NÃO voltou: já estava arquivado antes.
        $this->assertNotNull(ClientContact::withTrashed()->find($antigo->id)->deleted_at);
    }

    public function test_restaurar_curso_traz_so_os_filhos_da_cascata(): void
    {
        $course = $this->makeCourse(['name' => 'Alta Tensión']);

        $antigo = $this->makeTemplate($course->id, ['version' => 1]);
        $vivo = $this->makeTemplate($course->id, ['version' => 2]);
        $modulo = $course->modules()->create(['sort_order' => 1, 'name' => 'Módulo 1']);

        $antigo->delete();
        $course->delete();

        app(RestoreCourseAction::class)->execute($course);

        $this->assertDatabaseHas('course_certificate_templates', ['id' => $vivo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertDatabaseHas('course_modules', ['id' => $modulo->id, 'deleted_at' => null, 'archived_with_parent' => false]);
        $this->assertNotNull($antigo->fresh()->deleted_at);
    }

    public function test_restaurar_registro_ativo_e_no_op_e_nao_lanca(): void
    {
        // A rota resolve por `onlyTrashed()`, então o caso normal é 404. Isto
        // cobre a CORRIDA: alguém restaurou entre o binding e o lock. Restore é
        // idempotente por natureza — no-op, não erro, e sem mensagem nova
        // (que abriria a D-07).
        $client = $this->makeClientWithUser();

        app(RestoreClientAction::class)->execute($client);

        $this->assertNull($client->fresh()->deleted_at);
    }

    public function test_restore_e_auditado_no_pai_e_em_cada_filho(): void
    {
        $client = $this->makeClientWithUser();
        $contato = $client->contacts()->create(['name' => 'Vivo', 'email' => 'v@s.cl', 'is_primary' => true]);

        $client->delete();
        app(RestoreClientAction::class)->execute($client);

        $this->assertDatabaseHas('audits', [
            // Morph map (`AppServiceProvider::boot`): a coluna guarda a chave,
            // não o FQCN.
            'auditable_type' => 'client',
            'auditable_id' => $client->id,
            'event' => 'restored',
        ]);
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'client_contact',
            'auditable_id' => $contato->id,
            'event' => 'restored',
        ]);
    }
}
