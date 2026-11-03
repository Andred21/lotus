<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use RuntimeException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * `FileUploader::store` é a única entrada de upload: binário fora da transação,
 * insert dentro, e compensação (`discard`) de TODO binário gravado se a escrita
 * em `files` falhar — inclusive quando o segundo `put` falha com o primeiro já
 * no bucket.
 */
class FileUploaderTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private FilesystemAdapter $disco;

    protected function setUp(): void
    {
        parent::setUp();

        /** @var FilesystemAdapter $disco */
        $disco = Storage::fake(config('filesystems.default'));
        $this->disco = $disco;
    }

    private function budget(): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => '31.222.333-4']);

        return Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
    }

    private function pdf(string $nome = 'a.pdf'): UploadedFile
    {
        return UploadedFile::fake()->create($nome, 10, 'application/pdf');
    }

    public function test_grava_e_registra(): void
    {
        $budget = $this->budget();

        $file = app(FileUploader::class)->store(
            ['file' => $this->pdf()],
            $budget,
            fn (StoredFiles $s) => $s->register($budget, 'file', 'invoice'),
        );

        $this->assertInstanceOf(File::class, $file);
        $this->disco->assertExists($file->path);
        $this->assertStringStartsWith("budget/{$budget->id}/", $file->path);
        $this->assertSame('application/pdf', $file->mime);
        $this->assertSame('invoice', $file->type);
        $this->assertSame('a.pdf', $file->original_name);
    }

    public function test_falha_na_escrita_descarta_e_relanca(): void
    {
        $budget = $this->budget();
        $antes = File::count();

        try {
            app(FileUploader::class)->store(
                ['file' => $this->pdf()],
                $budget,
                function (StoredFiles $s) {
                    throw new RuntimeException('x');
                },
            );
            $this->fail('A exceção da escrita deveria subir.');
        } catch (RuntimeException $e) {
            $this->assertSame('x', $e->getMessage());
        }

        $this->assertSame([], $this->disco->allFiles("budget/{$budget->id}"));
        $this->assertSame($antes, File::count());
    }

    public function test_falha_com_varios_descarta_todos(): void
    {
        $budget = $this->budget();
        $paths = [];

        try {
            app(FileUploader::class)->store(
                ['a' => $this->pdf('a.pdf'), 'b' => $this->pdf('b.pdf')],
                $budget,
                function (StoredFiles $s) use ($budget, &$paths) {
                    $paths = [$s->path('a'), $s->path('b')];
                    $s->register($budget, 'a', 'invoice');

                    throw new RuntimeException('x');
                },
            );
            $this->fail('A exceção da escrita deveria subir.');
        } catch (RuntimeException) {
        }

        $this->assertCount(2, $paths);
        foreach ($paths as $path) {
            $this->disco->assertMissing($path);
        }
        $this->assertSame(0, File::count());
    }

    public function test_falha_no_segundo_put_descarta_o_primeiro(): void
    {
        $budget = $this->budget();
        $real = $this->disco;
        $gravados = [];
        $chamadas = 0;

        $mock = Mockery::mock(FilesystemAdapter::class);
        $mock->shouldReceive('putFile')->andReturnUsing(
            function (...$args) use ($real, &$gravados, &$chamadas) {
                if (++$chamadas === 2) {
                    return false;
                }

                return $gravados[] = $real->putFile(...$args);
            },
        );
        $mock->shouldReceive('delete')->andReturnUsing(fn ($path) => $real->delete($path));
        Storage::shouldReceive('disk')->andReturn($mock);

        try {
            app(FileUploader::class)->store(
                ['a' => $this->pdf('a.pdf'), 'b' => $this->pdf('b.pdf')],
                $budget,
                fn (StoredFiles $s) => $s->register($budget, 'a', 'invoice'),
            );
            $this->fail('A falha do segundo put deveria subir.');
        } catch (RuntimeException) {
        }

        $this->assertCount(1, $gravados);
        $real->assertMissing($gravados[0]);
        $this->assertSame(0, File::count());
    }

    public function test_replace_soft_deleta_o_anterior_do_tipo(): void
    {
        $budget = $this->budget();
        $uploader = app(FileUploader::class);

        foreach (['primeiro.pdf', 'segundo.pdf'] as $nome) {
            $uploader->store(
                ['file' => $this->pdf($nome)],
                $budget,
                fn (StoredFiles $s) => $s->replace($budget, 'file', 'invoice'),
            );
        }

        $this->assertSame(2, File::withTrashed()->count());
        $this->assertSame(1, File::count());
        $this->assertSame('segundo.pdf', File::first()->original_name);
        $this->assertNotNull(File::onlyTrashed()->firstOrFail()->deleted_at);
    }

    public function test_destino_diretorio(): void
    {
        $paths = app(FileUploader::class)->store(
            ['doc' => $this->pdf()],
            'redator',
            fn (StoredFiles $s) => $s->path('doc'),
        );

        $this->assertStringStartsWith('redator/', $paths);
        $this->disco->assertExists($paths);
    }
}
