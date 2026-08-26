<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\ContentClass;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class RedatorCrudTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    public function test_cria_redator_com_documento(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $response = $this->postJson('/api/redatores', [
            'name' => 'Magallanes Acuña',
            'rut' => '20.347.878-K',
            'email' => 'mao@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 400, 'application/pdf')],
        ]);

        $response->assertCreated()->assertJsonPath('name', 'Magallanes Acuña');

        $this->assertDatabaseHas('users', ['email' => 'mao@lotus.cl', 'type' => 'redator']);
        $this->assertDatabaseHas('redatores', ['user_id' => User::where('email', 'mao@lotus.cl')->first()->id]);
        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'type' => 'CV']);
    }

    public function test_conjunto_de_documentos_acima_do_teto_e_recusado_com_422(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        // Este é o único sítio que recebe VÁRIOS arquivos no mesmo corpo. Cada
        // um cabia no teto individual de 10 MB e o conjunto somava 40 contra os
        // 12 MB do `client_max_body_size` — a recusa vinha do nginx em HTML,
        // fora do RFC 7807 (achado Q-3 do review de 2026-08-25).
        $metade = intdiv(ContentClass::TETO_AGREGADO_KB, 2) + 1;

        $response = $this->postJson('/api/redatores', [
            'name' => 'Rosa Quilodrán',
            'rut' => '20.347.878-K',
            'email' => 'rq@lotus.cl',
            'documents' => [
                'CV' => UploadedFile::fake()->create('cv.pdf', $metade, 'application/pdf'),
                'TITULO' => UploadedFile::fake()->create('titulo.pdf', $metade, 'application/pdf'),
            ],
        ]);

        $response->assertStatus(422)->assertJsonPath('status', 422);
        $this->assertArrayHasKey('documents', $response->json('errors'));

        // Recusa que já criou o redator não é recusa.
        $this->assertDatabaseMissing('users', ['email' => 'rq@lotus.cl']);
    }

    public function test_cria_redator_com_curso_sincroniza_habilitacao(): void
    {
        $this->actingAsAdmin();
        $course = $this->makeCourse(['name' => 'Alta Tensão I', 'workload_hours' => 40]);

        $response = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
            'course_ids' => [$course->id],
        ]);

        $id = $response->assertCreated()->json('id');
        $response->assertJsonPath('course_ids', [$course->id]);

        $this->assertDatabaseHas('course_redator', ['course_id' => $course->id, 'redator_id' => $id]);
    }

    public function test_cria_redator_sem_course_ids_nao_habilita_nem_erra(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes',
            'rut' => '12.345.678-5',
            'email' => 'fc@lotus.cl',
        ]);

        $response->assertCreated()->assertJsonPath('course_ids', []);
    }

    public function test_rut_duplicado_rejeitado(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['rut' => '20.347.878-K']);

        $this->postJson('/api/redatores', [
            'name' => 'Outro',
            'rut' => '20.347.878-K',
            'email' => 'outro@lotus.cl',
        ])->assertStatus(422)->assertJsonValidationErrors('rut');
    }

    public function test_lista_mostra_remove(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes', 'rut' => '12.345.678-5', 'email' => 'fc@lotus.cl',
        ])->json('id');

        $this->getJson('/api/redatores')->assertOk()->assertJsonCount(1);
        $this->getJson("/api/redatores/{$id}")->assertOk()->assertJsonPath('id', $id);
        $this->deleteJson("/api/redatores/{$id}")->assertNoContent();
        $this->assertSoftDeleted('redatores', ['id' => $id]);
    }

    public function test_rut_de_redator_soft_deletado_e_rejeitado_ao_recriar(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Fabián Cifuentes', 'rut' => '12.345.678-5', 'email' => 'fc@lotus.cl',
        ])->json('id');

        // destroy cascateia soft-delete até o User; recriar com o mesmo RUT
        // deve dar 422 (checagem withTrashed), não 500 do índice único.
        $this->deleteJson("/api/redatores/{$id}")->assertNoContent();

        $this->postJson('/api/redatores', [
            'name' => 'Outro Redator', 'rut' => '12.345.678-5', 'email' => 'outro@lotus.cl',
        ])->assertStatus(422)->assertJsonValidationErrors('rut');
    }

    public function test_remove_cascateia_para_documentos_e_user(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Magallanes Acuña',
            'rut' => '20.347.878-K',
            'email' => 'mao@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 400, 'application/pdf')],
        ])->json('id');
        $userId = Redator::find($id)->user_id;

        $this->deleteJson("/api/redatores/{$id}")->assertNoContent();

        $this->assertSoftDeleted('files', ['fileable_type' => 'redator', 'fileable_id' => $id]);
        $this->assertSoftDeleted('users', ['id' => $userId]);
    }

    public function test_update_multipart_substitui_documento_do_mesmo_tipo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv1.pdf', 10, 'application/pdf')],
        ])->json('id');

        // multipart com _method=PUT (form-data não suporta PUT nativo)
        $this->post("/api/redatores/{$id}", [
            '_method' => 'PUT',
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv2.pdf', 10, 'application/pdf')],
        ])->assertOk();

        $ativos = File::where('fileable_id', $id)->where('type', 'CV')->get();

        $this->assertCount(1, $ativos, 'O documento do mesmo tipo deve ser substituído, não duplicado.');
        $this->assertSame('cv2.pdf', $ativos->first()->original_name);
    }
}
