<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use OwenIt\Auditing\Contracts\Auditable;
use Tests\TestCase;

class RedatorDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_enum_tem_os_quatro_tipos(): void
    {
        $this->assertSame(
            ['CV', 'REUF', 'TITULO', 'POSTGRADO'],
            array_map(fn (RedatorDocumentType $t) => $t->value, RedatorDocumentType::cases()),
        );
    }

    public function test_file_e_auditavel_e_esta_no_morph_map(): void
    {
        $this->assertInstanceOf(Auditable::class, new File);
        $this->assertSame('file', (new File)->getMorphClass());
        $this->assertArrayHasKey('file', Relation::$morphMap);
    }

    public function test_cria_redator_com_documento_tipado_e_expoe_no_dto(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $response = $this->postJson('/api/redatores', [
            'name' => 'Juan Morales',
            'rut' => '13.456.789-9',
            'email' => 'jm@lotus.cl',
            'documents' => [
                'CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('documents.0.type', 'CV')
            ->assertJsonPath('documents.0.original_name', 'cv.pdf');

        $this->assertDatabaseHas('files', ['fileable_type' => 'redator', 'type' => 'CV']);
        $this->assertStringContainsString('http', $response->json('documents.0.download_url'));
    }

    public function test_substitui_documento_do_mesmo_tipo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv1.pdf', 100, 'application/pdf')],
        ])->json('id');

        $this->postJson("/api/redatores/{$id}/documents", [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('cv2.pdf', 100, 'application/pdf'),
            'valid_until' => '2027-01-01',
        ])->assertCreated()->assertJsonPath('original_name', 'cv2.pdf');

        // só 1 CV ativo; o antigo foi soft-deletado
        $this->assertSame(1, File::where('fileable_id', $id)->where('type', 'CV')->count());
        $this->assertSame(1, File::onlyTrashed()->where('fileable_id', $id)->count());
    }

    public function test_remove_documento_faz_soft_delete_sem_apagar_arquivo(): void
    {
        $storage = Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')],
        ])->json('id');
        $file = File::where('fileable_id', $id)->first();

        $this->deleteJson("/api/redatores/{$id}/documents/{$file->id}")->assertNoContent();

        $this->assertSoftDeleted('files', ['id' => $file->id]);
        $storage->assertExists($file->path); // arquivo permanece no bucket
    }

    public function test_remove_documento_de_outro_redator_da_404_e_nao_apaga(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $redatorAId = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv-a.pdf', 100, 'application/pdf')],
        ])->json('id');

        $redatorBId = $this->postJson('/api/redatores', [
            'name' => 'Pedro', 'rut' => '12.345.678-5', 'email' => 'pedro@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv-b.pdf', 100, 'application/pdf')],
        ])->json('id');

        $fileB = File::where('fileable_id', $redatorBId)->first();

        // tenta apagar o documento do redator B usando a URL do redator A
        $this->deleteJson("/api/redatores/{$redatorAId}/documents/{$fileB->id}")->assertNotFound();

        $this->assertDatabaseHas('files', ['id' => $fileB->id, 'deleted_at' => null]);
    }

    public function test_replace_de_documento_registra_auditoria_do_soft_delete(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv1.pdf', 100, 'application/pdf')],
        ])->json('id');

        $antigo = File::where('fileable_id', $id)->where('type', 'CV')->firstOrFail();

        $this->postJson("/api/redatores/{$id}/documents", [
            'type' => 'CV',
            'file' => UploadedFile::fake()->create('cv2.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        // O binário fica no bucket; o rastro do soft-delete vive na auditoria.
        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file',
            'auditable_id' => $antigo->id,
            'event' => 'deleted',
        ]);
    }

    public function test_delete_direto_de_documento_registra_auditoria(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $id = $this->postJson('/api/redatores', [
            'name' => 'Juan', 'rut' => '13.456.789-9', 'email' => 'jm@lotus.cl',
            'documents' => ['CV' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')],
        ])->json('id');
        $file = File::where('fileable_id', $id)->firstOrFail();

        $this->deleteJson("/api/redatores/{$id}/documents/{$file->id}")->assertNoContent();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'file',
            'auditable_id' => $file->id,
            'event' => 'deleted',
        ]);
    }

    public function test_documents_escalar_devolve_422_com_erro_de_campo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->post('/api/redatores', [
            'name' => 'Ana', 'rut' => '12.345.678-5', 'email' => 'ana@lotus.cl',
            'documents' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.documents.0', 'O campo documents deve ser um mapa de tipo => arquivo.');
    }

    public function test_tipo_de_documento_invalido_devolve_422_com_erro_de_campo(): void
    {
        Storage::fake('s3');
        $this->actingAsAdmin();

        $this->post('/api/redatores', [
            'name' => 'Ana', 'rut' => '12.345.678-5', 'email' => 'ana@lotus.cl',
            'documents' => ['DIPLOMA' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')],
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.documents.0', 'Tipo de documento inválido: DIPLOMA');
    }
}
