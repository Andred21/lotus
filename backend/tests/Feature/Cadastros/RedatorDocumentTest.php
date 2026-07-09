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
}
